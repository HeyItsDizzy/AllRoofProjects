/**
 * File Management Routes
 * 
 * This module handles all file and folder operations for projects including:
 * - File uploads, downloads, and management
 * - Folder creation, deletion, and renaming  
 * - Project metadata management
 * - Real-time folder watching and synchronization
 * - ZIP archive creation and downloads
 * 
 * @module fileRoutes
 * @requires express
 * @requires archiver - for ZIP file creation
 * @requires mime - for MIME type detection
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const { ObjectId } = require("mongodb");
const archiver = require("archiver");
const mime = require("mime");

// Database and middleware imports
const { projectsCollection, clientCollection } = require("../../../db");
const { upload } = require("../../../middleware/upload");
const { allowedExtensions } = require("../../../middleware/extensionLoader");

// Service layer imports
const { uploadsRoot: root, getProjectDiskPath, getProjectUploadPath } = require("../services/pathUtils");
const { buildFolderTreeFromDisk, syncFromDisk } = require("../services/syncService");
const { startWatcher, stopWatchingProject, isWatching, onDiskChange } = require("../services/diskWatcher");

// Controller imports
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

// Initialize router and configuration
const router = express.Router();

/**
 * Middleware to check if user's client account is on hold
 * Blocks downloads but allows previews (read-only access)
 */
async function checkAccountHold(req, res, next) {
  try {
    // Only block actual downloads, not previews
    const isPreview = req.query.preview === "true";
    if (isPreview) {
      return next(); // Allow previews
    }

    // Extract token and verify it (optional authentication)
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    
    if (!token) {
      return next(); // No auth token, skip check (public access or admin direct access)
    }

    // Verify token
    const jwt = require("jsonwebtoken");
    let decodedUser;
    try {
      decodedUser = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(); // Invalid token, skip check
    }

    if (!decodedUser || !decodedUser.userId) {
      return next(); // No user ID in token, skip check
    }

    const { ObjectId } = require("mongodb");
    const userCollection = require("../../../db").userCollection;
    const clientsCollection = await clientCollection();
    const usersCollection = await userCollection();

    // Get user document
    const user = await usersCollection.findOne({ _id: new ObjectId(decodedUser.userId) });
    if (!user) {
      return next(); // User not found, skip check
    }

    // Determine client ID (handle multiple formats)
    let clientId = user.linkedClient; // Singular string

    if (!clientId && user.linkedClients?.length > 0) {
      clientId = user.linkedClients[0]; // Array format
    }

    if (!clientId && user.company) {
      // Lookup by company name
      const client = await clientsCollection.findOne({ name: user.company });
      if (client) {
        clientId = client._id;
      }
    }

    // If no client linked, allow download
    if (!clientId) {
      return next();
    }

    // Get client document
    const client = await clientsCollection.findOne({ 
      _id: typeof clientId === 'string' ? new ObjectId(clientId) : clientId 
    });

    if (!client) {
      return next(); // Client not found, allow download
    }

    // Check if account is on hold
    if (client.accountStatus === 'Hold') {
      console.log(`🚫 Download blocked - Client "${client.name}" account is on hold`);
      return res.status(403).json({
        error: 'Downloads disabled - account on hold',
        message: 'File downloads are disabled while your account is on hold. Please contact support or resolve outstanding invoices to restore download access.',
        clientName: client.name,
        accountStatus: client.accountStatus
      });
    }

    // Account is active, allow download
    next();

  } catch (error) {
    console.error('❌ Error checking account hold status:', error);
    // On error, allow download (fail open to prevent false lockouts)
    next();
  }
}

/**
 * Helper function to validate and fetch project from database
 * @param {string} projectId - MongoDB ObjectId string
 * @returns {Promise<Object>} Project document
 * @throws {Object} Error object with status and message
 */
async function validateProject(projectId) {
  const collection = await projectsCollection();
  const project = await collection.findOne({ _id: new ObjectId(projectId) });
  
  if (!project) {
    const error = new Error("Project not found");
    error.status = 404;
    throw error;
  }
  
  return project;
}

/**
 * Helper function to build and validate file path with security checks
 * @param {Object} project - Project document
 * @param {string} folderPath - Folder path within project
 * @param {string} fileName - Name of the file
 * @param {string} region - Region identifier
 * @returns {Object} Object with fullPath and security validation
 * @throws {Object} Error object with status and message
 */
function buildSecureFilePath(project, folderPath, fileName, region) {
  const fullFolderPath = getProjectDiskPath(project, folderPath, region);
  const filePath = path.join(fullFolderPath, fileName);
  
  // Security check: ensure file is within project directory
  const projectRoot = getProjectDiskPath(project, "", region);
  if (!filePath.startsWith(projectRoot)) {
    const error = new Error("Access denied - invalid file path");
    error.status = 403;
    throw error;
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    const error = new Error("File not found");
    error.status = 404;
    error.fileName = fileName;
    error.folderPath = folderPath === "." ? "root" : folderPath;
    throw error;
  }
  
  return { filePath, fullFolderPath };
}

/**
 * Track folder update timestamps for real-time sync
 * Format: { projectId: timestamp }
 */
const folderUpdateFlags = {};

/**
 * Environment configuration
 * ENABLE_WATCHERS: Controls whether file system watching is enabled
 */
const ENABLE_WATCHERS = String(process.env.ENABLE_WATCHERS).toLowerCase() !== "false";

/**
 * Long polling configuration for real-time updates
 */
// const LONGPOLL_MAX_MINUTES = 1; // Maximum time to keep connection open
// const LONGPOLL_INTERVAL_SECONDS = 5; // Interval between checks

// Serve static uploads directory
router.use("/uploads", express.static(root));

/**
 * ===================================
 * PROJECT METADATA ROUTES
 * ===================================
 */

/**
 * GET /:projectId/meta
 * Retrieves the .meta.json file for a project
 * 
 * @param {string} projectId - MongoDB ObjectId of the project
 * @returns {Object} Project metadata from .meta.json file
 * @throws {404} Project not found or .meta.json missing
 * @throws {500} Server error reading metadata
 */
router.get("/:projectId/meta", async (req, res) => {
  try {
    const { projectId } = req.params;

    // Validate and fetch project from database
    const project = await validateProject(projectId);

    // Build path to project's metadata file
    const projectPath = await getProjectUploadPath(project);
    const metaPath = path.join(projectPath, ".meta.json");

    // Check if metadata file exists
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: ".meta.json not found" });
    }

    // Read and return metadata
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    return res.status(200).json(meta);

  } catch (err) {
    console.error("🔥 Error loading meta.json:", err);
    const status = err.status || 500;
    return res.status(status).json({ 
      error: err.message || "Failed to load meta", 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * PUT /:projectId/meta
 * Updates the .meta.json file for a project
 * 
 * @param {string} projectId - MongoDB ObjectId of the project
 * @param {Object} req.body - Updated metadata object
 * @returns {Object} Success confirmation
 * @throws {404} Project not found
 * @throws {500} Server error writing metadata
 */
router.put("/:projectId/meta", async (req, res) => {
  try {
    const { projectId } = req.params;
    const updatedMeta = req.body;

    // Validate and fetch project from database
    const project = await validateProject(projectId);

    // Build path to project's metadata file
    const projectPath = await getProjectUploadPath(project);
    const metaPath = path.join(projectPath, ".meta.json");

    // Write updated metadata to file
    fs.writeFileSync(metaPath, JSON.stringify(updatedMeta, null, 2), "utf-8");

    return res.status(200).json({ 
      success: true, 
      message: "Project metadata updated successfully" 
    });

  } catch (err) {
    console.error("🔥 Error writing meta.json:", err);
    const status = err.status || 500;
    return res.status(status).json({ 
      error: err.message || "Failed to update metadata", 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * ===================================
 * REAL-TIME FOLDER WATCHING ROUTES
 * ===================================
 */

/**
 * GET /:projectId/watch-disk
 * Long-polling endpoint for real-time disk change notifications
 * Keeps connection open and returns when disk changes are detected
 * 
 * @param {string} projectId - MongoDB ObjectId of the project
 * @returns {Object} Change notification or timeout response
 * @throws {204} No changes detected within timeout period
 */

/*
router.get('/:projectId/watch-disk', (req, res) => {
  const { projectId } = req.params;

  // Set timeout for long polling connection
  req.setTimeout(LONGPOLL_MAX_MINUTES * 60000);
  let responded = false;

  // Setup timeout to respond with "no changes" if nothing happens
  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      const now = new Date();
      const timestamp = now.toTimeString().split(' ')[0];
      //console.log(`${timestamp} - ⏳ No disk changes detected (timeout): ${projectId}`);
      res.status(204).end();
    }
  }, LONGPOLL_INTERVAL_SECONDS * 1000);

  // Skip watching if disabled in environment
  if (!ENABLE_WATCHERS) {
    console.log(`🔕 Disk watching disabled for project ${projectId}`);
    clearTimeout(timeout);
    res.status(204).end();
    return;
  }

  // Listen for disk changes and respond immediately when detected
  onDiskChange(projectId, () => {
    if (!responded) {
      responded = true;
      clearTimeout(timeout);
      console.log(`📁 Disk change detected for project: ${projectId}`);
      res.status(200).json({ changed: true, projectId, timestamp: new Date().toISOString() });
    }
  });
});
*/

/**
 * GET /:projectId/watch-folder-tree
 * Initializes folder watching and returns current folder tree
 * Auto-syncs from disk and starts file system watcher if not already running
 * 
 * @param {string} projectId - MongoDB ObjectId of the project
 * @returns {Object} Current folder tree structure
 * @throws {404} Project not found
 * @throws {500} Error syncing or building folder tree
 */
router.get("/:projectId/watch-folder-tree", async (req, res) => { 
  const { projectId } = req.params;

  try {
    // Initialize watcher if enabled and not already watching
    if (ENABLE_WATCHERS && !isWatching(projectId)) {
      const now = new Date().toTimeString().split(" ")[0];
      console.log(`🔁 ${now} - [${projectId}] Initializing watcher and syncing from disk...`);

      // Sync current disk state to memory
      await syncFromDisk(projectId);

      // Get project details and start file system watcher
      const collection = await projectsCollection();
      const project = await collection.findOne({ _id: new ObjectId(projectId) });
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const fullDiskPath = getProjectDiskPath(project, "", "AU");
      startWatcher(projectId, fullDiskPath);
      
    } else if (!ENABLE_WATCHERS) {
      console.log(`🔕 Watcher initialization skipped for ${projectId} (disabled in environment)`);
    }

    // Build and return current folder tree
    const folderTree = await buildFolderTreeFromDisk(projectId);
    res.status(200).json(folderTree);

  } catch (err) {
    console.error(`🔥 [${projectId}] Failed to initialize folder watching:`, err);
    res.status(500).json({ 
      error: "Failed to load and watch folder tree",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /:projectId/notify-folder-update
 * Manually trigger folder update notification for real-time sync
 * Used when external processes modify folders outside the API
 * 
 * @param {string} projectId - MongoDB ObjectId of the project
 * @returns {Object} Confirmation message
 */
router.post("/:projectId/notify-folder-update", (req, res) => {
  const { projectId } = req.params;
  
  // Flag this project as recently updated
  folderUpdateFlags[projectId] = Date.now();
  
  console.log(`📢 Manual folder update notification for project: ${projectId}`);
  res.json({ 
    message: "Folder update flagged successfully", 
    projectId,
    timestamp: folderUpdateFlags[projectId]
  });
});

/**
 * POST /:projectId/unwatch
 * Stop file system watching for a project
 * Useful for cleanup when user leaves project or system shutdown
 * 
 * @param {string} projectId - MongoDB ObjectId of the project
 * @returns {String} Confirmation message
 * @throws {500} Error stopping watcher
 */
router.post("/:projectId/unwatch", (req, res) => {
  const { projectId } = req.params;
  
  console.log(`🛑 Stopping file system watcher for project: ${projectId}`);
  
  try {
    stopWatchingProject(projectId);
    res.status(200).json({ 
      message: "File system watching stopped successfully",
      projectId 
    });
  } catch (err) {
    console.error("🔥 Failed to stop watcher:", err);
    res.status(500).json({ 
      error: "Failed to stop file system watcher",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * ===================================
 * FOLDER & FILE MANAGEMENT ROUTES
 * ===================================
 */

// Folder management routes - delegated to controller
router.post("/:projectId/folders", createFolder);
router.delete("/:projectId/folders/*", deleteFolder);

/**
 * PUT /:projectId/folders/:folderPath
 * Rename a folder using its file system path (disk-based operation)
 * This route handles path-based folder renames for real-time folder management
 * 
 * @param {string} projectId - MongoDB ObjectId of the project
 * @param {string} folderPath - Full path to folder (captured with wildcard)
 * @param {string} newName - New folder name from request body
 * @param {string} region - Optional region parameter (defaults to "AU")
 * @returns {Object} Success message with old and new paths
 * @throws {404} Project or folder not found
 * @throws {400} Target folder already exists
 * @throws {500} File system operation failed
 */
router.put("/:projectId/folders/:folderPath(*)", async (req, res) => {
  try {
    console.log("� Processing folder rename request (path-based)");
    
    const { projectId } = req.params;
    const folderPath = req.params.folderPath;
    const { newName } = req.body;
    const region = req.body.region || "AU";

    // Input validation
    if (!newName || newName.trim() === '') {
      return res.status(400).json({ error: "New folder name is required" });
    }

    console.log(`🔍 Rename operation details:
       Project ID: ${projectId}
       Folder path: ${folderPath}
       New name: ${newName}
       Region: ${region}`);

    // Validate project exists
    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Build file system paths
    const oldFolderPath = getProjectDiskPath(project, folderPath, region);
    
    // Calculate new path by replacing just the folder name
    const pathParts = folderPath.split('/');
    const parentPath = pathParts.slice(0, -1).join('/');
    const newFolderPath = getProjectDiskPath(project, parentPath ? `${parentPath}/${newName}` : newName, region);

    console.log(`🔄 File system operation:
       FROM: ${oldFolderPath}
       TO:   ${newFolderPath}`);

    // Validate source folder exists
    if (!fs.existsSync(oldFolderPath)) {
      console.warn(`❌ Source folder not found: ${oldFolderPath}`);
      return res.status(404).json({ 
        error: "Source folder not found",
        path: folderPath 
      });
    }

    // Check if rename is actually needed
    if (oldFolderPath === newFolderPath) {
      return res.status(200).json({ 
        message: "No changes needed - folder already has the specified name" 
      });
    }

    // Validate destination doesn't already exist
    if (fs.existsSync(newFolderPath)) {
      return res.status(400).json({ 
        error: "Target folder already exists",
        conflictingPath: newFolderPath
      });
    }

    // Ensure parent directory exists for destination
    fs.mkdirSync(path.dirname(newFolderPath), { recursive: true });

    // Attempt file system rename operation
    try {
      fs.renameSync(oldFolderPath, newFolderPath);
      console.log("✅ Folder rename completed successfully");
    } catch (err) {
      console.warn("⚠️ Direct rename failed, attempting copy + delete fallback:", err.message);
      
      try {
        // Fallback: copy then delete
        fs.cpSync(oldFolderPath, newFolderPath, { recursive: true });
        fs.rmSync(oldFolderPath, { recursive: true });
        console.log("✅ Folder rename completed via copy + delete fallback");
      } catch (deepErr) {
        console.error("🔥 Copy + delete fallback also failed:", deepErr);
        return res.status(500).json({
          error: "Folder rename operation failed",
          details: process.env.NODE_ENV === 'development' ? deepErr.message : undefined
        });
      }
    }

    return res.status(200).json({ 
      message: "Folder renamed successfully",
      oldPath: folderPath,
      newPath: parentPath ? `${parentPath}/${newName}` : newName,
      projectId
    });

  } catch (err) {
    console.error("🔥 Critical error in folder rename operation:", err);
    return res.status(500).json({ 
      error: "Server error during folder rename",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Additional folder management routes - delegated to controllers
router.put("/:projectId/folders/:folderId", renameFolder);  // ID-based folder rename
router.get("/:projectId/folders", getFolders);              // Get all folders for project

/**
 * GET /:projectId/folder-tree
 * Get hierarchical folder structure for project
 * PROXY TO LIVE SERVER in development mode
 */
router.get("/:projectId/folder-tree", async (req, res) => {
  const { projectId } = req.params;
  
  try {
    console.log(`🔍 [FOLDER-TREE] Request for project: ${projectId}`);
    
    // Validate projectId format
    if (!ObjectId.isValid(projectId)) {
      console.error(`❌ [FOLDER-TREE] Invalid ObjectId format: ${projectId}`);
      return res.status(400).json({ 
        error: "Invalid project ID format",
        projectId: projectId
      });
    }

    // Check if we should proxy to live server (development mode)
    const fileApiBaseUrl = process.env.FILE_API_BASE_URL;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment && fileApiBaseUrl) {
      console.log(`🔄 [FOLDER-TREE] Proxying to live server: ${fileApiBaseUrl}`);
      
      try {
        const axios = require('axios');
        const liveResponse = await axios.get(
          `${fileApiBaseUrl}/files/${projectId}/folder-tree`,
          {
            timeout: 10000,
            headers: {
              'User-Agent': 'ProjectManager-Dev-Proxy'
            }
          }
        );
        
        console.log(`✅ [FOLDER-TREE] Successfully proxied from live server`);
        return res.status(200).json(liveResponse.data);
        
      } catch (proxyErr) {
        console.warn(`⚠️ [FOLDER-TREE] Live server proxy failed, falling back to local:`, proxyErr.message);
        // Fall through to local implementation
      }
    }
    
    // Build folder tree using local service (fallback or production)
    console.log(`🔨 [FOLDER-TREE] Building local folder tree for: ${projectId}`);
    const folderTree = await buildFolderTreeFromDisk(projectId);
    
    console.log(`✅ [FOLDER-TREE] Successfully built tree with ${Object.keys(folderTree).length} top-level items`);
    
    res.status(200).json(folderTree);
    
  } catch (err) {
    console.error("🔥 [FOLDER-TREE] Error loading folder tree:", err);
    console.error("🔥 [FOLDER-TREE] Error stack:", err.stack);
    
    res.status(500).json({ 
      error: "Failed to load folder tree",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      projectId: projectId
    });
  }
});

/**
 * GET /:projectId/meta
 * Get project meta.json file contents
 * PROXY TO LIVE SERVER in development mode
 */
router.get("/:projectId/meta", async (req, res) => {
  const { projectId } = req.params;
  const region = req.query.region || "AU";
  
  try {
    console.log(`🔍 [META] Request for project meta: ${projectId}, region: ${region}`);
    
    // Check if we should proxy to live server (development mode)
    const fileApiBaseUrl = process.env.FILE_API_BASE_URL;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment && fileApiBaseUrl) {
      console.log(`🔄 [META] Proxying to live server: ${fileApiBaseUrl}`);
      
      try {
        const axios = require('axios');
        const liveResponse = await axios.get(
          `${fileApiBaseUrl}/files/${projectId}/meta`,
          {
            timeout: 10000,
            params: { region },
            headers: {
              'User-Agent': 'ProjectManager-Dev-Proxy'
            }
          }
        );
        
        console.log(`✅ [META] Successfully proxied from live server`);
        return res.status(200).json(liveResponse.data);
        
      } catch (proxyErr) {
        console.warn(`⚠️ [META] Live server proxy failed, falling back to local:`, proxyErr.message);
        // Fall through to local implementation
      }
    }
    
    // Validate project exists (for local fallback)
    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });
    
    if (!project) {
      console.error(`❌ [META] Project not found: ${projectId}`);
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Get project path and meta.json path
    const projectPath = getProjectDiskPath(project, "", region);
    const metaPath = path.join(projectPath, ".meta.json");
    
    console.log(`📁 [META] Looking for meta.json at: ${metaPath}`);
    
    if (!fs.existsSync(metaPath)) {
      console.warn(`⚠️ [META] .meta.json not found, creating default at: ${metaPath}`);
      
      // Ensure directory exists
      fs.mkdirSync(projectPath, { recursive: true });
      
      // Create default meta.json
      const defaultMeta = { 
        projectId: project._id,
        projectName: project.name || "Unknown Project",
        projectNumber: project.projectNumber,
        region: region,
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(metaPath, JSON.stringify(defaultMeta, null, 2));
      
      console.log(`✅ [META] Created default meta.json for project: ${projectId}`);
      return res.status(200).json(defaultMeta);
    }
    
    // Read existing meta.json
    try {
      const raw = fs.readFileSync(metaPath, "utf-8");
      const meta = JSON.parse(raw);
      
      console.log(`✅ [META] Successfully loaded meta.json for project: ${projectId}`);
      return res.status(200).json(meta);
      
    } catch (jsonErr) {
      console.error(`🔥 [META] Failed to parse .meta.json:`, jsonErr.message);
      return res.status(500).json({ 
        error: "Invalid meta.json format",
        details: process.env.NODE_ENV === 'development' ? jsonErr.message : undefined
      });
    }
    
  } catch (err) {
    console.error("🔥 [META] Unexpected error loading meta.json:", err);
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// File management routes - delegated to controllers  
router.post("/:projectId/upload", uploadFiles);             // Upload files to project
router.delete("/:projectId/files/:filePath", deleteFile);   // Delete specific file
router.put("/:projectId/files/:filePath", renameFile);      // Rename specific file

/**
 * ===================================
 * DOWNLOAD & ARCHIVE ROUTES
 * ===================================
 */

// Debug middleware to catch all file download requests
router.use("/:projectId/download/*", (req, res, next) => {
  console.log(`🔍 DEBUG: File download route hit - Method: ${req.method}, URL: ${req.url}`);
  console.log(`🔍 DEBUG: Params:`, req.params);
  console.log(`🔍 DEBUG: Query:`, req.query);
  console.log(`🔍 DEBUG: Headers:`, req.headers);
  next();
});

/**
 * POST /:projectId/download-zip
 * Create and download ZIP archive of specified folder
 * Useful for bulk download of project folders or entire projects
 * 
 * @param {string} projectId - MongoDB ObjectId of the project
 * @param {string} folderPath - Path to folder to archive (from request body)
 * @param {string} region - Optional region parameter (defaults to "AU")
 * @returns {Blob} ZIP file stream
 * @throws {403} Account on hold (downloads disabled)
 * @throws {404} Project or folder not found
 * @throws {500} Archive creation failed
 */


router.post("/:projectId/download-zip", checkAccountHold, async (req, res) => {
  const { projectId } = req.params;
  const { folderPath } = req.body;
  const region = req.body.region || "AU";

  try {
    console.log(`📦 Creating ZIP archive for project ${projectId}, folder: ${folderPath || 'root'}`);

    // Validate project exists
    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Determine folder path to archive
    const fullPath = folderPath === "." || !folderPath
      ? getProjectDiskPath(project, "", region)
      : getProjectDiskPath(project, folderPath, region);

    // Validate folder exists on disk
    if (!fs.existsSync(fullPath)) {
      console.warn(`📦 Folder not found for ZIP: ${fullPath}`);
      return res.status(404).json({ 
        error: "Folder not found on disk",
        requestedPath: folderPath || "root"
      });
    }

    // Create safe filename for ZIP
    const safeName = (folderPath || "ProjectRoot").replace(/[^a-zA-Z0-9-_]/g, "_");
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const zipFilename = `${safeName}_${timestamp}.zip`;

    // Configure ZIP archive with high compression
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    // Set response headers for file download
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);
    res.setHeader("Cache-Control", "no-cache");

    // Pipe archive to response
    archive.pipe(res);

    // Add folder contents to archive (preserves folder structure)
    archive.directory(fullPath, path.basename(fullPath));

    // Handle archive completion and errors
    archive.on("error", err => {
      console.error("🔥 ZIP archive creation error:", err);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to create ZIP archive",
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    });

    archive.on("end", () => {
      console.log(`✅ ZIP archive completed: ${zipFilename} (${archive.pointer()} bytes)`);
    });

    // Finalize archive (triggers compression and streaming)
    await archive.finalize();

  } catch (err) {
    console.error("🔥 ZIP download operation failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "ZIP download failed",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
});

/**
 * Individual file download route
 * Downloads a specific file from project folder structure using catch-all routing
 * 
 * @param {string} projectId - MongoDB ObjectId of the project
 * @param {string} ** - Complete file path including folder and filename
 * @param {string} region - Optional region query parameter (defaults to "AU")
 * @returns {Stream} File download stream with appropriate headers
 * @throws {403} Account on hold (downloads disabled)
 * @throws {404} Project or file not found
 * @throws {500} File access error
 */
router.get("/:projectId/download/**", checkAccountHold, async (req, res) => {
  const { projectId } = req.params;
  const region = req.query.region || "AU";
  const isPreview = req.query.preview === "true";

  // Performance tracking
  const requestStart = Date.now();
  const timestamp = new Date().toLocaleTimeString();

  try {
    // Extract complete file path from catch-all parameter
    const completePath = req.params[0] || "";
    const decodedPath = decodeURIComponent(completePath);
    
    // Split into folder path and filename
    const pathParts = decodedPath.split('/');
    const fileName = pathParts.pop() || "";
    const folderPath = pathParts.join('/') || ".";

    console.log(`📁 File ${isPreview ? 'preview' : 'download'} request: ${fileName} from ${folderPath} in project ${projectId}`);

    // Validate project and build secure file path
    const project = await validateProject(projectId);
    const { filePath } = buildSecureFilePath(project, folderPath, fileName, region);

    // Get file info and set headers
    const mimeType = mime.getType(filePath) || "application/octet-stream";
    const fileStats = fs.statSync(filePath);
    
    // Performance logging with file size
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 File metrics: ${fileName} | Size: ${fileSizeMB} MB (${fileStats.size} bytes) | Type: ${mimeType}`);
    
    // FORCE IDENTICAL BROWSER BEHAVIOR: Add same headers that make PDFs work
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", isPreview ? `inline; filename="${fileName}"` : `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", fileStats.size);
    res.setHeader("Cache-Control", "no-cache");
    
    // Add headers that ensure authentication works for all file types
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    
    const isImage = mimeType.startsWith('image/');
    if (isPreview && isImage) {
      console.log(`🖼️ Adding enhanced headers for image preview: ${fileName}`);
    }

    const processingTime = Date.now() - requestStart;
    console.log(`✅ Serving file: ${fileName} | Processing time: ${processingTime}ms | Started: ${timestamp}`);

    // Stream file to response with performance tracking
    const fileStream = fs.createReadStream(filePath);
    let bytesSent = 0;
    
    fileStream.on('data', (chunk) => {
      bytesSent += chunk.length;
    });
    
    fileStream.on('end', () => {
      const totalTime = Date.now() - requestStart;
      const transferRate = (bytesSent / (1024 * 1024)) / (totalTime / 1000); // MB/s
      console.log(`📤 Transfer complete: ${fileName} | Total time: ${totalTime}ms | Rate: ${transferRate.toFixed(2)} MB/s`);
    });
    
    fileStream.on('error', (streamErr) => {
      const errorTime = Date.now() - requestStart;
      console.error(`🔥 File stream error after ${errorTime}ms:`, streamErr);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "File stream error",
          details: process.env.NODE_ENV === 'development' ? streamErr.message : undefined
        });
      }
    });

    fileStream.pipe(res);

  } catch (err) {
    console.error("🔥 File download operation failed:", err);
    if (!res.headersSent) {
      const status = err.status || 500;
      res.status(status).json({ 
        error: err.message || "Failed to download file",
        fileName: err.fileName,
        folderPath: err.folderPath,
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
});

/**
 * Alternative download route for files that have CORS issues (like images)
 * Uses query parameters instead of path parameters to avoid browser preflight requests
 * 
 * @param {string} projectId - MongoDB ObjectId of the project
 * @param {string} folder - Folder path from query parameter  
 * @param {string} filename - File name from query parameter
 * @param {string} region - Optional region query parameter (defaults to "AU")
 * @param {string} preview - Optional preview mode parameter
 * @throws {403} Account on hold (downloads disabled)
 */
router.get("/:projectId/file", checkAccountHold, async (req, res) => {
  const { projectId } = req.params;
  const { folder, filename, region = "AU", preview } = req.query;
  const isPreview = preview === "true";

  try {
    console.log(`📁 Alternative file ${isPreview ? 'preview' : 'download'}: ${filename} from ${folder || 'root'} in project ${projectId}`);

    // Validate project and build secure file path
    const project = await validateProject(projectId);
    const folderPath = folder || "";
    const { filePath } = buildSecureFilePath(project, folderPath, filename, region);

    // Get file info and set headers
    const mimeType = mime.getType(filePath) || "application/octet-stream";
    const fileStats = fs.statSync(filePath);
    
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", isPreview ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", fileStats.size);
    res.setHeader("Cache-Control", "no-cache");

    console.log(`✅ Serving file via alternative route: ${filename} (${fileStats.size} bytes, ${mimeType})`);

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (streamErr) => {
      console.error("🔥 File stream error:", streamErr);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "File stream error",
          details: process.env.NODE_ENV === 'development' ? streamErr.message : undefined
        });
      }
    });
    fileStream.pipe(res);

  } catch (err) {
    console.error("🔥 Alternative file download failed:", err);
    if (!res.headersSent) {
      const status = err.status || 500;
      res.status(status).json({ 
        error: err.message || "Failed to download file",
        filename: err.fileName,
        folder: err.folderPath,
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
});

/**
 * ===================================
 * MODULE EXPORTS
 * ===================================
 */

// 🗜️ ZIP Extraction Endpoint
router.post('/:projectId/extract-zip', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { fileName, folderPath = '', deleteOriginal = true } = req.body;
    
    console.log(`🗜️ [EXTRACT] Starting ZIP extraction: ${fileName} in ${folderPath}`);
    
    // Get project and validate
    const project = await projectsCollection.findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const projectDiskPath = getProjectDiskPath(project.alias);
    const fullFolderPath = path.join(projectDiskPath, folderPath);
    const zipFilePath = path.join(fullFolderPath, fileName);
    
    // Check if ZIP file exists
    if (!fs.existsSync(zipFilePath)) {
      return res.status(404).json({ error: "ZIP file not found" });
    }
    
    // Ensure it's actually a ZIP file
    if (!fileName.toLowerCase().endsWith('.zip')) {
      return res.status(400).json({ error: "File is not a ZIP archive" });
    }
    
    const JSZip = require('jszip');
    const extractedFiles = [];
    
    try {
      // Read and extract ZIP file
      const zipData = fs.readFileSync(zipFilePath);
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipData);
      
      // Process each file in the ZIP
      for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
        // Skip directories and hidden files
        if (zipEntry.dir || relativePath.startsWith('__MACOSX/') || relativePath.includes('/.')) {
          continue;
        }
        
        console.log(`📂 [EXTRACT] Extracting: ${relativePath}`);
        
        // Get file content as buffer
        const fileBuffer = await zipEntry.async('nodebuffer');
        
        // Determine output path (preserve folder structure)
        const outputPath = path.join(fullFolderPath, relativePath);
        const outputDir = path.dirname(outputPath);
        
        // Create directories if they don't exist
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Write extracted file
        fs.writeFileSync(outputPath, fileBuffer);
        extractedFiles.push(relativePath);
      }
      
      console.log(`✅ [EXTRACT] Extracted ${extractedFiles.length} files from ${fileName}`);
      
      // Delete original ZIP if requested
      if (deleteOriginal) {
        fs.unlinkSync(zipFilePath);
        console.log(`🗑️ [EXTRACT] Deleted original ZIP: ${fileName}`);
      }
      
      // Sync folder tree after extraction
      await syncFromDisk(projectId);
      
      res.json({
        success: true,
        message: `Successfully extracted ${extractedFiles.length} files`,
        extractedFiles,
        deletedOriginal: deleteOriginal
      });
      
    } catch (zipError) {
      console.error("❌ [EXTRACT] ZIP processing failed:", zipError);
      res.status(400).json({ 
        error: "Failed to extract ZIP file", 
        details: zipError.message 
      });
    }
    
  } catch (err) {
    console.error("🔥 [EXTRACT] ZIP extraction endpoint failed:", err);
    res.status(500).json({ 
      error: "Internal server error during ZIP extraction",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;