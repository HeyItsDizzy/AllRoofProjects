
// Socket event controller for live folder sync
const { onDiskChange } = require("../../fileManager/services/diskWatcher");

// Register a disk watcher for a project and emit socket events
function registerProjectWatcher(io, projectId) {
  // Only register once per projectId
  if (!io._watchedProjects) io._watchedProjects = new Set();
  if (io._watchedProjects.has(projectId)) return;
  io._watchedProjects.add(projectId);

  console.log(`✅ Watcher registered for project: ${projectId}`);
  
  onDiskChange(projectId, (eventInfo) => {
    // Only emit for folder and file changes
    if (eventInfo.actionType && eventInfo.folderOrFileName) {
      // Create event structure that matches frontend expectations
      const cleanEvent = {
        projectId: eventInfo.projectId,
        projectName: eventInfo.projectName || 'Unknown Project',
        eventType: eventInfo.actionType, // This will be like "folder added", "folder removed", etc.
        fileName: eventInfo.folderOrFileName,
        relativePath: eventInfo.strippedPath,
        fullPath: eventInfo.filePath,
        timestamp: eventInfo.timestamp,
        isFolder: eventInfo.actionType.includes('folder') || eventInfo.actionType.includes('Dir')
      };
      
      io.emit("folder_sync", cleanEvent);
      console.log(`📡 Emitted folder_sync event:`, cleanEvent);
    }
  });
}

module.exports = {
  registerProjectWatcher,
};