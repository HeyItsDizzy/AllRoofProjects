import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const LiveFolderSyncTest = () => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [subscribedProject, setSubscribedProject] = useState('');
  const [events, setEvents] = useState([]);
  const [testProjectId] = useState('689373c6f7a5c4a10c8a8981'); // The Y Ipswich project

  // Socket connection management
  useEffect(() => {
    // Connect to the socket server
    const socketConnection = io('http://145.223.23.243:3001', {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    socketConnection.on('connect', () => {
      console.log('✅ Connected to socket server');
      setConnectionStatus('Connected');
      addEvent('✅ Connected to socket server', 'success');
    });

    socketConnection.on('disconnect', () => {
      console.log('❌ Disconnected from socket server');
      setConnectionStatus('Disconnected');
      addEvent('❌ Disconnected from socket server', 'error');
    });

    socketConnection.on('connect_error', (error) => {
      console.log('❌ Connection error:', error);
      setConnectionStatus('Connection Error');
      addEvent(`❌ Connection error: ${error.message}`, 'error');
    });

    // Listen for folder sync events
    socketConnection.on('folder_sync', (data) => {
      console.log('📁 Folder sync event:', data);
      const eventIcon = data.isFolder ? '📁' : '📄';
      const eventDesc = `${eventIcon} ${data.eventType}: ${data.fileName}`;
      const projectInfo = data.projectName !== 'Unknown Project' ? ` (${data.projectName})` : '';
      addEvent(`${eventDesc}${projectInfo}`, 'info');
    });

    setSocket(socketConnection);

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  const addEvent = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setEvents(prev => [...prev, { 
      id: Date.now(), 
      message, 
      type, 
      timestamp 
    }]);
  };

  const subscribeToProject = () => {
    if (socket && testProjectId) {
      socket.emit('subscribe_project', testProjectId);
      setSubscribedProject(testProjectId);
      addEvent(`🔔 Subscribed to project: ${testProjectId}`, 'success');
    }
  };

  const unsubscribeFromProject = () => {
    if (socket && subscribedProject) {
      socket.emit('unsubscribe_project', subscribedProject);
      setSubscribedProject('');
      addEvent(`🔕 Unsubscribed from project: ${subscribedProject}`, 'warning');
    }
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'Connected': return 'text-green-600';
      case 'Disconnected': return 'text-red-600';
      case 'Connection Error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">
          🚀 Live Folder Sync Test
        </h1>
        <p className="text-blue-700">
          This page tests real-time folder synchronization for project: 
          <span className="font-mono font-bold ml-2">The Y Ipswich - Covered Sports Court</span>
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className={`font-medium ${getStatusColor()}`}>
                {connectionStatus}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Socket Server: http://145.223.23.243:3001
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-600">Project ID:</p>
            <p className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">
              {testProjectId}
            </p>
          </div>
        </div>
      </div>

      {/* Project Subscription */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Project Subscription</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={subscribeToProject}
            disabled={!socket || subscribedProject === testProjectId}
            className={`px-4 py-2 rounded font-medium ${
              subscribedProject === testProjectId
                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {subscribedProject === testProjectId ? '✅ Subscribed' : '🔔 Subscribe to Project'}
          </button>
          
          <button
            onClick={unsubscribeFromProject}
            disabled={!subscribedProject}
            className="px-4 py-2 bg-gray-500 text-white rounded font-medium hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            🔕 Unsubscribe
          </button>
        </div>
      </div>

      {/* Test Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-yellow-800 mb-3">
          📋 How to Test
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-yellow-700">
          <li>Make sure you're <strong>Connected</strong> (green dot above)</li>
          <li>Click <strong>"Subscribe to Project"</strong> to listen for folder changes</li>
          <li>On your server, create a test folder in the project directory:</li>
        </ol>
        <div className="bg-yellow-100 p-3 rounded mt-3 font-mono text-sm">
          mkdir '.FM/AU/2025/08. Aug/25-08010 - The Y Ipswich - Covered Sports Court/Test_$(date +%H%M%S)'
        </div>
        <p className="text-yellow-700 mt-2">
          <strong>Expected Result:</strong> You should see a "📁 Folder sync" event appear below in real-time!
        </p>
      </div>

      {/* Live Events */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">🔴 Live Events</h2>
          <button
            onClick={clearEvents}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Clear Events
          </button>
        </div>
        
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-gray-500">Waiting for events...</div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="mb-1">
                <span className="text-gray-400">[{event.timestamp}]</span>{' '}
                <span className={getEventColor(event.type)}>{event.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-6 p-4 bg-gray-100 rounded text-xs text-gray-600">
        <strong>Debug Info:</strong><br/>
        Socket Connected: {socket?.connected ? 'Yes' : 'No'}<br/>
        Subscribed Project: {subscribedProject || 'None'}<br/>
        Total Events: {events.length}
      </div>
    </div>
  );
};

export default LiveFolderSyncTest;
