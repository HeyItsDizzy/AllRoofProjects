/**
 * Z-INDEX DEBUGGING COMPONENT - Development Tool ✅
 * 
 * PURPOSE:
 * - Visual debugging of z-index conflicts
 * - Real-time z-index hierarchy display
 * - Interactive z-index testing and adjustment
 * - Draggable unified interface
 * - Live editing capabilities
 * 
 * USAGE:
 * Import and add to any page during development:
 * <ZIndexDebugger />
 */

import React, { useState, useEffect, useRef } from 'react';
import { Z_INDEX, zIndexUtils, zIndexDev, COMPONENT_Z_INDEX } from './zIndexManager';

// Unified draggable container for all z-index debugging tools
export default function ZIndexDebugger({ 
  componentName = null, 
  componentZIndexConfig = null,
  initialPosition = { x: window.innerWidth - 420, y: 20 }
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('hierarchy');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingZIndex, setEditingZIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  const containerRef = useRef(null);

  // Development mode only
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Get all z-index entries
  const allZIndexes = zIndexUtils.debugList();
  
  // Filter based on category and search
  const filteredZIndexes = allZIndexes.filter(item => {
    const matchesCategory = selectedCategory === 'ALL' || 
      item.name.includes(selectedCategory) ||
      (selectedCategory === 'DROPDOWN' && item.name.includes('DROPDOWN')) ||
      (selectedCategory === 'MODAL' && item.name.includes('MODAL')) ||
      (selectedCategory === 'TOOLTIP' && item.name.includes('TOOLTIP'));
    
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.value.toString().includes(searchTerm);
    
    return matchesCategory && matchesSearch;
  });

  // Categories for filtering
  const categories = ['ALL', 'DROPDOWN', 'MODAL', 'TOOLTIP', 'STICKY', 'BASE'];

  // Color coding based on z-index range
  const getColorClass = (value) => {
    if (value >= 50000) return 'bg-red-100 text-red-800 border-red-200';
    if (value >= 10000) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (value >= 1000) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (value >= 100) return 'bg-green-100 text-green-800 border-green-200';
    if (value >= 10) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Get category label
  const getCategoryLabel = (value) => {
    if (value >= 50000) return 'CRITICAL';
    if (value >= 10000) return 'TOOLTIP';
    if (value >= 1000) return 'MODAL';
    if (value >= 100) return 'DROPDOWN';
    if (value >= 10) return 'STICKY';
    return 'BASE';
  };

  // Copy z-index class to clipboard
  const copyToClipboard = (className) => {
    navigator.clipboard.writeText(className);
    // Could add toast notification here
  };

  // Handle drag start
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      e.preventDefault();
    }
  };

  // Handle drag move
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep within window bounds
      const maxX = window.innerWidth - 400;
      const maxY = window.innerHeight - 600;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Handle z-index editing
  const handleEditZIndex = (item) => {
    setEditingZIndex(item.name);
    setEditValue(item.value.toString());
  };

  const handleSaveEdit = () => {
    // This would require runtime modification of Tailwind classes
    // For now, we'll just copy the new class to clipboard
    const newValue = parseInt(editValue, 10);
    const newClassName = `z-[${newValue}]`;
    copyToClipboard(newClassName);
    alert(`New z-index class copied to clipboard: ${newClassName}\nNote: You'll need to manually update the zIndexManager.js file.`);
    setEditingZIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingZIndex(null);
    setEditValue('');
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-[99999] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 text-sm font-medium`}
        style={{
          left: `${position.x + (isOpen ? 0 : 0)}px`,
          top: `${position.y + (isOpen ? 0 : 0)}px`
        }}
        title="Z-Index Debugger & Component Inspector"
      >
        {isOpen ? '✕' : '🎯'} Z-Index Tools
      </button>

      {/* Unified Debug Panel */}
      {isOpen && (
        <div 
          ref={containerRef}
          className={`fixed z-[99998] bg-white border border-gray-300 rounded-lg shadow-2xl w-96 max-h-[80vh] overflow-hidden transition-all duration-200 ${
            isDragging ? 'cursor-grabbing shadow-3xl scale-105' : 'shadow-2xl'
          }`}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            userSelect: 'none'
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Draggable Header */}
          <div className={`drag-handle bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-3 transition-all duration-200 ${
            isDragging ? 'cursor-grabbing bg-gradient-to-r from-blue-100 to-purple-100' : 'cursor-grab hover:from-blue-100 hover:to-purple-100'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-blue-600">🎯</span>
                Z-Index Manager
                {isDragging && <span className="text-xs text-gray-500 animate-pulse">Dragging...</span>}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => zIndexDev.logHierarchy()}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                  title="Log hierarchy to console"
                >
                  Console
                </button>
                <span className="text-xs text-gray-500">
                  {isDragging ? '🤏 Dragging' : '✋ Drag to move'}
                </span>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="mt-3 flex space-x-1">
              <button
                onClick={() => setActiveTab('hierarchy')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeTab === 'hierarchy'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Z-Indexes
              </button>
              {componentName && (
                <button
                  onClick={() => setActiveTab('component')}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    activeTab === 'component'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {componentName}
                </button>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="overflow-hidden">
            {activeTab === 'hierarchy' && (
              <div>
                {/* Search and Filters */}
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search z-indexes..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                  />
                  
                  <div className="flex flex-wrap gap-1">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`text-xs px-2 py-1 rounded ${
                          selectedCategory === category
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Z-Index List */}
                <div className="overflow-y-auto max-h-96">
                  {filteredZIndexes.map((item, index) => (
                    <div
                      key={`${item.name}-${item.value}`}
                      className="border-b border-gray-100 p-2 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs text-gray-600 truncate">
                            {item.name}
                          </div>
                          <div className="font-mono text-xs text-blue-600 mt-1">
                            {item.className}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className={`text-xs px-2 py-1 rounded border ${getColorClass(item.value)}`}>
                            {getCategoryLabel(item.value)}
                          </span>
                          
                          {editingZIndex === item.name ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-16 px-1 py-0.5 text-xs border rounded"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveEdit}
                                className="text-green-600 hover:text-green-800 text-xs"
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-red-600 hover:text-red-800 text-xs"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-sm text-gray-900 min-w-[3rem] text-right">
                                {item.value}
                              </span>
                              <button
                                onClick={() => copyToClipboard(item.className)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                                title="Copy to clipboard"
                              >
                                📋
                              </button>
                              <button
                                onClick={() => handleEditZIndex(item)}
                                className="text-orange-600 hover:text-orange-800 text-xs"
                                title="Edit value"
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 border-t border-gray-200 p-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Total: {filteredZIndexes.length}</span>
                    <span>📋 Copy | ✏️ Edit</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'component' && componentZIndexConfig && (
              <div className="p-3">
                <h4 className="font-semibold text-sm mb-3 text-purple-700">{componentName} Z-Indexes</h4>
                {Object.entries(componentZIndexConfig).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-700">{key}:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {value}
                      </span>
                      <button
                        onClick={() => copyToClipboard(value)}
                        className="text-purple-600 hover:text-purple-800 text-xs"
                        title="Copy to clipboard"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}