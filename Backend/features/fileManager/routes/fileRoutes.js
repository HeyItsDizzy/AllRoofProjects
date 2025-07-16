const express = require("express");
const path = require("path");
const fs = require("fs");
const { ObjectId } = require("mongodb");
const archiver = require("archiver");
const mime = require("mime"); // if not already included
const { projectsCollection } = require("../../../db");
const { upload } = require("../../../middleware/upload");
const { uploadsRoot: root, getProjectDiskPath, getProjectUploadPath } = require("../services/pathUtils");
const { buildFolderTreeFromDisk, syncFromDisk } = require("../services/syncService");
const { startWatcher, stopWatchingProject, isWatching, onDiskChange } = require("../services/diskWatcher");
const {
  createFolder,
  deleteFolder,
  renameFolder,
  getFolders,
  getFolderTree,
} = require("../controllers/folderController");
const {
  uploadFiles,
  deleteFile,
  renameFile,
} = require("../controllers/fileController");
const { allowedExtensions } = require("../../../middleware/extensionLoader");

const router = express.Router();
const folderUpdateFlags = {};



const ENABLE_WATCHERS = String(process.env.ENABLE_WATCHERS).toLowerCase() !== "false";


const longpollmax = 1; // (minutes) Max time to watch Project
const longpollint = 5; // (seconds) Intervals to restart long polling

router.use("/uploads", express.static(root));

// NEW: Return meta.json for a project
router.get("/:projectId/meta", async (req, res) => {
  try {
    const { projectId } = req.params;

    // ✅ Lookup full project
    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // ✅ Now get full path using full document
    const projectPath = await getProjectUploadPath(project);
    const metaPath = path.join(projectPath, ".meta.json");

    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: ".meta.json not found" });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    return res.status(200).json(meta);

  } catch (err) {
    console.error("🔥 Error loading meta.json:", err);
    return res.status(500).json({ error: "Failed to load meta", details: err.message });
  }
});


/*router.post("/:projectId/upload", upload.array("files"), async (req, res) => {
  try {
    const { projectId } = req.params;
    const folderPath = req.body.folderPath || "";
    const region = req.body.region || "AU";

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const fullPath = folderPath === "."
      ? getProjectDiskPath(project, "", region)
      : getProjectDiskPath(project, folderPath, region);

    fs.mkdirSync(fullPath, { recursive: true });

    // Create .meta.json if needed
    if (folderPath === "" || folderPath === "." || fullPath === getProjectDiskPath(project, "", region)) {
      const metaPath = path.join(fullPath, ".meta.json");
      fs.writeFileSync(metaPath, JSON.stringify({ projectId: project._id }, null, 2));
    }

    const EXTENSIONS = allowedExtensions();
    const fileDataArray = [];

for (const file of req.files) {
  const { fromBuffer } = require("file-type");


  const detected = await fromBuffer(file.buffer || Buffer.alloc(0));


  if (!detected) {
    return res.status(400).json({
      error: `❌ Unable to determine MIME type for: ${file.originalname}`,
    });
  }

const mimeExt = `.${detected.ext}`;
const originalExt = path.extname(file.originalname).toLowerCase();

const mimeAllowed =
  EXTENSIONS.includes(mimeExt) ||
  (EXTENSIONS.includes(originalExt) && EXTENSIONS.includes(mimeExt));

if (!mimeAllowed) {
  return res.status(400).json({
    error: `❌ File type not allowed or mismatched: ${originalExt} ≠ ${mimeExt}`,
  });
}


  const savePath = path.join(fullPath, file.originalname);
  fs.writeFileSync(savePath, file.buffer);
  fileDataArray.push({
    fileName: file.originalname,
    relativePath: path.relative(root, savePath),
  });
}



    const updatedTree = buildFolderTreeFromDisk(projectId);
    res.json({
      success: true,
      message: "Files uploaded and validated",
      files: fileDataArray,
      updatedTree,
    });
  } catch (err) {
    console.error("🔥 Upload failed:", err);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});*/


router.get('/:projectId/watch-disk', (req, res) => {
  const { projectId } = req.params;

  req.setTimeout(longpollmax * 60000);
  let responded = false;

  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      const now = new Date();
      const timestamp = now.toTimeString().split(' ')[0];
      console.log(timestamp, " -⏳ No change (timeout):", projectId);
      res.status(204).end();
    }
  }, longpollint * 1000);

if (!ENABLE_WATCHERS) {
  console.log(`🔕 Skipping disk poll for project ${projectId} (watchers disabled)`);
  res.status(204).end();
  return;
}

onDiskChange(projectId, () => {
  if (!responded) {
    responded = true;
    clearTimeout(timeout);
    res.status(200).json({ changed: true });
  }
});

});

router.get("/:projectId/watch-folder-tree", async (req, res) => { 
  const { projectId } = req.params;

  try {
    if (ENABLE_WATCHERS && !isWatching(projectId)) {
      const now = new Date().toTimeString().split(" ")[0];
      console.log(`🔁 ${now} - [${projectId}] Not watching yet, syncing & starting watcher...`);

      await syncFromDisk(projectId);

      const collection = await projectsCollection();
      const project = await collection.findOne({ _id: new ObjectId(projectId) });
      if (!project) return res.status(404).json({ error: "Project not found" });

      const fullDiskPath = getProjectDiskPath(project, "", "AU");
      startWatcher(projectId, fullDiskPath);
    } else if (!ENABLE_WATCHERS) {
      console.log(`🔕 Watcher start skipped for ${projectId} (watchers disabled)`);
    }

    const folderTree = await buildFolderTreeFromDisk(projectId);
    res.status(200).json(folderTree);
  } catch (err) {
    console.error(`🔥 [${projectId}] Failed to watch folder tree:`, err);
    res.status(500).json({ error: "Failed to load and watch folder tree" });
  }
});


router.post("/:projectId/notify-folder-update", (req, res) => {
  const { projectId } = req.params;
  folderUpdateFlags[projectId] = Date.now();
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


router.post("/:projectId/folders", createFolder);
router.delete("/:projectId/folders/:folderId", deleteFolder);
router.put("/:projectId/folders/:folderId", renameFolder);
router.get("/:projectId/folders", getFolders);
router.get("/:projectId/folder-tree", getFolderTree);
router.post("/:projectId/upload", uploadFiles);
router.delete("/:projectId/files/:filePath", deleteFile);
router.put("/:projectId/files/:filePath", renameFile);


router.post("/:projectId/download-zip", async (req, res) => {
  const { projectId } = req.params;
  const { folderPath } = req.body;
  const region = req.body.region || "AU";

  try {
    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) return res.status(404).json({ error: "Project not found" });

    const fullPath = folderPath === "." || !folderPath
      ? getProjectDiskPath(project, "", region)
      : getProjectDiskPath(project, folderPath, region);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "Folder not found on disk." });
    }

    // Setup ZIP
    const archive = archiver("zip", { zlib: { level: 9 } });
    res.setHeader("Content-Type", "application/zip");
    const safeName = (folderPath || "ProjectRoot").replace(/[^a-zA-Z0-9-_]/g, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.zip"`);


    archive.pipe(res);

    archive.directory(fullPath, path.basename(fullPath)); // includes folder in zip
    archive.finalize();

    archive.on("error", err => {
      console.error("🔥 ZIP error:", err);
      res.status(500).end("Failed to create ZIP");
    });

  } catch (err) {
    console.error("🔥 ZIP download failed:", err);
    res.status(500).json({ error: "ZIP download failed", details: err.message });
  }
});

router.get("/:projectId/download/*/:fileName", async (req, res) => {
  const { projectId, fileName } = req.params;
  const region = req.query.region || "AU";

  // 🧠 Wildcard folder path captured as req.params[0]
  const encodedFolderPath = req.params[0] || ""; // may be empty string
  const folderPath = decodeURIComponent(encodedFolderPath || ".");

  try {
    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) return res.status(404).json({ error: "Project not found" });

    const fullPath = getProjectDiskPath(project, folderPath, region);
    const filePath = path.join(fullPath, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const mimeType = mime.getType(filePath) || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error("❌ File download error:", err);
    res.status(500).json({ error: "Failed to download file", details: err.message });
  }
});



module.exports = router;
