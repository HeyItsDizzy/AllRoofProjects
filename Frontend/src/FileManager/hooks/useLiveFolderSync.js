// useLiveFolderSync.js - Hook for 2-way live folder synchronization
import { useEffect, useRef } from 'react';
import { socketManager } from '../utils/socketManager';

export const useLiveFolderSync = ({ 
  projectId, 
  projectName = 'Unknown Project',
  onFolderChange, 
  enabled = true 
}) => {
  const isConnectedRef = useRef(false);
  const unsubscribeRef = useRef(null);
  const onFolderChangeRef = useRef(onFolderChange);

  // Update callback ref when it changes, but don't trigger reconnection
  useEffect(() => {
    onFolderChangeRef.current = onFolderChange;
  }, [onFolderChange]);

  useEffect(() => {
    if (!enabled || !projectId) return;

    // console.log(`🔄 useLiveFolderSync: Setting up for project "${projectName}"`);

    // Wrapper function that uses the ref
    const handleFolderChange = (changeData) => {
      if (onFolderChangeRef.current) {
        onFolderChangeRef.current(changeData);
      }
    };

    // Subscribe to socket events
    socketManager.subscribe(projectId, handleFolderChange, projectName)
      .then(unsubscribeFunction => {
        unsubscribeRef.current = unsubscribeFunction;
        isConnectedRef.current = true;
        // console.log(`✅ useLiveFolderSync: Successfully subscribed to project "${projectName}"`);
      })
      .catch(error => {
        console.error(`❌ useLiveFolderSync: Failed to subscribe to project "${projectName}":`, error);
        isConnectedRef.current = false;
      });

    // Cleanup on unmount or dependency change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        isConnectedRef.current = false;
        // console.log(`🔌 useLiveFolderSync: Unsubscribed from project "${projectName}"`);
      }
    };
  }, [projectId, projectName, enabled]); // Remove onFolderChange from dependencies

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
