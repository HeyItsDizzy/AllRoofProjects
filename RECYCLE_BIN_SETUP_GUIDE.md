# 🗑️ RecycleBin System - Complete Setup Guide

## Overview

Your online RecycleBin system is now ready! It provides:

- **7-day retention** or **2GB storage limit** (whichever hits first)
- **Automatic file detection** when deleted directly from disk
- **Client-filtered recovery** page with restore capabilities
- **Real-time notifications** via Socket.IO
- **Automatic cleanup** with configurable scheduling

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   File System  │───▶│   Disk Watcher   │───▶│  RecycleBin     │
│   (Deletions)   │    │   (Chokidar)     │    │   Service       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Deletions  │───▶│   Socket Events  │───▶│   MongoDB       │
│   (User Action) │    │   (Real-time)    │    │   Collection    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 📁 File Structure Created

```
Backend/
├── config/
│   └── recycleBinSchema.js          # Database schema & config
├── services/
│   └── RecycleBinService.js         # Core recycle bin logic
├── routes/
│   └── recycleBinRoutes.js          # API endpoints
├── features/fileManager/services/
│   └── diskWatcher.js               # Enhanced with RecycleBin
└── recycleBinIntegration.js         # Setup & initialization

Frontend/
├── src/
│   ├── pages/
│   │   ├── RecycleBinPage.jsx       # Recovery page
│   │   └── RecycleBinPage.css       # Styling
│   ├── components/
│   │   ├── RecycleBinNotifications.jsx  # Real-time notifications
│   │   └── RecycleBinNotifications.css  # Notification styling
│   └── hooks/
│       └── useRecycleBinSocket.js   # Socket integration hook
```

---

## 🚀 Integration Steps

### 1. Backend Integration

In your main `app.js` or `server.js`:

```javascript
const express = require('express');
const http = require('http');
const { MongoClient } = require('mongodb');
const { createSocketIO } = require('./features/socketApp/socketApp');
const { initializeRecycleBinSystem } = require('./recycleBinIntegration');
const { router: recycleBinRoutes } = require('./routes/recycleBinRoutes');

const app = express();
const server = http.createServer(app);

async function startServer() {
  // Connect to database
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  // Create Socket.IO instance
  const io = createSocketIO(server);

  // Initialize RecycleBin system
  const recycleBinService = await initializeRecycleBinSystem(db, io);
  console.log('✅ RecycleBin system initialized');

  // Mount API routes
  app.use('/api/recycle-bin', recycleBinRoutes);

  // Your other middleware and routes...

  server.listen(process.env.PORT, () => {
    console.log('🚀 Server running with RecycleBin system');
  });
}

startServer().catch(console.error);
```

### 2. Environment Configuration

Add to your `.env` file:

```env
# RecycleBin Configuration
RECYCLE_BIN_PATH=./storage/recycle_bin
ENABLE_WATCHERS=true

# MongoDB (if not already configured)
MONGODB_URI=mongodb://localhost:27017/your-database
```

### 3. Frontend Integration

#### Add RecycleBin Page to Router

```javascript
// In your router configuration
import RecycleBinPage from '@/pages/RecycleBinPage';

const routes = [
  // ... your existing routes
  {
    path: '/recycle-bin',
    element: <RecycleBinPage />,
    meta: { requiresAuth: true }
  }
];
```

#### Add to Navigation Menu

```javascript
// In your navigation component
import { DeleteOutlined } from '@ant-design/icons';

const menuItems = [
  // ... your existing menu items
  {
    key: 'recycle-bin',
    icon: <DeleteOutlined />,
    label: 'Recycle Bin',
    path: '/recycle-bin'
  }
];
```

#### Add Notifications to Header/Navbar

```javascript
// In your header component
import RecycleBinNotifications from '@/components/RecycleBinNotifications';

const Header = () => {
  return (
    <div className="header">
      {/* Your existing header content */}
      
      <div className="header-actions">
        <RecycleBinNotifications />
        {/* Other notification buttons */}
      </div>
    </div>
  );
};
```

---

## 🔧 Configuration Options

### Storage Limits

Edit `Backend/config/recycleBinSchema.js`:

```javascript
const recycleBinConfig = {
  maxRetentionDays: 7,     // Keep files for 7 days
  maxTotalSize: 2 * 1024 * 1024 * 1024, // 2GB total
  maxFileSize: 100 * 1024 * 1024,        // 100MB per file
  cleanupSchedule: '0 2 * * *',          // Daily at 2 AM
};
```

### File Type Restrictions

```javascript
const recycleBinConfig = {
  // Don't recycle these file types
  excludedExtensions: ['.tmp', '.log', '.cache', '.lock'],
};
```

### Storage Organization

```javascript
const recycleBinConfig = {
  // Options: 'date_client', 'client_date', 'flat'
  folderStructure: 'date_client',
  
  // Physical structure: /recycle_bin/2025/10/13/client_123/
};
```

---

## 🎯 Features & Usage

### 1. Automatic File Detection

When files are deleted directly from the filesystem:

```bash
# These actions will be detected automatically:
rm /path/to/project/file.pdf
rm -rf /path/to/project/folder/
```

The system will:
- Move files to recycle bin
- Preserve metadata and permissions  
- Send real-time notifications
- Generate thumbnails for images/PDFs

### 2. User Interface Deletions

In your existing file management components:

```javascript
// Instead of permanent deletion
const handleDelete = async (filePath) => {
  try {
    const response = await axiosSecure.post('/api/recycle-bin/delete', {
      filePath: filePath,
      clientId: selectedClient.id,
      projectId: currentProject.id,
      deletionReason: 'user_action'
    });
    
    if (response.data.success) {
      message.success('File moved to recycle bin');
      // File will appear in RecycleBin page for recovery
    }
  } catch (error) {
    message.error('Failed to delete file');
  }
};
```

### 3. Recovery Operations

Users can:
- **View all deleted files** filtered by client
- **Search** by filename or path
- **Sort** by deletion date, size, type
- **Restore individual files** to original location
- **Bulk restore** multiple files
- **Permanently delete** files immediately
- **Preview** images and PDFs before restoring

### 4. Real-time Notifications

The system provides live updates for:
- Files moved to recycle bin (external deletions)
- Files restored by other users
- Automatic cleanup events
- Storage limit warnings

---

## 🔒 Security & Permissions

### Client Access Control

The system respects your existing user permissions:

```javascript
// Users only see files from their accessible clients
const userClients = await getUserAccessibleClients(userId);

// All operations are filtered by client access
const hasAccess = await verifyClientAccess(userId, clientId);
```

### Audit Trail

Every operation is logged:

```javascript
{
  auditLog: [{
    action: 'deleted',        // 'deleted', 'restored', 'permanently_deleted'
    timestamp: new Date(),
    userId: ObjectId,
    details: 'User action: bulk delete'
  }]
}
```

---

## 📊 Monitoring & Maintenance

### Automatic Cleanup

The system runs daily cleanup at 2 AM:

- Removes files older than 7 days
- Frees space when approaching 2GB limit
- Logs all cleanup activities
- Sends notifications about cleanup events

### Storage Monitoring

Users see storage usage in the RecycleBin page:

- Current usage vs. 2GB limit
- Progress bar with warnings
- Per-client breakdown
- Recommendations to free space

### Database Indexes

Optimized indexes for performance:

```javascript
// Query performance indexes created automatically
{ clientId: 1, canRestore: 1, deletedAt: -1 }  // Client queries
{ expiresAt: 1, canRestore: 1 }                // Cleanup queries  
{ fileName: "text", originalPath: "text" }      // Search queries
```

---

## 🧪 Testing Your Setup

### 1. Test File System Detection

```bash
# Create test file and delete it
mkdir -p /path/to/your/uploads/test_client/test_project
echo "test content" > /path/to/your/uploads/test_client/test_project/test.txt
rm /path/to/your/uploads/test_client/test_project/test.txt

# Check if it appears in RecycleBin page
```

### 2. Test API Endpoints

```bash
# Get recycle bin items
curl -X GET "http://localhost:3000/api/recycle-bin/items" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Restore file
curl -X POST "http://localhost:3000/api/recycle-bin/restore/RECYCLE_BIN_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Test Socket Events

Open browser console in your app:

```javascript
// Should see RecycleBin socket events
// ♻️ RecycleBin Socket connected: abc123
// ♻️ File moved to recycle bin: {...}
```

---

## 🔧 Troubleshooting

### Common Issues

1. **Files not appearing in recycle bin**
   - Check `ENABLE_WATCHERS=true` in environment
   - Verify file paths are within watched directories
   - Check disk watcher is running: logs should show "👀 Now watching..."

2. **Socket events not working**
   - Verify Socket.IO connection in browser console
   - Check server logs for socket initialization
   - Ensure user is authenticated for socket events

3. **Storage limit issues**
   - Check available disk space in `RECYCLE_BIN_PATH`
   - Verify MongoDB has space for metadata
   - Run manual cleanup if needed

### Manual Cleanup

If needed, trigger cleanup manually:

```javascript
// In your backend console or admin route
const recycleBinService = // your instance
await recycleBinService.performAutomaticCleanup();
```

---

## 🎉 You're All Set!

Your RecycleBin system is now fully operational with:

✅ **7-day retention** with 2GB limit  
✅ **Automatic file system detection**  
✅ **Client-filtered recovery page**  
✅ **Real-time notifications**  
✅ **Secure access control**  
✅ **Automatic cleanup**  

Files deleted by accident (by you or clients) will be safely stored for recovery, and the system will automatically manage storage limits and cleanup expired files.

Navigate to `/recycle-bin` in your app to see the recovery page in action!

---

## 🔮 Future Enhancements

Consider adding:
- **File preview modal** for images/PDFs
- **Bulk operations** via API
- **Email notifications** for critical deletions
- **Advanced search filters** (date range, file type)
- **Export deleted file lists** for compliance
- **Integration with cloud storage** for backup

The foundation is built for easy extension of these features!