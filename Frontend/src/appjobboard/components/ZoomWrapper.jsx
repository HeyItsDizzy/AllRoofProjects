import React, { useState } from 'react';

/**
 * SIMPLE ZOOM WRAPPER - Only handles UI scaling, nothing else
 * KISS principle: One responsibility = zoom the view
 */
export default function ZoomWrapper({ children }) {
  const [zoomLevel, setZoomLevel] = useState(100);

  return (
    <div className="flex flex-col h-full">
      {/* Zoom Controls */}
      <div className="flex items-center gap-4 p-2 border-b">
        <span className="text-sm font-medium">Zoom:</span>
        <select
          value={zoomLevel}
          onChange={(e) => setZoomLevel(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value={50}>50%</option>
          <option value={60}>60%</option>
          <option value={70}>70%</option>
          <option value={80}>80%</option>
          <option value={90}>90%</option>
          <option value={100}>100%</option>
          <option value={110}>110%</option>
          <option value={125}>125%</option>
          <option value={150}>150%</option>
        </select>
      </div>

      {/* Fixed Viewport Container - No External Scrollbars */}
      <div className="flex-1 overflow-hidden relative">
        {/* Scaled Content Container */}
        <div 
          className="absolute inset-0 origin-top-left overflow-auto"
          style={{
            transform: `scale(${zoomLevel / 100})`,
            width: `${100 / (zoomLevel / 100)}%`,
            height: `${100 / (zoomLevel / 100)}%`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
