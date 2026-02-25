
// Socket event controller for live folder sync and recycle bin
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

      // If file was deleted and processed by recycle bin, emit recycle bin event
      if ((eventInfo.actionType === "deleted" || eventInfo.actionType === "folder removed") && 
          eventInfo.recycleBinProcessed) {
        
        const recycleBinEvent = {
          type: 'file_moved_to_recycle_bin',
          projectId: eventInfo.projectId,
          projectName: eventInfo.projectName,
          fileName: eventInfo.folderOrFileName,
          filePath: eventInfo.strippedPath,
          fileType: eventInfo.actionType.includes('folder') ? 'folder' : 'file',
          timestamp: eventInfo.timestamp,
          deletionMethod: 'filesystem_watch'
        };
        
        io.emit("recycle_bin_update", recycleBinEvent);
        console.log(`♻️ Emitted recycle_bin_update event:`, recycleBinEvent);
      }
    }
  });
}

module.exports = {
  registerProjectWatcher,
};