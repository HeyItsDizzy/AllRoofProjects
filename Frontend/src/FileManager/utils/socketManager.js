// socketManager.js - Singleton socket manager for live folder sync
import { io } from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.subscribers = new Map(); // projectId -> callbacks
    this.recycleBinSubscribers = new Set(); // global recycle bin callbacks
    this.isConnected = false;
    this.connectionPromise = null;
  }

  async connect() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      console.log('🔌 SocketManager: Creating new socket connection');
      
      // Use local development proxy for socket connections to avoid CORS/mixed content issues
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      // In production, try to connect through the same domain to avoid CORS/firewall issues
      const socketUrl = isLocalhost 
        ? window.location.origin  // Use current origin for Vite proxy (http://localhost:5173)
        : window.location.origin;  // Use same origin in production (requires nginx proxy)
      
      console.log(`🔌 SocketManager: Connecting to ${socketUrl} (Localhost: ${isLocalhost})`);
      
      const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: false,
        path: '/socket.io/',
        ...(isLocalhost ? {} : { 
          secure: true,
          rejectUnauthorized: false  // Allow self-signed certificates if needed
        })
      });

      socket.on('connect', () => {
        console.log('🔗 SocketManager: Connected to live sync server');
        this.isConnected = true;
        this.socket = socket;
        resolve(socket);
      });

      socket.on('disconnect', () => {
        console.log('❌ SocketManager: Disconnected from live sync server');
        this.isConnected = false;
        // Don't clear socket immediately, allow for reconnection
      });

      socket.on('connect_error', (error) => {
        console.error('❌ SocketManager: Connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      socket.on('folder_sync', (eventData) => {
        console.log('📡 SocketManager: Received folder_sync event:', eventData);
        
        // Notify all subscribers for this project
        const projectCallbacks = this.subscribers.get(eventData.projectId);
        if (projectCallbacks) {
          projectCallbacks.forEach(callback => {
            try {
              callback({
                type: eventData.eventType,
                fileName: eventData.fileName,
                relativePath: eventData.relativePath,
                isFolder: eventData.isFolder,
                timestamp: eventData.timestamp
              });
            } catch (error) {
              console.error('❌ SocketManager: Error in callback:', error);
            }
          });
        }
      });

      socket.on('recycle_bin_event', (eventData) => {
        console.log('♻️ SocketManager: Received recycle_bin_event:', eventData);
        
        // Notify all recycle bin subscribers
        const recycleBinCallbacks = this.recycleBinSubscribers;
        if (recycleBinCallbacks && recycleBinCallbacks.size > 0) {
          recycleBinCallbacks.forEach(callback => {
            try {
              callback(eventData);
            } catch (error) {
              console.error('❌ SocketManager: Error in recycle bin callback:', error);
            }
          });
        }
      });

      this.socket = socket;
    });

    return this.connectionPromise;
  }

  async subscribe(projectId, callback, projectName = 'Unknown Project') {
    const socket = await this.connect();
    
    // Add callback to subscribers
    if (!this.subscribers.has(projectId)) {
      this.subscribers.set(projectId, new Set());
      // Subscribe to project events on first subscriber
      socket.emit('subscribe_project', projectId);
      console.log(`📡 SocketManager: Subscribed to project "${projectName}"`);
    }
    
    this.subscribers.get(projectId).add(callback);
    // console.log(`👥 SocketManager: Added callback for project "${projectName}"`);
    
    return () => this.unsubscribe(projectId, callback, projectName);
  }

  unsubscribe(projectId, callback, projectName = 'Unknown Project') {
    const projectCallbacks = this.subscribers.get(projectId);
    if (projectCallbacks) {
      projectCallbacks.delete(callback);
      
      // If no more callbacks for this project, unsubscribe
      if (projectCallbacks.size === 0) {
        this.subscribers.delete(projectId);
        if (this.socket) {
          this.socket.emit('unsubscribe_project', projectId);
          console.log(`📡 SocketManager: Unsubscribed from project "${projectName}"`);
        }
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionPromise = null;
      this.subscribers.clear();
      this.recycleBinSubscribers.clear();
      console.log('🔌 SocketManager: Disconnected and cleaned up');
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  async subscribeToRecycleBin(callback) {
    await this.connect(); // Ensure connection exists
    this.recycleBinSubscribers.add(callback);
    console.log('♻️ SocketManager: Subscribed to recycle bin events');
    
    return () => this.unsubscribeFromRecycleBin(callback);
  }

  unsubscribeFromRecycleBin(callback) {
    this.recycleBinSubscribers.delete(callback);
    console.log('♻️ SocketManager: Unsubscribed from recycle bin events');
  }
}

// Export singleton instance
export const socketManager = new SocketManager();
