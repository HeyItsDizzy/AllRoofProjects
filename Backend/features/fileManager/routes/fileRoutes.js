const express = require("express");
const path = require("path");
const fs = require("fs");
const { ObjectId } = require("mongodb");

const { projectsCollection } = require("../../../db");
const { upload } = require("../../../middleware/upload");
const { uploadsRoot: root, getProjectDiskPath } = require("../services/pathUtils");
const { buildFolderTreeFromDisk, syncFromDisk } = require("../services/syncService");
const { startWatcher, stopWatchingProject, isWatching, onDiskChange } = require("../services/diskWatcher");




const Folder = require("../models/Folder");

const {
  createFolder,
  deleteFolder,
  renameFolder,
  getFolders,
  getFolderTree,
} = require("../controllers/folderController");

const { downloadFile } = require("../controllers/fileController"); // ✅ NEW

const router = express.Router();
const folderUpdateFlags = {}; // projectId: timestamp


router.use("/uploads", express.static(root));


// Route to handle file uploads and associate them with a project
// Accept a folderPath from the frontend
router.post("/:projectId/upload", upload.array("files"), async (req, res) => {
  try {
    const { projectId } = req.params;
    const folderPath = req.body.folderPath || ""; // "Estimator/Unit 1"
    const role = req.body.role || "all";
    const region = req.body.region || "AU";

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const fullPath = getProjectDiskPath(project, folderPath, region);
    fs.mkdirSync(fullPath, { recursive: true });

// Only write meta if we're uploading to the root
if (folderPath === "" || fullPath === getProjectDiskPath(project, "", region)) {
  const metaPath = path.join(fullPath, ".meta.json");
  fs.writeFileSync(metaPath, JSON.stringify({ projectId: project._id }, null, 2));
}



    const fileDataArray = [];
    for (const file of req.files) {
      const targetPath = path.join(fullPath, file.originalname);
      fs.renameSync(file.path, targetPath);
      fileDataArray.push({
        fileName: file.originalname,
        relativePath: path.relative(root, targetPath),
      });
    }

    const existing = await Folder.findOne({ projectId, name: folderPath });
    if (!existing) {
      const label = folderPath.split("/").pop();
      await Folder.create({ projectId, name: folderPath, label, role });
    }

    const updatedTree = buildFolderTreeFromDisk(projectId);

    res.json({
      success: true,
      message: "Files uploaded and metadata updated",
      files: fileDataArray,
      updatedTree,
    });
  } catch (err) {
    console.error("🔥 Upload error:", err);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

// Route to watch disk changes and trigger sync
router.get('/:projectId/watch-disk', (req, res) => {
  const { projectId } = req.params;

  req.setTimeout(60000); // Keep connection open for 1 min
  let responded = false;

  // Optional timeout fallback
  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      const now = new Date();  const timestamp = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
      console.log(timestamp," -⏳ No change (timeout):", projectId);
      res.status(204).end(); // No change
    }
  }, 5000); // Return before client times out

  // Start watching for disk changes
  onDiskChange(projectId, () => {
    if (!responded) {
      responded = true;
      clearTimeout(timeout);
      res.status(200).json({ changed: true });
    }
  });
});


// Route to watch folder tree and trigger disk sync + watcher start
router.get("/:projectId/watch-folder-tree", async (req, res) => {
  const { projectId } = req.params;

  try {
    if (!isWatching(projectId)) {
      const now = new Date().toTimeString().split(" ")[0];
      console.log(`🔁 ${now} - [${projectId}] Not watching yet, syncing & starting watcher...`);


      await syncFromDisk(projectId);

      const collection = await projectsCollection();
      const project = await collection.findOne({ _id: new ObjectId(projectId) });
      if (!project) return res.status(404).json({ error: "Project not found" });

      const fullDiskPath = getProjectDiskPath(project, "", "AU");
      startWatcher(projectId, fullDiskPath);
    }

    const folderTree = await buildFolderTreeFromDisk(projectId);
    res.status(200).json(folderTree);
  } catch (err) {
    console.error(`🔥 [${projectId}] Failed to watch folder tree:`, err);
    res.status(500).json({ error: "Failed to load and watch folder tree" });
  }
});

// ✅ Fallback route to get folder tree using existing controller
// Must come AFTER the watcher-based route to avoid being matched first
router.get("/:projectId/folder-tree", getFolderTree);


router.post("/:projectId/notify-folder-update", (req, res) => {
  const { projectId } = req.params;

  // Simple mechanism: store a flag in memory (or timestamp)
  folderUpdateFlags[projectId] = Date.now(); // mark as "just updated"
  res.json({ message: "Folder update flagged" });
});



router.post("/:projectId/unwatch", (req, res) => {
  const { projectId } = req.params;
console.log("Unwatching project:", projectId);
  try {
    stopWatchingProject(projectId);
    res.status(200).send("Stopped watching.");
  } catch (err) {
    console.error("🔥 Failed to stop watcher:", err);
    res.status(500).json({ error: "Failed to stop watcher" });
  }
});

// Route to create a folder
router.post("/:projectId/folders", createFolder);

// Route to delete a folder
router.delete("/:projectId/folders/:folderId", deleteFolder);

// Route to Rename a folder
router.put("/:projectId/folders/:folderId", renameFolder);

// Route to get all folders for a project
router.get("/:projectId/folders", getFolders);


// Route to download a file associated with a project
router.get("/download-file/:uniqueFileName", downloadFile);


module.exports = router;
