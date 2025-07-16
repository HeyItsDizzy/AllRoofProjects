// diskWatcher.js
const chokidar = require("chokidar");
const path = require("path");
const { getProjectDiskPath, uploadsRoot: root } = require("./pathUtils");
const { getProjectById } = require("./syncService");
const debounce = require("lodash.debounce");
const debouncedLog = debounce((msg) => console.log(msg), 1000);
const watchers = new Map();
const listeners = new Map();
const lastAccessTimestamps = new Map(); // projectId → Date.now()

const ENABLE_WATCHERS = String(process.env.ENABLE_WATCHERS).toLowerCase() !== "false";




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

  const handler = (filePath, actionType = "changed") => {
    const now = new Date().toTimeString().split(" ")[0];
    lastAccessTimestamps.set(projectId, Date.now());

    const strippedPath = path.relative(projectPath, filePath);
    const folderOrFileName = path.basename(filePath);

    debouncedLog(
      `📣 ${now} - Disk change for project ${projectId} — file: ${strippedPath} | [${actionType}] | [${folderOrFileName}]`
    );

    watcher.off("add", handler);
    watcher.off("change", handler);
    watcher.off("unlink", handler);
    watcher.off("addDir", handler);
    watcher.off("unlinkDir", handler);

    callback(); // Notify frontend
  };

  watcher.on("add", (path) => handler(path, "added"));
  watcher.on("change", (path) => handler(path, "modified"));
  watcher.on("unlink", (path) => handler(path, "deleted"));
  watcher.on("addDir", (path) => handler(path, "folder added"));
  watcher.on("unlinkDir", (path) => handler(path, "folder removed"));

  const now = new Date();  
  const timestamp = now.toTimeString().split(' ')[0];
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

// Every 1 minute, check for inactivity
setInterval(() => {
  const now = Date.now();
  const timeoutMs = 10 * 60 * 1000; // 10 minutes

  for (const [projectId, lastAccess] of lastAccessTimestamps.entries()) {
    if (now - lastAccess > timeoutMs) {
      console.log(`⏱️ Auto-stopping watcher for ${projectId} due to 10 min inactivity`);
      stopWatchingProject(projectId);
      lastAccessTimestamps.delete(projectId);
    }
  }
}, 60 * 1000); // Run every 1 minute


module.exports = {
  watchProjectFolder,
  onDiskChange,
  stopWatchingProject,
};
