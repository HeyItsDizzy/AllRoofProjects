//folderController.js
const fs = require("fs");
const path = require("path");
const { ObjectId } = require("mongodb");
const { projectsCollection } = require("../../../db");
const { getProjectUploadPath } = require("../services/pathUtils");
const { buildFolderTreeFromDisk } = require("../services/syncService");


const { createInitialProjectFolders, FOLDER_ACCESS_RULES } = require("../services/folderScaffolder");

//const { initMeta } = require("../services/metaUtils");

// 🔒 Use rules from folderScaffolder
const RootFolders = Object.keys(FOLDER_ACCESS_RULES);

const createFolder = async (req, res) => {
  try {
    console.log("📥 Incoming folder create request");

    const { projectId } = req.params;
    const { path: relativePath } = req.body;

    if (!relativePath || typeof relativePath !== "string") {
      return res.status(400).json({ error: "Missing or invalid folder path" });
    }

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const basePath = await getProjectUploadPath(project);
    const newFolderPath = path.join(basePath, relativePath);

    if (fs.existsSync(newFolderPath)) {
      return res.status(400).json({ error: "Folder already exists" });
    }

    fs.mkdirSync(newFolderPath, { recursive: true });
    console.log(`📁 Folder created: ${newFolderPath}`);

    return res.status(200).json({
  message: "Folder created successfully",
  fullPath: relativePath, // <-- relative to project root, e.g., "Admin/New Folder"
});

  } catch (err) {
    console.error("🔥 Error in createFolder:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};


const deleteFolder = async (req, res) => {
  try {
    console.log("📥 Incoming folder delete request");

    // 1) Pull in the wildcard path (captures nested folders)
    const { projectId } = req.params;
    const rawPath = req.params[0]; // Wildcard path from /:projectId/folders/*
    
    console.log("🗑️ [DELETE] Raw request parameters:");
    console.log("  - Project ID:", projectId);
    console.log("  - Raw path parameter:", rawPath);
    console.log("  - Full params object:", req.params);
    
    // Validate path parameter exists
    if (!rawPath) {
      console.error("❌ [DELETE] No folder path provided in request");
      return res.status(400).json({ 
        error: "Missing folder path",
        details: "No folder path was provided in the request URL",
        receivedParams: req.params
      });
    }
    
    // 2) Decode "%2F" back into "/" for nested paths
    const folderId = decodeURIComponent(rawPath);

    console.log("🗑️ [DELETE] Processing folder deletion:");
    console.log("  - Decoded folder path:", folderId);

    // 3) Prevent removing any of your protected root folders
    if (RootFolders.includes(folderId)) {
      console.warn("⚠️ [DELETE] Attempted to delete protected root folder:", folderId);
      return res.status(403).json({ 
        error: "Cannot delete protected root folder",
        details: `The folder '${folderId}' is a protected root folder and cannot be deleted`,
        folderPath: folderId
      });
    }

    // 4) Fetch the project to compute its upload path
    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      console.error("❌ [DELETE] Project not found:", projectId);
      return res.status(404).json({ 
        error: "Project not found",
        details: `No project found with ID: ${projectId}`,
        projectId: projectId
      });
    }

    // 5) Build the absolute folder path and validate it exists
    const basePath = await getProjectUploadPath(project);
    const folderPath = path.join(basePath, folderId);
    
    console.log("🗑️ [DELETE] Computed paths:");
    console.log("  - Base project path:", basePath);
    console.log("  - Full folder path:", folderPath);
    
    // Check if folder exists before attempting to delete
    if (!fs.existsSync(folderPath)) {
      console.error("❌ [DELETE] Folder not found on disk:", folderPath);
      return res.status(404).json({ 
        error: "Folder not found",
        details: `The folder does not exist at the expected path: ${folderPath}`,
        requestedPath: folderId,
        fullDiskPath: folderPath,
        projectBasePath: basePath
      });
    }
    
    // Check if it's actually a directory (not a file)
    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) {
      console.error("❌ [DELETE] Path exists but is not a directory:", folderPath);
      return res.status(400).json({ 
        error: "Path is not a folder",
        details: `The path '${folderPath}' exists but is not a directory`,
        requestedPath: folderId,
        fullDiskPath: folderPath
      });
    }
    
    // Attempt to delete the folder
    try {
      fs.rmSync(folderPath, { recursive: true, force: true });
      console.log(`✅ [DELETE] Folder successfully deleted: ${folderPath}`);
    } catch (deleteErr) {
      console.error("❌ [DELETE] Failed to delete folder:", deleteErr);
      return res.status(500).json({ 
        error: "Failed to delete folder",
        details: `Could not delete folder: ${deleteErr.message}`,
        requestedPath: folderId,
        fullDiskPath: folderPath,
        deleteError: deleteErr.code || deleteErr.message
      });
    }

    // 6) Success response
    return res.status(200).json({ 
      message: "Folder deleted successfully",
      deletedPath: folderId,
      fullDiskPath: folderPath
    });
  } catch (err) {
    console.error("🔥 [DELETE] Critical error in deleteFolder:", err);
    console.error("🔥 [DELETE] Error stack:", err.stack);
    
    // Determine error type for better user feedback
    let errorType = "Unknown error";
    let statusCode = 500;
    
    if (err.code === 'ENOENT') {
      errorType = "Path not found";
      statusCode = 404;
    } else if (err.code === 'EACCES' || err.code === 'EPERM') {
      errorType = "Permission denied";
      statusCode = 403;
    } else if (err.code === 'EBUSY' || err.code === 'ENOTEMPTY') {
      errorType = "Folder in use or not empty";
      statusCode = 409;
    } else if (err.name === 'CastError' || err.message.includes('ObjectId')) {
      errorType = "Invalid project ID";
      statusCode = 400;
    }
    
    return res.status(statusCode).json({ 
      error: errorType,
      details: err.message,
      errorCode: err.code,
      requestedProject: req.params.projectId,
      requestedPath: req.params[0],
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};


const renameFolder = async (req, res) => {
  try {
    console.log("📥 Incoming folder rename request");

    const { projectId, folderId } = req.params;
    const { newName } = req.body;

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) return res.status(404).json({ error: "Project not found" });

    const basePath = await getProjectUploadPath(project);
    const oldFolderPath = path.join(basePath, folderId);
    const parentDir = path.dirname(oldFolderPath);
    const newFolderPath = path.join(parentDir, newName);

    console.log("🔄 Attempting rename:");
    console.log("   FROM:", oldFolderPath);
    console.log("   TO  :", newFolderPath);

    if (!fs.existsSync(oldFolderPath)) {
      console.warn("❌ Source folder does not exist:", oldFolderPath);
      return res.status(200).json({ warning: "Source folder was not found on disk. Possibly already moved or renamed." });
    }

    if (fs.existsSync(newFolderPath)) {
      return res.status(400).json({ error: "Target folder already exists" });
    }

    fs.mkdirSync(path.dirname(newFolderPath), { recursive: true });

    try {
      fs.renameSync(oldFolderPath, newFolderPath);
      console.log("✅ renameSync succeeded");
    } catch (err) {
      console.warn("⚠️ renameSync failed:", err.message);
      console.log("👉 Trying fallback: copy + delete");

      try {
        fs.cpSync(oldFolderPath, newFolderPath, { recursive: true });
        fs.rmSync(oldFolderPath, { recursive: true });
        console.log("✅ Fallback copy+delete succeeded");
      } catch (deepErr) {
        console.error("🔥 Copy/delete fallback failed:", deepErr);
        return res.status(500).json({ error: "Rename failed (fallback also failed)", details: deepErr.message });
      }
    }

    return res.status(200).json({ message: "Folder renamed successfully" });
  } catch (err) {
    console.error("🔥 Critical Error in renameFolder:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

const getFolders = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Assuming folders are stored on disk and need to be read from there
    const projectPath = path.join(root, projectId);
    const folders = fs.readdirSync(projectPath).map(folderName => ({
      name: normalizePathFromDisk(folderName),
    }));

    return res.status(200).json({ folders });
  } catch (err) {
    console.error("🔥 Error fetching folders:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

const getFolderTree = async (req, res) => {
  const { projectId } = req.params;

  try {
    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Get full expected path
    const rootPath = await getProjectUploadPath(project);

    // ✅ SAFEGUARD: Auto-create root and protected folders if missing
    if (!fs.existsSync(rootPath)) {
      console.warn("⚠️ Project root folder missing — auto-creating:", rootPath);
      await createInitialProjectFolders(project);
    }

    // Build and return the tree
    const folderTree = await buildFolderTreeFromDisk(projectId);
    return res.status(200).json(folderTree);
  } catch (err) {
    console.error("🔥 Error building folder tree:", err);
    return res.status(500).json({ error: "Failed to build folder tree", details: err.message });
  }
};

module.exports = {
  createFolder,
  deleteFolder,
  renameFolder,
  createInitialProjectFolders,
  getFolders,
  getFolderTree,
};
