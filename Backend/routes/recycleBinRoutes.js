const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { authenticateToken } = require('../middleware/auth');

/**
 * RecycleBin API Routes
 * Handles file recovery, permanent deletion, and recycle bin management
 */

let recycleBinService = null;

// Initialize RecycleBin service
const initializeRecycleBinRoutes = (recycleBinServiceInstance) => {
  recycleBinService = recycleBinServiceInstance;
  console.log('♻️ RecycleBin routes initialized');
};

/**
 * Get recycle bin items for authenticated user's clients
 * GET /api/recycle-bin/items
 */
router.get('/items', authenticateToken, async (req, res) => {
  try {
    const {
      clientId,
      page = 1,
      limit = 20,
      fileType,
      sortBy = 'deletedAt',
      sortOrder = 'desc',
      search = ''
    } = req.query;

    if (!recycleBinService) {
      return res.status(503).json({
        error: 'RecycleBin service not available'
      });
    }

    // If no specific clientId provided, need to get user's accessible clients
    let targetClientIds = [];
    
    if (clientId) {
      // Verify user has access to this client
      targetClientIds = [clientId];
    } else {
      // Get all clients user has access to
      // This depends on your user permission system
      const userClients = await getUserAccessibleClients(req.user.userId);
      targetClientIds = userClients.map(client => client._id.toString());
    }

    // Get items for all accessible clients
    let allItems = [];
    let totalCount = 0;

    for (const cId of targetClientIds) {
      const clientItems = await recycleBinService.getRecycleBinItems(cId, {
        page: 1,
        limit: 1000, // Get all for aggregation
        fileType,
        sortBy,
        sortOrder: sortOrder === 'desc' ? -1 : 1,
        search
      });

      allItems = allItems.concat(clientItems.items);
      totalCount += clientItems.pagination.total;
    }

    // Sort and paginate combined results
    const sortMultiplier = sortOrder === 'desc' ? -1 : 1;
    allItems.sort((a, b) => {
      if (sortBy === 'deletedAt') {
        return (new Date(a.deletedAt) - new Date(b.deletedAt)) * sortMultiplier;
      }
      if (sortBy === 'fileSize') {
        return (a.fileSize - b.fileSize) * sortMultiplier;
      }
      if (sortBy === 'fileName') {
        return a.fileName.localeCompare(b.fileName) * sortMultiplier;
      }
      return 0;
    });

    const startIndex = (page - 1) * limit;
    const paginatedItems = allItems.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      items: paginatedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching recycle bin items:', error);
    res.status(500).json({
      error: 'Failed to fetch recycle bin items',
      details: error.message
    });
  }
});

/**
 * Get recycle bin items for specific client
 * GET /api/recycle-bin/client/:clientId
 */
router.get('/client/:clientId', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      page = 1,
      limit = 20,
      fileType,
      sortBy = 'deletedAt',
      sortOrder = 'desc',
      search = ''
    } = req.query;

    if (!recycleBinService) {
      return res.status(503).json({
        error: 'RecycleBin service not available'
      });
    }

    // Verify user has access to this client
    const hasAccess = await verifyClientAccess(req.user.userId, clientId);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied to this client'
      });
    }

    const result = await recycleBinService.getRecycleBinItems(clientId, {
      page: parseInt(page),
      limit: parseInt(limit),
      fileType,
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1,
      search
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error fetching client recycle bin items:', error);
    res.status(500).json({
      error: 'Failed to fetch client recycle bin items',
      details: error.message
    });
  }
});

/**
 * Restore file from recycle bin
 * POST /api/recycle-bin/restore/:recycleBinId
 */
router.post('/restore/:recycleBinId', authenticateToken, async (req, res) => {
  try {
    const { recycleBinId } = req.params;
    const { restorePath } = req.body;

    if (!recycleBinService) {
      return res.status(503).json({
        error: 'RecycleBin service not available'
      });
    }

    // Verify user has access to restore this file
    const recycleBinItem = await recycleBinService.collection.findOne({
      _id: new ObjectId(recycleBinId),
      canRestore: true
    });

    if (!recycleBinItem) {
      return res.status(404).json({
        error: 'File not found in recycle bin or cannot be restored'
      });
    }

    const hasAccess = await verifyClientAccess(req.user.userId, recycleBinItem.clientId.toString());
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied to restore this file'
      });
    }

    const result = await recycleBinService.restoreFileFromRecycleBin(recycleBinId, {
      userId: req.user.userId,
      restorePath: restorePath
    });

    res.json({
      success: true,
      message: 'File restored successfully',
      ...result
    });

  } catch (error) {
    console.error('Error restoring file:', error);
    res.status(500).json({
      error: 'Failed to restore file',
      details: error.message
    });
  }
});

/**
 * Bulk restore files from recycle bin
 * POST /api/recycle-bin/restore-bulk
 */
router.post('/restore-bulk', authenticateToken, async (req, res) => {
  try {
    const { recycleBinIds } = req.body;

    if (!Array.isArray(recycleBinIds) || recycleBinIds.length === 0) {
      return res.status(400).json({
        error: 'Please provide an array of recycle bin IDs'
      });
    }

    if (!recycleBinService) {
      return res.status(503).json({
        error: 'RecycleBin service not available'
      });
    }

    let restoredCount = 0;
    let failedCount = 0;
    const results = [];

    for (const recycleBinId of recycleBinIds) {
      try {
        // Verify access for each file
        const recycleBinItem = await recycleBinService.collection.findOne({
          _id: new ObjectId(recycleBinId),
          canRestore: true
        });

        if (!recycleBinItem) {
          failedCount++;
          results.push({
            recycleBinId,
            success: false,
            error: 'File not found or cannot be restored'
          });
          continue;
        }

        const hasAccess = await verifyClientAccess(req.user.userId, recycleBinItem.clientId.toString());
        if (!hasAccess) {
          failedCount++;
          results.push({
            recycleBinId,
            success: false,
            error: 'Access denied'
          });
          continue;
        }

        const result = await recycleBinService.restoreFileFromRecycleBin(recycleBinId, {
          userId: req.user.userId
        });

        restoredCount++;
        results.push({
          recycleBinId,
          success: true,
          ...result
        });

      } catch (error) {
        failedCount++;
        results.push({
          recycleBinId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk restore completed: ${restoredCount} restored, ${failedCount} failed`,
      restoredCount,
      failedCount,
      results
    });

  } catch (error) {
    console.error('Error in bulk restore:', error);
    res.status(500).json({
      error: 'Failed to perform bulk restore',
      details: error.message
    });
  }
});

/**
 * Permanently delete files from recycle bin
 * DELETE /api/recycle-bin/permanent/:recycleBinId
 */
router.delete('/permanent/:recycleBinId', authenticateToken, async (req, res) => {
  try {
    const { recycleBinId } = req.params;

    if (!recycleBinService) {
      return res.status(503).json({
        error: 'RecycleBin service not available'
      });
    }

    // Verify access
    const recycleBinItem = await recycleBinService.collection.findOne({
      _id: new ObjectId(recycleBinId),
      canRestore: true
    });

    if (!recycleBinItem) {
      return res.status(404).json({
        error: 'File not found in recycle bin'
      });
    }

    const hasAccess = await verifyClientAccess(req.user.userId, recycleBinItem.clientId.toString());
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const result = await recycleBinService.permanentlyDeleteItems([recycleBinId], {
      userId: req.user.userId,
      reason: 'user_request'
    });

    res.json({
      success: true,
      message: 'File permanently deleted',
      ...result
    });

  } catch (error) {
    console.error('Error permanently deleting file:', error);
    res.status(500).json({
      error: 'Failed to permanently delete file',
      details: error.message
    });
  }
});

/**
 * Bulk permanent delete
 * DELETE /api/recycle-bin/permanent-bulk
 */
router.delete('/permanent-bulk', authenticateToken, async (req, res) => {
  try {
    const { recycleBinIds } = req.body;

    if (!Array.isArray(recycleBinIds) || recycleBinIds.length === 0) {
      return res.status(400).json({
        error: 'Please provide an array of recycle bin IDs'
      });
    }

    if (!recycleBinService) {
      return res.status(503).json({
        error: 'RecycleBin service not available'
      });
    }

    // Verify access for all files
    const items = await recycleBinService.collection.find({
      _id: { $in: recycleBinIds.map(id => new ObjectId(id)) },
      canRestore: true
    }).toArray();

    for (const item of items) {
      const hasAccess = await verifyClientAccess(req.user.userId, item.clientId.toString());
      if (!hasAccess) {
        return res.status(403).json({
          error: `Access denied to file: ${item.fileName}`
        });
      }
    }

    const result = await recycleBinService.permanentlyDeleteItems(recycleBinIds, {
      userId: req.user.userId,
      reason: 'bulk_user_request'
    });

    res.json({
      success: true,
      message: 'Files permanently deleted',
      ...result
    });

  } catch (error) {
    console.error('Error in bulk permanent delete:', error);
    res.status(500).json({
      error: 'Failed to permanently delete files',
      details: error.message
    });
  }
});

/**
 * Get recycle bin summary
 * GET /api/recycle-bin/summary
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!recycleBinService) {
      return res.status(503).json({
        error: 'RecycleBin service not available'
      });
    }

    let summaries = [];

    if (clientId) {
      // Single client summary
      const hasAccess = await verifyClientAccess(req.user.userId, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this client'
        });
      }

      const summary = await recycleBinService.getRecycleBinSummary(clientId);
      summaries.push({ clientId, ...summary });

    } else {
      // All accessible clients
      const userClients = await getUserAccessibleClients(req.user.userId);
      
      for (const client of userClients) {
        try {
          const summary = await recycleBinService.getRecycleBinSummary(client._id.toString());
          summaries.push({ 
            clientId: client._id.toString(), 
            clientName: client.name,
            ...summary 
          });
        } catch (error) {
          console.warn(`Failed to get summary for client ${client._id}:`, error.message);
        }
      }
    }

    // Calculate overall totals
    const overallSummary = summaries.reduce((acc, summary) => {
      acc.totalFiles += summary.totalFiles || 0;
      acc.totalSize += summary.totalSize || 0;
      acc.fileCount += summary.fileCount || 0;
      acc.folderCount += summary.folderCount || 0;
      return acc;
    }, { totalFiles: 0, totalSize: 0, fileCount: 0, folderCount: 0 });

    res.json({
      success: true,
      summaries,
      overallSummary: {
        ...overallSummary,
        totalSizeFormatted: recycleBinService.formatFileSize(overallSummary.totalSize)
      }
    });

  } catch (error) {
    console.error('Error getting recycle bin summary:', error);
    res.status(500).json({
      error: 'Failed to get recycle bin summary',
      details: error.message
    });
  }
});

// Helper functions (implement based on your user/client system)

async function getUserAccessibleClients(userId) {
  // Implement based on your user permission system
  // Return array of client objects user has access to
  try {
    // Get database connection using existing method
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    const db = client.db(process.env.DB_NAME || 'projectManager');
    
    const clients = await db.collection('clients')
      .find({ 
        $or: [
          { userId: new ObjectId(userId) },
          { 'permissions.userId': new ObjectId(userId) }
        ]
      })
      .toArray();
      
    return clients;
  } catch (error) {
    console.error('Error getting user accessible clients:', error);
    return [];
  }
}

async function verifyClientAccess(userId, clientId) {
  // Implement based on your user permission system
  // Return true if user has access to client
  try {
    const userClients = await getUserAccessibleClients(userId);
    return userClients.some(client => client._id.toString() === clientId);
  } catch (error) {
    console.error('Error verifying client access:', error);
    return false;
  }
}

module.exports = {
  router,
  initializeRecycleBinRoutes
};