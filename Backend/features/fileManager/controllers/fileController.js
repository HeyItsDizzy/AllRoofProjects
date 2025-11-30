//fileController.js (DRY Enhanced) - WITH RECYCLE BIN INTEGRATION
const path = require("path");
const fs = require("fs");
const { uploadsRoot: root } = require("../services/pathUtils");
const { ObjectId } = require("mongodb");
const { projectsCollection } = require("../../../db");
const { getProjectUploadPath, getProjectDiskPath } = require("../services/pathUtils");

// Import RecycleBin Service for safe deletion
const RecycleBinService = require("../../../services/RecycleBinService");

const multer = require("multer");
const { fromBuffer } = require("file-type");
const { allowedExtensions } = require("../../../middleware/extensionLoader");

/**
 * DRY Helper Functions
 */

// Helper: Validate project and return project document
async function validateAndGetProject(projectId) {
  const collection = await projectsCollection();
  const project = await collection.findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    const error = new Error("Project not found");
    error.status = 404;
    throw error;
  }
  return project;
}

// Helper: Build and validate file path
async function buildFilePath(project, filePath) {
  const basePath = await getProjectUploadPath(project);
  const fullPath = path.join(basePath, filePath);
  
  console.log("[File Path] Project base path:", basePath);
  console.log("[File Path] File relative path:", filePath);
  console.log("[File Path] Full path:", fullPath);
  
  return { basePath, fullPath };
}

// Helper: Check if file exists
function validateFileExists(fullPath, filePath) {
  if (!fs.existsSync(fullPath)) {
    const error = new Error("Original file not found");
    error.status = 404;
    error.filePath = filePath;
    throw error;
  }
}


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
    const { userId, deletionReason = 'user_action' } = req.body || {};

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Build full path using disk path (more reliable for recycle bin)
    const region = "AU"; // Default region, could be made configurable
    const fullPath = getProjectDiskPath(project, filePath, region);

    console.log("[Delete with RecycleBin] Project:", project.name || project._id);
    console.log("[Delete with RecycleBin] File relative path:", filePath);
    console.log("[Delete with RecycleBin] Full resolved path:", fullPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Get RecycleBin service from global scope (initialized in index.js)
    const recycleBinService = global.recycleBinService;
    
    if (!recycleBinService) {
      console.warn("⚠️ RecycleBin service not available, falling back to direct deletion");
    }

    if (recycleBinService) {
      // Use RecycleBin service for safe deletion
      try {
        const recycleBinId = await recycleBinService.moveToRecycleBin(fullPath, {
          clientId: project.clientId || project._id, // Use project ID as fallback
          projectId: project._id.toString(),
          deletedBy: userId || req.user?.userId || 'system',
          deletionReason,
          deletionMethod: 'ui_delete'
        });

        console.log("✅ File moved to recycle bin:", recycleBinId);
        return res.status(200).json({ 
          message: "File moved to recycle bin successfully",
          recycleBinId: recycleBinId,
          canRestore: true
        });
      } catch (recycleBinError) {
        console.error("❌ RecycleBin operation failed:", recycleBinError);
        // Fall back to direct deletion
        console.warn("⚠️ Falling back to direct deletion due to RecycleBin error");
      }
    }

    // Fallback: Direct deletion (original behavior) 
    console.warn("⚠️ PERMANENT DELETION - RecycleBin not available");
    fs.unlinkSync(fullPath);
    res.status(200).json({ 
      message: "File deleted permanently (RecycleBin unavailable)",
      warning: "This was a permanent deletion - file cannot be recovered"
    });

  } catch (err) {
    console.error("[Delete Error]:", err);
    res.status(500).json({ error: "Delete failed", details: err.message });
  }
};

const renameFile = async (req, res) => {
  try {
    const { projectId, filePath } = req.params;
    const { newName } = req.body;

    // Use DRY helpers
    const project = await validateAndGetProject(projectId);
    const { basePath, fullPath } = await buildFilePath(project, filePath);
    validateFileExists(fullPath, filePath);

    const baseDir = path.dirname(fullPath);
    const newFullPath = path.join(baseDir, newName);

    console.log("[Rename] New full path:", newFullPath);

    fs.renameSync(fullPath, newFullPath);
    res.status(200).json({ message: "File renamed." });
  } catch (err) {
    console.error("[Rename Error]:", err);
    const status = err.status || 500;
    res.status(status).json({ 
      error: err.message || "Rename failed", 
      details: err.message 
    });
  }
};


module.exports = {
  uploadFiles,
  deleteFile,
  renameFile,
};
