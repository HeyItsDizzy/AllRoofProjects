//folderController.js
const fs = require("fs");
const path = require("path");
const { ObjectId } = require("mongodb");
const { projectsCollection } = require("../../../db");
const { buildFolderTreeFromDisk } = require("../services/syncService");
const { getProjectDiskPath, getProjectUploadPath, uploadsRoot: root } = require("../services/pathUtils");
const { createInitialProjectFolders } = require("../services/folderScaffolder");
const Folder = require("../models/Folder");


function normalizePathFromDisk(p) {
  return p
    .replace(/\\/g, "/")
    .replace(/\/?children\/?/g, "/")
    .replace(/\/?hasMeta\/?/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\/{2,}/g, "/");
}


const createFolder = async (req, res) => {
  try {
    console.log("📥 Incoming folder creation request");

    const { projectId } = req.params;
    const { path: name, role = "all", region = "AU" } = req.body;


    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      console.log("❌ Project not found:", projectId);
      return res.status(404).json({ error: "Project not found" });
    }

    console.log("📦 Matched Project:", project.projectNumber, "-", project.name);

    const [yearShort, monthSeq] = project.projectNumber.split("-");
    const fullYear = `20${yearShort}`;
    const monthNum = parseInt(monthSeq.slice(0, 2), 10);

    // Localized month name
    const locales = {
      AU: "en-AU",
      US: "en-US",
      NO: "nb-NO",
    };
    const locale = locales[region] || "en";
    const monthName = new Date(2000, monthNum - 1).toLocaleString(locale, { month: "short" });
    const monthFolder = `${monthNum.toString().padStart(2, "0")}. ${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}`;


    const fullPath = getProjectDiskPath(project, name, region);
    
    

    console.log("📁 Final disk path:", fullPath);

    fs.mkdirSync(fullPath, { recursive: true });
    console.log("✅ Folder created on disk");
      if (!name) {
        console.warn("❌ No folder name/path provided");
        return res.status(400).json({ error: "Missing folder path" });
      }
      

      if (!name.includes("/")) {
        const metaPath = path.join(fullPath, ".meta.json");
        fs.writeFileSync(metaPath, JSON.stringify({ projectId: project._id }, null, 2));
        console.log("📝 .meta.json written:", metaPath);
      }
    

    const label = name.split("/").pop();
    const existing = await Folder.findOne({ projectId, name });

    if (!existing) {
      const folder = await Folder.create({ projectId, name, label, role });
      return res.status(200).json({ message: "Folder created", folder });
    }

    return res.status(200).json({ message: "Folder already exists" });
  } catch (err) {
    console.error("🔥 Error in createFolder:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

const deleteFolder = async (req, res) => {
    try {
      console.log("📥 Incoming folder delete request");
  
      const { projectId, folderId } = req.params;
  
      // Find the folder to be deleted from the DB
      const folder = await Folder.findOne({ _id: folderId, projectId });
  
      if (!folder) {
        return res.status(404).json({ error: "Folder not found" });
      }
  
      const folderPath = path.join(
        root,
        projectId,
        folder.name
      );
      
  
      // Delete folder from disk
      fs.rmdirSync(folderPath, { recursive: true });
      console.log(`✅ Folder deleted from disk: ${folderPath}`);
  
      // Delete from MongoDB
      await Folder.deleteOne({ _id: folderId });
      console.log(`✅ Folder deleted from database`);
  
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

    const folder = await Folder.findOne({ _id: folderId, projectId });
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }

    const oldFolderPath = path.join(root, projectId, folder.name);
    const newFolderPath = path.join(root, projectId, newName);
    

    console.log("🔄 Attempting rename:");
    console.log("   FROM:", oldFolderPath);
    console.log("   TO  :", newFolderPath);

    // ❌ Check if source folder actually exists
    if (!fs.existsSync(oldFolderPath)) {
      console.warn("❌ Source folder does not exist:", oldFolderPath);
      return res.status(200).json({
        warning: "Source folder was not found on disk. Possibly already moved or renamed.",
        folder,
      });
    }

    // ❌ Avoid renaming to same path
    if (oldFolderPath === newFolderPath) {
      return res.status(200).json({ message: "No changes made" });
    }

    // ❌ Destination already exists
    if (fs.existsSync(newFolderPath)) {
      return res.status(400).json({ error: "Target folder already exists" });
    }

    // ✅ Ensure destination parent exists
    fs.mkdirSync(path.dirname(newFolderPath), { recursive: true });

    // ✅ Try native rename
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
        return res.status(500).json({
          error: "Rename failed (fallback also failed)",
          details: deepErr.message,
        });
      }
    }

    // ✅ Update in DB
    folder.name = newName;
    folder.label = newName.split("/").pop();
    await folder.save();

    return res.status(200).json({ message: "Folder renamed successfully", folder });

  } catch (err) {
    console.error("🔥 Critical Error in renameFolder:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};
 
const getFolders = async (req, res) => {
  try {
    const { projectId } = req.params;

    const rawFolders = await Folder.find({ projectId });

    const folders = rawFolders.map(folder => ({
      ...folder.toObject(),
      name: normalizePathFromDisk(folder.name),
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
  getFolders,
  getFolderTree,
};

