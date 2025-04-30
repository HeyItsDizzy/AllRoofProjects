// diskWatcher.js
const chokidar = require("chokidar");
const path = require("path");
const { getProjectDiskPath, uploadsRoot: root } = require("./pathUtils");
const { getProjectById } = require("./syncService");

const watchers = new Map();
const listeners = new Map();

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

const onDiskChange = async (projectId, callback) => {
  const watcher = await watchProjectFolder(projectId);
  if (!watcher) {
    console.error(`❌ Failed to start watcher for project ${projectId}`);
    return;
  }

  const handler = (filePath, actionType = "changed") => {
    const now = new Date().toTimeString().split(" ")[0];
    
    // Trim the disk root portion (adjust if dynamic region/year/month in future)
    const strippedPath = filePath.replace(`${root}\\AU\\2024\\12. Dec\\`, "");
    const folderOrFileName = path.basename(filePath);
  
    console.log(
      `📣 ${now} - Disk change for project ${projectId} — file: ${strippedPath} | [${actionType}] | [${folderOrFileName}]`
    );
  
    // ⚠️ Only call once, then cleanup
    watcher.off("add", handler);
    watcher.off("change", handler);
    watcher.off("unlink", handler);
    watcher.off("addDir", handler);
    watcher.off("unlinkDir", handler);
  
    callback(); // Notify frontend
  };

  // Listen for all types of changes
  watcher.on("add", (path) => handler(path, "added"));
  watcher.on("change", (path) => handler(path, "modified"));
  watcher.on("unlink", (path) => handler(path, "deleted"));
  watcher.on("addDir", (path) => handler(path, "folder added"));
  watcher.on("unlinkDir", (path) => handler(path, "folder removed"));
  

  const now = new Date();  const timestamp = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
  console.log(`👀 ${timestamp} - Listening for changes on project ${projectId}`);
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

module.exports = {
  watchProjectFolder,
  onDiskChange,
  stopWatchingProject,
};
