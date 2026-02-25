const fs = require('fs').promises;
const path = require('path');
const { ObjectId } = require('mongodb');
const cron = require('node-cron');
const sharp = require('sharp'); // For image thumbnails
const { recycleBinConfig } = require('../config/recycleBinSchema');

class RecycleBinService {
  constructor(db, io, logger) {
    this.db = db;
    this.io = io; // Socket.io instance
    this.logger = logger;
    this.config = recycleBinConfig;
    
    // Initialize collection - will be created automatically when first document is inserted
    this.collection = null;
    this.initializeCollection();
    
    // Ensure collection and indexes are ready (but don't block constructor)
    this.ensureCollectionAndIndexes().catch(err => 
      console.warn('⚠️ RecycleBin collection setup warning:', err.message)
    );
    
    // Initialize cleanup scheduler
    this.initializeCleanupScheduler();
    
    // Ensure recycle bin directory exists
    this.ensureRecycleBinDirectory();
  }

  /**
   * Initialize the recycleBin collection
   */
  async initializeCollection() {
    try {
      if (this.db) {
        this.collection = this.db.collection('recycleBin');
        console.log('♻️ RecycleBin collection initialized (will be created on first use)');
      }
    } catch (error) {
      console.warn('⚠️ RecycleBin collection initialization warning:', error.message);
    }
  }

  /**
   * Ensure collection exists and create indexes if needed
   */
  async ensureCollectionAndIndexes() {
    try {
      if (!this.collection) {
        await this.initializeCollection();
      }

      // Check if collection exists by trying to get stats
      const collections = await this.db.listCollections({ name: 'recycleBin' }).toArray();
      
      if (collections.length === 0) {
        console.log('📊 RecycleBin collection will be created on first document insert');
      } else {
        // Collection exists, let's check if indexes exist
        const indexes = await this.collection.indexes();
        if (indexes.length <= 1) { // Only _id index exists
          console.log('📊 Creating RecycleBin indexes...');
          await this.createIndexes();
        }
      }
    } catch (error) {
      console.warn('⚠️ Error ensuring RecycleBin collection and indexes:', error.message);
    }
  }

  /**
   * Create database indexes for better performance
   */
  async createIndexes() {
    try {
      const indexes = [
        { clientId: 1, canRestore: 1, deletedAt: -1 },
        { expiresAt: 1, canRestore: 1 },
        { deletedBy: 1, deletedAt: -1 },
        { projectId: 1, canRestore: 1, deletedAt: -1 }
      ];

      for (const index of indexes) {
        await this.collection.createIndex(index);
      }

      // Text index for file search
      await this.collection.createIndex(
        { fileName: "text", originalPath: "text" },
        { name: "file_search_text" }
      );

      console.log('📊 RecycleBin indexes created successfully');
    } catch (error) {
      console.warn('⚠️ Some RecycleBin indexes could not be created:', error.message);
    }
  }

  /**
   * Initialize automatic cleanup scheduler
   */
  initializeCleanupScheduler() {
    cron.schedule(this.config.cleanupSchedule, async () => {
      try {
        await this.performAutomaticCleanup();
      } catch (error) {
        this.logger.error('Recycle bin cleanup failed:', error);
      }
    });
    
    this.logger.info('RecycleBin cleanup scheduler initialized');
  }

  /**
   * Ensure recycle bin base directory exists
   */
  async ensureRecycleBinDirectory() {
    try {
      await fs.access(this.config.recycleBinBasePath);
    } catch (error) {
      await fs.mkdir(this.config.recycleBinBasePath, { recursive: true });
      this.logger.info('Created recycle bin directory:', this.config.recycleBinBasePath);
    }
  }

  /**
   * Soft delete a file/folder (move to recycle bin)
   * @param {string} originalPath - Original file/folder path
   * @param {Object} context - Deletion context
   */
  async deleteFileToRecycleBin(originalPath, context) {
    try {
      const {
        clientId,
        projectId,
        userId,
        deletedBy,
        deletionReason = 'user_action',
        deletionMethod = 'ui_delete'
      } = context;

      // Check if file exists
      const stats = await fs.stat(originalPath);
      const isDirectory = stats.isDirectory();
      
      // Generate recycle bin path
      const recycleBinPath = await this.generateRecycleBinPath(originalPath, clientId);
      
      // Create metadata
      const recycleBinItem = {
        originalPath: originalPath,
        fileName: path.basename(originalPath),
        fileType: isDirectory ? 'folder' : 'file',
        fileExtension: isDirectory ? null : path.extname(originalPath),
        fileSize: await this.calculateSize(originalPath),
        mimeType: isDirectory ? null : this.getMimeType(originalPath),
        
        clientId: new ObjectId(clientId),
        projectId: projectId ? new ObjectId(projectId) : null,
        userId: new ObjectId(userId),
        
        deletedAt: new Date(),
        deletedBy: new ObjectId(deletedBy),
        deletionReason: deletionReason,
        deletionMethod: deletionMethod,
        
        recycleBinPath: recycleBinPath,
        recycleBinFolder: this.getRecycleBinFolder(clientId),
        
        canRestore: true,
        expiresAt: new Date(Date.now() + this.config.maxRetentionDays * 24 * 60 * 60 * 1000),
        
        metadata: {
          previewAvailable: this.canGeneratePreview(originalPath),
          originalPermissions: stats.mode,
          tags: [],
          notes: ''
        },
        
        auditLog: [{
          action: 'deleted',
          timestamp: new Date(),
          userId: new ObjectId(deletedBy),
          details: `Deleted via ${deletionMethod}: ${deletionReason}`
        }],
        
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Check storage limits before proceeding
      const canProceed = await this.checkStorageLimits(recycleBinItem.fileSize);
      if (!canProceed) {
        throw new Error('Recycle bin storage limit exceeded. Please empty recycle bin or contact administrator.');
      }

      // Move file to recycle bin
      await this.moveToRecycleBin(originalPath, recycleBinPath);
      
      // Generate thumbnail if applicable
      if (this.canGeneratePreview(originalPath) && !isDirectory) {
        try {
          const thumbnailPath = await this.generateThumbnail(recycleBinPath, clientId);
          recycleBinItem.metadata.thumbnailPath = thumbnailPath;
        } catch (error) {
          this.logger.warn('Failed to generate thumbnail:', error.message);
        }
      }
      
      // Save to database
      const result = await this.collection.insertOne(recycleBinItem);
      
      // Emit socket event
      this.emitRecycleBinEvent('file_deleted', {
        recycleBinId: result.insertedId,
        clientId: clientId,
        fileName: recycleBinItem.fileName,
        fileType: recycleBinItem.fileType,
        deletedBy: deletedBy
      });
      
      this.logger.info(`File moved to recycle bin: ${originalPath} -> ${recycleBinPath}`);
      
      return {
        success: true,
        recycleBinId: result.insertedId,
        recycleBinPath: recycleBinPath,
        expiresAt: recycleBinItem.expiresAt
      };
      
    } catch (error) {
      this.logger.error('Failed to move file to recycle bin:', error);
      throw error;
    }
  }

  /**
   * Restore a file from recycle bin
   * @param {string} recycleBinId - ID of item in recycle bin
   * @param {Object} context - Restoration context
   */
  async restoreFileFromRecycleBin(recycleBinId, context) {
    try {
      const { userId, restorePath = null } = context;
      
      // Get item from recycle bin
      const item = await this.collection.findOne({
        _id: new ObjectId(recycleBinId),
        canRestore: true
      });
      
      if (!item) {
        throw new Error('File not found in recycle bin or cannot be restored');
      }
      
      // Determine restoration path
      const targetPath = restorePath || item.originalPath;
      
      // Check if target path is available
      try {
        await fs.access(targetPath);
        // File exists, need to generate new name
        const newPath = await this.generateUniqueRestorePath(targetPath);
        await this.restoreFile(item.recycleBinPath, newPath);
      } catch (error) {
        // Path is free, restore to original location
        await this.restoreFile(item.recycleBinPath, targetPath);
      }
      
      // Update database record
      await this.collection.updateOne(
        { _id: new ObjectId(recycleBinId) },
        {
          $set: {
            restoredAt: new Date(),
            restoredBy: new ObjectId(userId),
            canRestore: false,
            updatedAt: new Date()
          },
          $push: {
            auditLog: {
              action: 'restored',
              timestamp: new Date(),
              userId: new ObjectId(userId),
              details: `Restored to: ${targetPath}`
            }
          }
        }
      );
      
      // Clean up thumbnail
      if (item.metadata.thumbnailPath) {
        try {
          await fs.unlink(item.metadata.thumbnailPath);
        } catch (error) {
          // Ignore thumbnail cleanup errors
        }
      }
      
      // Emit socket event
      this.emitRecycleBinEvent('file_restored', {
        recycleBinId: recycleBinId,
        clientId: item.clientId.toString(),
        fileName: item.fileName,
        restoredPath: targetPath,
        restoredBy: userId
      });
      
      this.logger.info(`File restored from recycle bin: ${item.recycleBinPath} -> ${targetPath}`);
      
      return {
        success: true,
        restoredPath: targetPath,
        originalPath: item.originalPath
      };
      
    } catch (error) {
      this.logger.error('Failed to restore file from recycle bin:', error);
      throw error;
    }
  }

  /**
   * Get recycle bin items for a client
   * @param {string} clientId - Client ID
   * @param {Object} options - Query options
   */
  async getRecycleBinItems(clientId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        fileType = null,
        sortBy = 'deletedAt',
        sortOrder = -1,
        search = ''
      } = options;
      
      const query = {
        clientId: new ObjectId(clientId),
        canRestore: true
      };
      
      if (fileType) {
        query.fileType = fileType;
      }
      
      if (search) {
        query.$or = [
          { fileName: { $regex: search, $options: 'i' } },
          { originalPath: { $regex: search, $options: 'i' } }
        ];
      }
      
      const skip = (page - 1) * limit;
      
      const items = await this.collection
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      const total = await this.collection.countDocuments(query);
      
      // Add computed fields
      const enhancedItems = items.map(item => ({
        ...item,
        daysUntilExpiry: Math.ceil((item.expiresAt - new Date()) / (24 * 60 * 60 * 1000)),
        sizeFormatted: this.formatFileSize(item.fileSize),
        canPreview: item.metadata.previewAvailable
      }));
      
      return {
        items: enhancedItems,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: Math.ceil(total / limit)
        },
        summary: await this.getRecycleBinSummary(clientId)
      };
      
    } catch (error) {
      this.logger.error('Failed to get recycle bin items:', error);
      throw error;
    }
  }

  /**
   * Get recycle bin summary for a client
   * @param {string} clientId - Client ID
   */
  async getRecycleBinSummary(clientId) {
    try {
      const pipeline = [
        {
          $match: {
            clientId: new ObjectId(clientId),
            canRestore: true
          }
        },
        {
          $group: {
            _id: null,
            totalFiles: { $sum: 1 },
            totalSize: { $sum: '$fileSize' },
            fileCount: {
              $sum: { $cond: [{ $eq: ['$fileType', 'file'] }, 1, 0] }
            },
            folderCount: {
              $sum: { $cond: [{ $eq: ['$fileType', 'folder'] }, 1, 0] }
            },
            oldestItem: { $min: '$deletedAt' },
            newestItem: { $max: '$deletedAt' }
          }
        }
      ];
      
      const result = await this.collection.aggregate(pipeline).toArray();
      
      if (result.length === 0) {
        return {
          totalFiles: 0,
          totalSize: 0,
          totalSizeFormatted: '0 B',
          fileCount: 0,
          folderCount: 0,
          oldestItem: null,
          newestItem: null
        };
      }
      
      const summary = result[0];
      summary.totalSizeFormatted = this.formatFileSize(summary.totalSize);
      
      return summary;
      
    } catch (error) {
      this.logger.error('Failed to get recycle bin summary:', error);
      throw error;
    }
  }

  /**
   * Permanently delete items from recycle bin
   * @param {Array} recycleBinIds - Array of recycle bin item IDs
   * @param {Object} context - Deletion context
   */
  async permanentlyDeleteItems(recycleBinIds, context) {
    try {
      const { userId, reason = 'manual' } = context;
      
      const items = await this.collection.find({
        _id: { $in: recycleBinIds.map(id => new ObjectId(id)) },
        canRestore: true
      }).toArray();
      
      let deletedCount = 0;
      let totalSizeFreed = 0;
      
      for (const item of items) {
        try {
          // Delete physical file
          await fs.rm(item.recycleBinPath, { recursive: true, force: true });
          
          // Delete thumbnail if exists
          if (item.metadata.thumbnailPath) {
            try {
              await fs.unlink(item.metadata.thumbnailPath);
            } catch (error) {
              // Ignore thumbnail errors
            }
          }
          
          // Update database record
          await this.collection.updateOne(
            { _id: item._id },
            {
              $set: {
                canRestore: false,
                permanentlyDeletedAt: new Date(),
                updatedAt: new Date()
              },
              $push: {
                auditLog: {
                  action: 'permanently_deleted',
                  timestamp: new Date(),
                  userId: new ObjectId(userId),
                  details: `Permanently deleted: ${reason}`
                }
              }
            }
          );
          
          deletedCount++;
          totalSizeFreed += item.fileSize;
          
        } catch (error) {
          this.logger.warn(`Failed to permanently delete item ${item._id}:`, error);
        }
      }
      
      // Emit socket event
      this.emitRecycleBinEvent('items_permanently_deleted', {
        deletedCount: deletedCount,
        totalSizeFreed: totalSizeFreed,
        deletedBy: userId
      });
      
      return {
        success: true,
        deletedCount: deletedCount,
        totalSizeFreed: totalSizeFreed,
        totalSizeFreedFormatted: this.formatFileSize(totalSizeFreed)
      };
      
    } catch (error) {
      this.logger.error('Failed to permanently delete items:', error);
      throw error;
    }
  }

  /**
   * Perform automatic cleanup based on time and size limits
   */
  async performAutomaticCleanup() {
    try {
      this.logger.info('Starting automatic recycle bin cleanup...');
      
      const now = new Date();
      let cleanupCount = 0;
      let sizeFreed = 0;
      
      // 1. Clean up expired items (older than 7 days)
      const expiredItems = await this.collection.find({
        canRestore: true,
        expiresAt: { $lt: now }
      }).toArray();
      
      for (const item of expiredItems) {
        try {
          await fs.rm(item.recycleBinPath, { recursive: true, force: true });
          
          if (item.metadata.thumbnailPath) {
            try {
              await fs.unlink(item.metadata.thumbnailPath);
            } catch (error) {
              // Ignore
            }
          }
          
          await this.collection.updateOne(
            { _id: item._id },
            {
              $set: {
                canRestore: false,
                permanentlyDeletedAt: now,
                cleanupReason: 'time_limit'
              }
            }
          );
          
          cleanupCount++;
          sizeFreed += item.fileSize;
          
        } catch (error) {
          this.logger.warn(`Failed to cleanup expired item ${item._id}:`, error);
        }
      }
      
      // 2. Check size limit and clean oldest items if needed
      const totalSize = await this.getTotalRecycleBinSize();
      
      if (totalSize > this.config.maxTotalSize) {
        const excessSize = totalSize - this.config.maxTotalSize;
        const oldestItems = await this.collection.find({
          canRestore: true
        }).sort({ deletedAt: 1 }).toArray();
        
        let sizeCleaned = 0;
        
        for (const item of oldestItems) {
          if (sizeCleaned >= excessSize) break;
          
          try {
            await fs.rm(item.recycleBinPath, { recursive: true, force: true });
            
            if (item.metadata.thumbnailPath) {
              try {
                await fs.unlink(item.metadata.thumbnailPath);
              } catch (error) {
                // Ignore
              }
            }
            
            await this.collection.updateOne(
              { _id: item._id },
              {
                $set: {
                  canRestore: false,
                  permanentlyDeletedAt: now,
                  cleanupReason: 'size_limit'
                }
              }
            );
            
            cleanupCount++;
            sizeFreed += item.fileSize;
            sizeCleaned += item.fileSize;
            
          } catch (error) {
            this.logger.warn(`Failed to cleanup oversized item ${item._id}:`, error);
          }
        }
      }
      
      this.logger.info(`Recycle bin cleanup completed: ${cleanupCount} items, ${this.formatFileSize(sizeFreed)} freed`);
      
      // Emit cleanup event
      this.emitRecycleBinEvent('cleanup_completed', {
        cleanupCount: cleanupCount,
        sizeFreed: sizeFreed
      });
      
      return {
        cleanupCount: cleanupCount,
        sizeFreed: sizeFreed
      };
      
    } catch (error) {
      this.logger.error('Automatic cleanup failed:', error);
      throw error;
    }
  }

  // Helper methods
  
  /**
   * Generate unique recycle bin path
   */
  async generateRecycleBinPath(originalPath, clientId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const folderPath = path.join(
      this.config.recycleBinBasePath,
      String(year),
      month,
      day,
      `client_${clientId}`
    );
    
    await fs.mkdir(folderPath, { recursive: true });
    
    const fileName = path.basename(originalPath);
    const timestamp = now.getTime();
    const uniqueFileName = `${timestamp}_${fileName}`;
    
    return path.join(folderPath, uniqueFileName);
  }

  /**
   * Get recycle bin folder for organization
   */
  getRecycleBinFolder(clientId) {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/client_${clientId}`;
  }

  /**
   * Move file to recycle bin
   */
  async moveToRecycleBin(sourcePath, recycleBinPath) {
    const targetDir = path.dirname(recycleBinPath);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.rename(sourcePath, recycleBinPath);
  }

  /**
   * Restore file from recycle bin
   */
  async restoreFile(recycleBinPath, targetPath) {
    const targetDir = path.dirname(targetPath);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.rename(recycleBinPath, targetPath);
  }

  /**
   * Calculate file/folder size
   */
  async calculateSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        return stats.size;
      }
      
      if (stats.isDirectory()) {
        let totalSize = 0;
        const files = await fs.readdir(filePath);
        
        for (const file of files) {
          const fullPath = path.join(filePath, file);
          totalSize += await this.calculateSize(fullPath);
        }
        
        return totalSize;
      }
      
      return 0;
      
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get total recycle bin size
   */
  async getTotalRecycleBinSize() {
    const result = await this.collection.aggregate([
      { $match: { canRestore: true } },
      { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
    ]).toArray();
    
    return result.length > 0 ? result[0].totalSize : 0;
  }

  /**
   * Check if can generate preview
   */
  canGeneratePreview(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const pdfExts = ['.pdf'];
    
    return imageExts.includes(ext) || pdfExts.includes(ext);
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(filePath, clientId) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const thumbnailDir = path.join(this.config.recycleBinBasePath, 'thumbnails', `client_${clientId}`);
      await fs.mkdir(thumbnailDir, { recursive: true });
      
      const thumbnailPath = path.join(thumbnailDir, `${Date.now()}_thumb.jpg`);
      
      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
        await sharp(filePath)
          .resize(200, 200, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);
        
        return thumbnailPath;
      }
      
      return null;
      
    } catch (error) {
      this.logger.warn('Thumbnail generation failed:', error);
      return null;
    }
  }

  /**
   * Check storage limits
   */
  async checkStorageLimits(newFileSize) {
    const currentSize = await this.getTotalRecycleBinSize();
    return (currentSize + newFileSize) <= this.config.maxTotalSize;
  }

  /**
   * Generate unique restore path if original is occupied
   */
  async generateUniqueRestorePath(originalPath) {
    const dir = path.dirname(originalPath);
    const name = path.basename(originalPath, path.extname(originalPath));
    const ext = path.extname(originalPath);
    
    let counter = 1;
    let newPath;
    
    do {
      newPath = path.join(dir, `${name}_restored_${counter}${ext}`);
      counter++;
      
      try {
        await fs.access(newPath);
      } catch (error) {
        // Path is free
        break;
      }
    } while (counter < 1000);
    
    return newPath;
  }

  /**
   * Get MIME type
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Emit socket event
   */
  emitRecycleBinEvent(event, data) {
    if (this.io) {
      this.io.emit('recycleBin', { event, data, timestamp: new Date() });
    }
  }
}

module.exports = RecycleBinService;