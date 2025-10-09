// SocketApp main entry point
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// Function to create socket.io instance on existing server
const createSocketIO = (httpServer) => {
  const io = socketIo(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: '/socket.io/' // Standard socket.io path
  });

  // Import socket controller for project folder sync
  const { registerProjectWatcher } = require('./controllers/socketController');

  io.on('connection', (socket) => {
    console.log('SocketApp: Client connected:', socket.id);

    // Client requests to watch a project for live folder sync
    socket.on('subscribe_project', (projectId) => {
      if (typeof projectId === 'string' && projectId.length > 0) {
        registerProjectWatcher(io, projectId);
        console.log(`SocketApp: Client ${socket.id} subscribed to project ${projectId}`);
      }
    });

    // Client requests to unsubscribe from a project
    socket.on('unsubscribe_project', (projectId) => {
      if (typeof projectId === 'string' && projectId.length > 0) {
        console.log(`SocketApp: Client ${socket.id} unsubscribed from project ${projectId}`);
        // Note: We keep watchers active for other clients, just acknowledge the unsubscribe
      }
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log('SocketApp: Client disconnected:', socket.id);
    });
  });

  return io;
};

// Default socket.io for standalone mode
const io = createSocketIO(server);

// Export server and function for integration with main app
module.exports = { server, io, createSocketIO };
