// RecycleBin Database Schema and Configuration
// Collection: recycleBin

/**
 * RecycleBin Document Structure
 * Stores metadata about deleted files for recovery and management
 */
const recycleBinSchema = {
  // Unique identifier for deleted item
  _id: "ObjectId", // MongoDB auto-generated

  // Original file/folder information
  originalPath: "String", // Full path where file was originally located
  fileName: "String", // Original filename
  fileType: "String", // 'file' or 'folder'
  fileExtension: "String", // File extension (if applicable)
  fileSize: "Number", // Size in bytes
  mimeType: "String", // MIME type for files

  // Client and project context
  clientId: "ObjectId", // Client who owns the file
  projectId: "ObjectId", // Project the file belongs to (if applicable)
  userId: "ObjectId", // User who deleted the file

  // Deletion metadata
  deletedAt: "Date", // When the file was deleted
  deletedBy: "ObjectId", // User ID who performed deletion
  deletionReason: "String", // 'user_action', 'direct_delete', 'cleanup', etc.
  deletionMethod: "String", // 'ui_delete', 'filesystem_watch', 'bulk_delete'

  // Recycle bin storage
  recycleBinPath: "String", // Path in recycle bin storage
  recycleBinFolder: "String", // Organized folder in recycle bin (by date/client)

  // Recovery metadata
  canRestore: "Boolean", // Whether file can still be restored
  restoredAt: "Date", // When file was restored (if applicable)
  restoredBy: "ObjectId", // User who restored the file
  permanentlyDeletedAt: "Date", // When file was permanently removed

  // Cleanup tracking
  expiresAt: "Date", // When file will be auto-deleted (7 days from deletion)
  cleanupReason: "String", // 'time_limit', 'size_limit', 'manual'

  // Additional metadata
  metadata: {
    thumbnailPath: "String", // Thumbnail for images/PDFs
    previewAvailable: "Boolean", // Can generate preview
    originalPermissions: "Object", // Original file permissions
    tags: ["String"], // File tags for organization
    notes: "String" // Additional notes about deletion
  },

  // Audit trail
  auditLog: [{
    action: "String", // 'deleted', 'restored', 'permanently_deleted'
    timestamp: "Date",
    userId: "ObjectId",
    details: "String"
  }],

  // System fields
  createdAt: "Date",
  updatedAt: "Date"
};

/**
 * RecycleBin Configuration
 */
const recycleBinConfig = {
  // Storage limits
  maxRetentionDays: 7, // Keep files for 7 days
  maxTotalSize: 2 * 1024 * 1024 * 1024, // 2GB total storage
  maxFileSize: 100 * 1024 * 1024, // 100MB per file

  // Storage paths
  recycleBinBasePath: process.env.RECYCLE_BIN_PATH || './storage/recycle_bin',
  
  // Organization structure: /recycle_bin/YYYY/MM/DD/clientId/
  folderStructure: 'date_client', // 'date_client', 'client_date', 'flat'

  // Cleanup settings
  cleanupSchedule: '0 2 * * *', // Run cleanup at 2 AM daily
  batchSize: 100, // Process files in batches
  
  // File type restrictions
  excludedExtensions: ['.tmp', '.log', '.cache'], // Don't recycle these
  
  // Recovery settings
  allowBulkRestore: true,
  requireConfirmation: true,
  notifyOnRestore: true
};

/**
 * Database Indexes for Performance
 */
const recycleBinIndexes = [
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
  
  // File search
  { fileName: "text", originalPath: "text" },
  
  // Audit trail
  { "auditLog.timestamp": -1 }
];

/**
 * RecycleBin Storage Structure
 * Physical file organization in filesystem
 */
const storageStructure = `
recycle_bin/
├── 2025/
│   ├── 10/
│   │   ├── 13/
│   │   │   ├── client_123/
│   │   │   │   ├── project_456_roof_plan.pdf
│   │   │   │   ├── image_gallery_789/
│   │   │   │   └── metadata.json
│   │   │   └── client_124/
│   │   └── 14/
│   └── 11/
├── thumbnails/
│   ├── client_123/
│   └── client_124/
└── cleanup_logs/
    ├── 2025-10-13.log
    └── 2025-10-12.log
`;

module.exports = {
  recycleBinSchema,
  recycleBinConfig,
  recycleBinIndexes,
  storageStructure
};