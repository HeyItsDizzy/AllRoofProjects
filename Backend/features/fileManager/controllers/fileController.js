//fileController.js (Debugging Enhanced)
const path = require("path");
const fs = require("fs");
const { uploadsRoot: root } = require("../services/pathUtils");
const { ObjectId } = require("mongodb");
const { projectsCollection } = require("../../../db");
const { getProjectUploadPath } = require("../services/pathUtils");

const multer = require("multer");
const { fromBuffer } = require("file-type");
const { allowedExtensions } = require("../../../middleware/extensionLoader");


const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadFiles = [
  upload.array("files"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const files = req.files;
      const folderPath = req.body.folderPath || "";

      if (!files?.length) {
        return res.status(400).json({ error: "No files uploaded." });
      }

      const collection = await projectsCollection();
      const project = await collection.findOne({ _id: new ObjectId(projectId) });
      if (!project) return res.status(404).json({ error: "Project not found." });

      const basePath = await getProjectUploadPath(project);
      const allowed = allowedExtensions();

      for (const file of files) {
        const buffer = file.buffer;
        const originalExt = path.extname(file.originalname).toLowerCase();

        const detected = await fromBuffer(buffer);
        const mimeExt = detected?.ext ? `.${detected.ext}` : "";

        const mimeAllowed =
          allowed.includes(mimeExt) ||
          (allowed.includes(originalExt) && allowed.includes(mimeExt));

        if (!mimeAllowed) {
          return res.status(400).json({
            error: `❌ File type not allowed or mismatched: ${originalExt} ≠ ${mimeExt}`,
          });
        }

        const fullPath = path.join(basePath, folderPath, file.originalname);
        fs.writeFileSync(fullPath, buffer);
      }

      res.status(200).json({ message: "Files uploaded successfully." });
    } catch (err) {
      console.error("❌ Upload Error:", err);
      res.status(500).json({ error: "Upload failed", details: err.message });
    }
  },
];

const deleteFile = async (req, res) => {
  try {
    const { projectId, filePath } = req.params;

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const basePath = await getProjectUploadPath(project);
    const fullPath = path.join(basePath, filePath);

    console.log("[Delete] Project base path:", basePath);
    console.log("[Delete] File relative path:", filePath);
    console.log("[Delete] Full resolved path:", fullPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    fs.unlinkSync(fullPath);
    res.status(200).json({ message: "File deleted." });
  } catch (err) {
    console.error("[Delete Error]:", err);
    res.status(500).json({ error: "Delete failed", details: err.message });
  }
};

const renameFile = async (req, res) => {
  try {
    const { projectId, filePath } = req.params;
    const { newName } = req.body;

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const basePath = await getProjectUploadPath(project);
    const oldFullPath = path.join(basePath, filePath);
    const baseDir = path.dirname(oldFullPath);
    const newFullPath = path.join(baseDir, newName);

    console.log("[Rename] Project base path:", basePath);
    console.log("[Rename] File relative path:", filePath);
    console.log("[Rename] Old full path:", oldFullPath);
    console.log("[Rename] New full path:", newFullPath);

    if (!fs.existsSync(oldFullPath)) {
      return res.status(404).json({ error: "Original file not found" });
    }

    fs.renameSync(oldFullPath, newFullPath);
    res.status(200).json({ message: "File renamed." });
  } catch (err) {
    console.error("[Rename Error]:", err);
    res.status(500).json({ error: "Rename failed", details: err.message });
  }
};


module.exports = {
  uploadFiles,
  deleteFile,
  renameFile,
};
