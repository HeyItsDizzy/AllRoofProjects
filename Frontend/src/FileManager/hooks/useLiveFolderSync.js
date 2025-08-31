// useLiveFolderSync.js - Hook for 2-way live folder synchronization
import { useEffect, useRef } from 'react';
import { socketManager } from '../utils/socketManager';

export const useLiveFolderSync = ({ 
  projectId, 
  onFolderChange, 
  enabled = true 
}) => {
  const isConnectedRef = useRef(false);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!enabled || !projectId || !onFolderChange) return;

    console.log(`� useLiveFolderSync: Setting up for project ${projectId}`);

    // Subscribe to socket events
    socketManager.subscribe(projectId, onFolderChange)
      .then(unsubscribeFunction => {
        unsubscribeRef.current = unsubscribeFunction;
        isConnectedRef.current = true;
        console.log(`✅ useLiveFolderSync: Successfully subscribed to project ${projectId}`);
      })
      .catch(error => {
        console.error(`❌ useLiveFolderSync: Failed to subscribe to project ${projectId}:`, error);
        isConnectedRef.current = false;
      });

    // Cleanup on unmount or dependency change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        isConnectedRef.current = false;
        console.log(`🔌 useLiveFolderSync: Unsubscribed from project ${projectId}`);
      }
    };
  }, [projectId, enabled, onFolderChange]);

  // Function to notify other users when current user makes changes
  const notifyFolderChange = (changeData) => {
    if (socketManager.getConnectionStatus()) {
      // Could implement UI-to-socket notifications here if needed
      console.log('📤 useLiveFolderSync: Would notify other users:', changeData);
    }
  };

  return {
    isConnected: socketManager.getConnectionStatus(),
    notifyFolderChange
  };
};
