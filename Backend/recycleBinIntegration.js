// RecycleBin Integration Setup
// This file initializes the RecycleBin service and integrates it with existing systems

const RecycleBinService = require('./services/RecycleBinService');
const logger = console; // Replace with your actual logger

/**
 * Initialize RecycleBin system
 * Call this from your main app.js or server.js after database and socket.io setup
 */
async function initializeRecycleBinSystem(db, io) {
  try {
    console.log('♻️ Initializing RecycleBin system...');

    // Create simple logger if none provided
    const logger = console;

    // 1. Create RecycleBin service instance with proper parameters
    const recycleBinService = new RecycleBinService(db, io, logger);

    // 2. Create required indexes for performance (deferred until collection exists)
    await createRecycleBinIndexes(db);

    console.log('✅ RecycleBin system initialized successfully');
    return recycleBinService;

  } catch (error) {
    console.error('❌ Failed to initialize RecycleBin system:', error);
    throw error;
  }
}

/**
 * Create database indexes for RecycleBin collection
 */
async function createRecycleBinIndexes(db) {
  try {
    console.log('📊 Creating RecycleBin database indexes...');
    
    // Note: MongoDB will create the collection automatically when first document is inserted
    // For now, we'll skip index creation and let them be created when needed
    console.log('📊 RecycleBin index creation deferred until collection has data');
    
    /* Indexes to be created when collection exists:
    const collection = db.collection('recycleBin');

    const indexes = [
      // Query by client and restoration status
      { clientId: 1, canRestore: 1, deletedAt: -1 },
      
      // Cleanup queries
      { expiresAt: 1, canRestore: 1 },
      { canRestore: 1, fileSize: 1 },
      
      // User activity queries
      { deletedBy: 1, deletedAt: -1 },
      { userId: 1, deletedAt: -1 },
      
      // Project-specific queries
      { projectId: 1, canRestore: 1, deletedAt: -1 },
      
      // Audit trail
      { "auditLog.timestamp": -1 }
    ];

    for (const index of indexes) {
      await collection.createIndex(index);
    }

    // Text index for file search
    await collection.createIndex(
      { fileName: "text", originalPath: "text" },
      { name: "file_search_text" }
    );
    */

  } catch (error) {
    console.warn('⚠️ Failed to create some RecycleBin indexes:', error.message);
  }
}

/**
 * Setup socket events for RecycleBin real-time updates
 */
function setupRecycleBinSocketEvents(io, recycleBinService) {
  // Listen for RecycleBin events and broadcast to connected clients
  io.on('connection', (socket) => {
    
    // Client requests to join RecycleBin updates for their accessible clients
    socket.on('join_recycle_bin_updates', async (userData) => {
      try {
        if (userData && userData.userId) {
          // Join rooms based on user's accessible clients
          const userClients = await getUserAccessibleClients(userData.userId);
          
          for (const client of userClients) {
            socket.join(`recycle_bin_${client._id}`);
          }
          
          console.log(`🔔 User ${userData.userId} joined RecycleBin updates for ${userClients.length} clients`);
        }
      } catch (error) {
        console.error('Error joining RecycleBin updates:', error);
      }
    });

    // Client requests RecycleBin summary
    socket.on('get_recycle_bin_summary', async (userData) => {
      try {
        if (userData && userData.userId) {
          const userClients = await getUserAccessibleClients(userData.userId);
          let totalSummary = {
            totalFiles: 0,
            totalSize: 0,
            totalSizeFormatted: '0 B',
            clientSummaries: []
          };

          for (const client of userClients) {
            try {
              const summary = await recycleBinService.getRecycleBinSummary(client._id.toString());
              totalSummary.totalFiles += summary.totalFiles || 0;
              totalSummary.totalSize += summary.totalSize || 0;
              totalSummary.clientSummaries.push({
                clientId: client._id,
                clientName: client.name,
                ...summary
              });
            } catch (error) {
              console.warn(`Failed to get summary for client ${client._id}`);
            }
          }

          totalSummary.totalSizeFormatted = recycleBinService.formatFileSize(totalSummary.totalSize);

          socket.emit('recycle_bin_summary', totalSummary);
        }
      } catch (error) {
        console.error('Error getting RecycleBin summary:', error);
        socket.emit('recycle_bin_error', { error: 'Failed to get summary' });
      }
    });

  });

  // Override the RecycleBin service emit function to use rooms
  const originalEmit = recycleBinService.emitRecycleBinEvent;
  recycleBinService.emitRecycleBinEvent = (event, data) => {
    // Emit to specific client rooms if clientId is available
    if (data.clientId) {
      io.to(`recycle_bin_${data.clientId}`).emit('recycleBin', { 
        event, 
        data, 
        timestamp: new Date() 
      });
    } else {
      // Fallback to global emit
      io.emit('recycleBin', { 
        event, 
        data, 
        timestamp: new Date() 
      });
    }
  };

  console.log('🔌 RecycleBin socket events configured');
}

/**
 * Helper function to get user accessible clients
 * Replace with your actual user permission logic
 */
async function getUserAccessibleClients(userId) {
  try {
    // This is a placeholder - implement based on your user system
    const db = require('./db'); // Adjust path
    return await db.collection('clients')
      .find({ 
        $or: [
          { userId: new ObjectId(userId) },
          { 'permissions.userId': new ObjectId(userId) }
        ]
      })
      .toArray();
  } catch (error) {
    console.error('Error getting user accessible clients:', error);
    return [];
  }
}

/**
 * Integration example for your main app.js/server.js
 */
function getIntegrationExample() {
  return `
// In your main app.js or server.js file:

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient } = require('mongodb');
const { initializeRecycleBinSystem } = require('./recycleBinIntegration');
const { router: recycleBinRoutes } = require('./routes/recycleBinRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// After setting up your database connection:
async function startServer() {
  const db = await MongoClient.connect(process.env.MONGODB_URI);
  
  // Initialize RecycleBin system
  const recycleBinService = await initializeRecycleBinSystem(db, io);
  
  // Mount RecycleBin API routes
  app.use('/api/recycle-bin', recycleBinRoutes);
  
  // Your other routes and middleware...
  
  server.listen(port, () => {
    console.log('Server running with RecycleBin system');
  });
}

startServer();
  `;
}

module.exports = {
  initializeRecycleBinSystem,
  createRecycleBinIndexes,
  setupRecycleBinSocketEvents,
  getIntegrationExample
};