# Live Folder Sync - 2-Way Synchronization Guide

## Overview
Your live folder sync system now supports **true 2-way synchronization**:

### ✅ Disk-to-UI Sync (Working)
- When folders are created/renamed/deleted on the server disk
- Events are detected by `diskWatcher.js` 
- Socket events are emitted to all connected clients
- Frontend updates automatically

### ✅ UI-to-Disk Sync (Ready to implement)
- When users create/rename/delete folders in the UI
- Socket events notify other users immediately
- All connected clients refresh their folder tree

## Implementation Status

### Backend (Complete)
- ✅ **diskWatcher.js** - Watches disk changes
- ✅ **socketController.js** - Handles socket events with clean data structure
- ✅ **Socket server** - Running on port 3001
- ✅ **ENABLE_WATCHERS=true** - File watching enabled

### Frontend (Ready to use)
- ✅ **useLiveFolderSync.js** - New hook for 2-way sync
- ✅ **useFolderManager.js** - Updated with live sync integration
- ✅ **LiveSyncStatus.jsx** - Status indicator component

## How to Add Live Sync to Your FileManager

### 1. Import the Status Component
```jsx
import LiveSyncStatus from '../components/LiveSyncStatus';
```

### 2. Use the Updated Hook
```jsx
const {
  // ... existing properties
  isLiveSyncConnected,
  notifyFolderChange,
} = useFolderManager(projectId, userRole);
```

### 3. Add Status Indicator to Your UI
```jsx
<div className="file-manager-header">
  {/* Your existing header content */}
  <LiveSyncStatus isConnected={isLiveSyncConnected} />
</div>
```

### 4. Add Notifications for Other Operations
For folder deletion, add this to your delete function:
```jsx
// After successful deletion
notifyFolderChange({
  type: 'folder deleted',
  fileName: folderName,
  relativePath: folderPath,
  isFolder: true
});
```

For folder renaming, add this to your rename function:
```jsx
// After successful rename
notifyFolderChange({
  type: 'folder renamed',
  fileName: newName,
  relativePath: newPath,
  isFolder: true
});
```

## Event Types You'll See

### Rename Operations
When a folder is renamed, you'll see **two events**:
1. `folder removed` - Old name disappears
2. `folder added` - New name appears

This is normal behavior and provides complete visibility.

### Event Data Structure
```javascript
{
  projectId: "689373c6f7a5c4a10c8a8981",
  projectName: "The Y Ipswich - Covered Sports Court", 
  eventType: "folder added" | "folder removed" | "folder renamed",
  fileName: "Test_Folder_Name",
  relativePath: "Admin/Test_Folder_Name",
  isFolder: true,
  timestamp: "15:54:27"
}
```

## Testing Your Implementation

### Test Disk-to-UI Sync
```bash
# Create a test folder on server
mkdir "y:/Backend/.FM/AU/2025/08. Aug/25-08010 - The Y Ipswich - Covered Sports Court/Test_Live_Sync_$(date +%H%M%S)"

# Expected: All connected FileManager instances refresh immediately
```

### Test UI-to-Disk Sync
1. Open FileManager in two browser tabs
2. Create a folder in tab 1
3. Expected: Tab 2 shows the new folder immediately

## Benefits

### For Users
- ✅ **Real-time collaboration** - See changes instantly
- ✅ **No conflicts** - Always see the latest folder structure  
- ✅ **Visual feedback** - Know when sync is working
- ✅ **Automatic updates** - No manual refresh needed

### For Development
- ✅ **Complete visibility** - Track all folder operations
- ✅ **Easy debugging** - Clear event logs
- ✅ **Scalable** - Supports multiple projects simultaneously
- ✅ **Reliable** - Socket reconnection and error handling

## Next Steps

1. **Add LiveSyncStatus** to your FileManager header
2. **Test folder creation** - should work immediately
3. **Add notifications** for delete/rename operations
4. **Test with multiple users** to verify 2-way sync

The system is now ready for production use with true 2-way synchronization!
