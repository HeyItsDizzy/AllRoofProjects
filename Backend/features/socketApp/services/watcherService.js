// Watcher service for SocketApp
const chokidar = require('chokidar');
const path = require('path');

// TODO: Set this to your projects root directory
const PROJECTS_ROOT = '/srv/projects';

function startWatcher(io) {
  const watcher = chokidar.watch(PROJECTS_ROOT, { ignoreInitial: true, depth: 3 });

  watcher.on('addDir', folderPath => {
    const folderName = path.basename(folderPath);
    // TODO: Add logic to map folder to project/roles, update .meta.json, etc.
    io.emit('folder_added', { folderName });
    console.log('SocketApp: Folder added:', folderName);
  });

  // Add more event handlers as needed (unlinkDir, add, unlink, change, etc.)
}

module.exports = { startWatcher };
