// LiveSyncStatus.jsx - Component to show live folder sync connection status
import React from 'react';

const LiveSyncStatus = ({ isConnected, className = "" }) => {
  if (!isConnected) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span>Live sync disconnected</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-green-600 ${className}`}>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span>Live sync active</span>
    </div>
  );
};

export default LiveSyncStatus;
