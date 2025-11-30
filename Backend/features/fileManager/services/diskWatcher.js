// diskWatcher.js
const chokidar = require("chokidar");
const path = require("path");
const fs = require("fs").promises;
const { getProjectDiskPath, uploadsRoot: root } = require("./pathUtils");
const { getProjectById } = require("./syncService");
const debounce = require("lodash.debounce");
const debouncedLog = debounce((msg) => console.log(msg), 1000);
const debouncedListeningLog = debounce((msg) => console.log(msg), 10000); // 10 second debounce for listening logs
const debouncedTimeoutLog = debounce((msg) => console.log(msg), 10000); // 10 second debounce for timeout logs
const watchers = new Map();
const listeners = new Map();
const lastAccessTimestamps = new Map(); // projectId → Date.now()

const ENABLE_WATCHERS = String(process.env.ENABLE_WATCHERS).toLowerCase() !== "false";

// RecycleBin integration
let recycleBinService = null;

const initializeRecycleBin = (recycleBinInstance) => {
  recycleBinService = recycleBinInstance;
  console.log("📁 RecycleBin service integrated with diskWatcher");
};

// Helper function to determine project and client context from file path
const getFileContext = async (filePath) => {
  try {
    // Extract project info from path structure
    // Assuming path structure: /uploads/client_id/project_id/...
    const relativePath = path.relative(root, filePath);
    const pathParts = relativePath.split(path.sep);
    
    if (pathParts.length < 2) {
      return null; // Not a valid project file structure
    }
    
    // Try to parse client and project from path
    // This might need adjustment based on your actual path structure
    const potentialClientId = pathParts[0];
    const potentialProjectId = pathParts[1];
    
    // Get project details to confirm validity
    const project = await getProjectById(potentialProjectId).catch(() => null);
    
    if (!project) {
      return null; // Invalid project
    }
    
    return {
      clientId: project.clientId || potentialClientId,
      projectId: potentialProjectId,
      project: project
    };
    
  } catch (error) {
    console.warn("Failed to determine file context:", error.message);
    return null;
  }
};




const watchProjectFolder = async (projectId) => {
  if (watchers.has(projectId)) {
    return watchers.get(projectId); // Already watching
  }
  console.log(`🧪 Attempting to watch folder for project: ${projectId}`);

  const project = await getProjectById(projectId);
  if (!project) {
    console.warn(`⚠️ No project found in getProjectById for ${projectId}`);
    return;
  }
  

  const projectPath = getProjectDiskPath(project);
  if (!projectPath) {
    console.error("❌ watchProjectFolder: Could not resolve project path.");
    return;
  }

  const watcher = chokidar.watch(projectPath, {
    ignoreInitial: true,
    depth: 10,
    persistent: true,
  });

  watchers.set(projectId, watcher);
  const now = new Date();  const timestamp = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
  console.log(`👀 ${timestamp} - Now watching: ${projectPath} for project ${projectId}`);
  return watcher;
};


// Enhanced: Accepts a callback that receives detailed event info
const onDiskChange = async (projectId, callback) => {
  if (!ENABLE_WATCHERS) {
    console.log(`🔕 Skipping onDiskChange() for ${projectId}`);
    return;
  }

  const watcher = await watchProjectFolder(projectId);
  if (!watcher) {
    console.error(`❌ Failed to start watcher for project ${projectId}`);
    return;
  }

  const project = await getProjectById(projectId);
  const projectPath = getProjectDiskPath(project);
  if (!projectPath) {
    console.error("❌ Could not resolve projectPath in onDiskChange");
    return;
  }

  const handler = async (filePath, actionType = "changed") => {
    const now = new Date().toTimeString().split(" ")[0];
    lastAccessTimestamps.set(projectId, Date.now());

    const strippedPath = path.relative(projectPath, filePath);
    const folderOrFileName = path.basename(filePath);

    debouncedLog(
      `📣 ${now} - Disk change for project ${projectId} — file: ${strippedPath} | [${actionType}] | [${folderOrFileName}]`
    );

    // Handle file deletions with RecycleBin
    if ((actionType === "deleted" || actionType === "folder removed") && recycleBinService) {
      try {
        // Get file context for recycle bin
        const fileContext = await getFileContext(filePath);
        
        if (fileContext) {
          console.log(`🗑️ File deleted from disk, attempting to move to recycle bin: ${filePath}`);
          
          // Check if file actually exists (might have been moved to recycle bin already)
          try {
            await fs.access(filePath);
            
            // File still exists, so it was deleted by external means
            // Move it to recycle bin
            await recycleBinService.deleteFileToRecycleBin(filePath, {
              clientId: fileContext.clientId,
              projectId: fileContext.projectId,
              userId: 'system', // System user for external deletions
              deletedBy: 'system',
              deletionReason: 'direct_delete',
              deletionMethod: 'filesystem_watch'
            });
            
            console.log(`✅ File moved to recycle bin: ${strippedPath}`);
            
          } catch (accessError) {
            // File doesn't exist, it was already processed or deleted
            console.log(`ℹ️ File already processed or permanently deleted: ${strippedPath}`);
          }
          
        } else {
          console.warn(`⚠️ Could not determine context for deleted file: ${filePath}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to process deletion for recycle bin: ${filePath}`, error.message);
        // Continue with normal processing even if recycle bin fails
      }
    }

    // Compose event info for socket emit
    const eventInfo = {
      projectId,
      projectName: project?.name,
      actionType,
      filePath,
      strippedPath,
      folderOrFileName,
      timestamp: now,
      recycleBinProcessed: (actionType === "deleted" || actionType === "folder removed") && recycleBinService !== null
    };
    callback(eventInfo); // Notify frontend via socket
  };

  watcher.on("add", (path) => handler(path, "added"));
  watcher.on("change", (path) => handler(path, "modified"));
  watcher.on("unlink", (path) => handler(path, "deleted"));
  watcher.on("addDir", (path) => handler(path, "folder added"));
  watcher.on("unlinkDir", (path) => handler(path, "folder removed"));

  const now = new Date();  
  const timestamp = now.toTimeString().split(' ')[0];
  debouncedListeningLog(`👀 ${timestamp} - Listening for changes on project ${projectId}`);
};



const stopWatchingProject = (projectId) => {
  const watcher = watchers.get(projectId);
  if (watcher) {
    watcher.close();
    watchers.delete(projectId);
    listeners.delete(projectId);
    const now = new Date();  const timestamp = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
    console.log(`🛑 ${timestamp} - Stopped watching project ${projectId}`);
  }
};

// Every 1 minute, check for inactivity
setInterval(() => {
  const now = Date.now();
  const timeoutMs = 5 * 60 * 1000; // 5 minutes

  for (const [projectId, lastAccess] of lastAccessTimestamps.entries()) {
    if (now - lastAccess > timeoutMs) {
      console.log(`⏱️ Auto-stopping watcher for ${projectId} due to 5 min inactivity`);
      stopWatchingProject(projectId);
      lastAccessTimestamps.delete(projectId);
    }
  }
}, 60 * 1000); // Run every 1 minute


module.exports = {
  watchProjectFolder,
  onDiskChange,
  stopWatchingProject,
  initializeRecycleBin,
  isWatching: (projectId) => watchers.has(projectId)
};
