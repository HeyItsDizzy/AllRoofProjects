// React hook for live folder sync
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

export const useLiveFolderSync = (projectId, onFolderChange) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create socket connection
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to Socket.io server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from Socket.io server');
    });

    // Listen for folder sync events
    newSocket.on('folder_sync', (eventInfo) => {
      console.log('Live folder sync event:', eventInfo);
      if (onFolderChange) {
        onFolderChange(eventInfo);
      }
    });

    // Subscribe to project if projectId is provided
    if (projectId) {
      newSocket.emit('subscribe_project', projectId);
      console.log('Subscribed to project:', projectId);
    }

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [projectId, onFolderChange]);

  return { socket, isConnected };
};

// Example usage in a React component:
/*
import { useLiveFolderSync } from './hooks/useLiveFolderSync';

function ProjectFolders({ projectId }) {
  const [folders, setFolders] = useState([]);

  const handleFolderChange = (eventInfo) => {
    // Update your folder list based on the event
    if (eventInfo.actionType === 'folder added') {
      // Add new folder to your state
      setFolders(prev => [...prev, eventInfo.folderOrFileName]);
    } else if (eventInfo.actionType === 'folder removed') {
      // Remove folder from your state
      setFolders(prev => prev.filter(f => f !== eventInfo.folderOrFileName));
    }
  };

  const { isConnected } = useLiveFolderSync(projectId, handleFolderChange);

  return (
    <div>
      <div>Connection: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <ul>
        {folders.map(folder => <li key={folder}>{folder}</li>)}
      </ul>
    </div>
  );
}
*/
