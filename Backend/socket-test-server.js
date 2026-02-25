// Minimal test server with just socket functionality
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

console.log('✅ Starting minimal socket test server...');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files for testing
app.use(express.static(__dirname));

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('subscribe_project', (projectId) => {
    console.log(`✅ Client subscribed to project: ${projectId}`);
    
    // Send a test event immediately
    setTimeout(() => {
      socket.emit('folder_sync', {
        projectId,
        projectName: 'Test Project',
        actionType: 'folder added',
        folderOrFileName: 'Test Folder',
        timestamp: new Date().toTimeString().split(' ')[0]
      });
    }, 2000);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`✅ Test socket server running on http://localhost:${PORT}`);
  console.log(`Open: http://localhost:${PORT}/test-live-sync.html`);
});
