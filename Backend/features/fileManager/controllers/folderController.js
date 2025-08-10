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
    const { projectId, path: rawPath } = req.params;
    // 2) Decode "%2F" back into "/" for nested paths
    const folderId = decodeURIComponent(rawPath);

    // 3) Prevent removing any of your protected root folders
    if (RootFolders.includes(folderId)) {
      return res.status(403).json({ error: "Cannot delete root folders." });
    }

    // 4) Fetch the project to compute its upload path
    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // 5) Build the absolute folder path and delete it
    const basePath = await getProjectUploadPath(project);
    const folderPath = path.join(basePath, folderId);
    fs.rmdirSync(folderPath, { recursive: true });
    console.log(`✅ Folder deleted from disk: ${folderPath}`);

    // 6) Success response
    return res.status(200).json({ message: "Folder deleted successfully" });
  } catch (err) {
    console.error("🔥 Error in deleteFolder:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
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
