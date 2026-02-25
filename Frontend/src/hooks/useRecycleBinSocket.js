import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import useAuth from '@/hooks/Auth/useAuth';
import { io } from 'socket.io-client';

/**
 * Custom hook for real-time RecycleBin updates via Socket.IO
 * Handles file deletions, restorations, and cleanup notifications
 */
const useRecycleBinSocket = (onUpdate = null) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();

  // Initialize socket connection
  useEffect(() => {
    if (!user?.userId) return;

    const socketInstance = io(process.env.REACT_APP_SOCKET_URL || '', {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      timeout: 20000
    });

    setSocket(socketInstance);

    // Connection events
    socketInstance.on('connect', () => {
      console.log('♻️ RecycleBin Socket connected:', socketInstance.id);
      setIsConnected(true);
      
      // Join recycle bin updates room
      socketInstance.emit('join_recycle_bin_updates', { 
        userId: user.userId,
        userRole: user.role 
      });
    });

    socketInstance.on('disconnect', () => {
      console.log('♻️ RecycleBin Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('♻️ RecycleBin Socket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user?.userId]);

  // Handle recycle bin events
  useEffect(() => {
    if (!socket || !isConnected) return;

    // General recycle bin updates (deletions, restorations, cleanup)
    const handleRecycleBinEvent = (data) => {
      console.log('♻️ RecycleBin event received:', data);
      
      const notification = {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        ...data
      };

      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50

      // Show user notifications for important events
      switch (data.event) {
        case 'file_deleted':
          message.info(`File "${data.data.fileName}" moved to recycle bin`);
          break;
          
        case 'file_restored':
          message.success(`File "${data.data.fileName}" restored successfully`);
          break;
          
        case 'items_permanently_deleted':
          if (data.data.deletedCount > 0) {
            message.warning(`${data.data.deletedCount} files permanently deleted`);
          }
          break;
          
        case 'cleanup_completed':
          if (data.data.cleanupCount > 0) {
            message.info(`Recycle bin cleanup: ${data.data.cleanupCount} expired files removed`);
          }
          break;
      }

      // Call external update handler
      if (onUpdate) {
        onUpdate(data);
      }
    };

    // File system watcher detected deletions
    const handleRecycleBinUpdate = (data) => {
      console.log('♻️ File moved to recycle bin:', data);
      
      const notification = {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        event: 'file_moved_to_recycle_bin',
        data: data
      };

      setNotifications(prev => [notification, ...prev.slice(0, 49)]);

      // Show notification for external deletions
      if (data.deletionMethod === 'filesystem_watch') {
        message.warning({
          content: `File "${data.fileName}" was deleted externally and moved to recycle bin`,
          duration: 6,
          key: `external_delete_${data.fileName}`
        });
      }

      // Call external update handler
      if (onUpdate) {
        onUpdate({ event: 'file_moved_to_recycle_bin', data });
      }
    };

    // Recycle bin summary updates
    const handleRecycleBinSummary = (summaryData) => {
      console.log('♻️ RecycleBin summary received:', summaryData);
      
      // Call external update handler with summary
      if (onUpdate) {
        onUpdate({ event: 'summary_update', data: summaryData });
      }
    };

    // Error handling
    const handleRecycleBinError = (error) => {
      console.error('♻️ RecycleBin error:', error);
      message.error(error.error || 'RecycleBin operation failed');
    };

    // Register event listeners
    socket.on('recycleBin', handleRecycleBinEvent);
    socket.on('recycle_bin_update', handleRecycleBinUpdate);
    socket.on('recycle_bin_summary', handleRecycleBinSummary);
    socket.on('recycle_bin_error', handleRecycleBinError);

    // Cleanup listeners
    return () => {
      socket.off('recycleBin', handleRecycleBinEvent);
      socket.off('recycle_bin_update', handleRecycleBinUpdate);
      socket.off('recycle_bin_summary', handleRecycleBinSummary);
      socket.off('recycle_bin_error', handleRecycleBinError);
    };
  }, [socket, isConnected, onUpdate]);

  // Request recycle bin summary
  const requestSummary = useCallback(() => {
    if (socket && isConnected && user?.userId) {
      socket.emit('get_recycle_bin_summary', { userId: user.userId });
    }
  }, [socket, isConnected, user?.userId]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get notification count by type
  const getNotificationCount = useCallback((eventType = null) => {
    if (!eventType) return notifications.length;
    return notifications.filter(n => n.event === eventType).length;
  }, [notifications]);

  // Get recent notifications
  const getRecentNotifications = useCallback((limit = 10) => {
    return notifications.slice(0, limit);
  }, [notifications]);

  return {
    // Connection state
    isConnected,
    socket,
    
    // Notifications
    notifications,
    notificationCount: notifications.length,
    
    // Methods
    requestSummary,
    clearNotifications,
    getNotificationCount,
    getRecentNotifications,
    
    // Utility
    hasRecentDeletions: notifications.some(n => 
      n.event === 'file_deleted' && 
      (Date.now() - new Date(n.timestamp).getTime()) < 300000 // 5 minutes
    ),
    
    hasRecentRestorations: notifications.some(n => 
      n.event === 'file_restored' && 
      (Date.now() - new Date(n.timestamp).getTime()) < 300000 // 5 minutes
    )
  };
};

export default useRecycleBinSocket;