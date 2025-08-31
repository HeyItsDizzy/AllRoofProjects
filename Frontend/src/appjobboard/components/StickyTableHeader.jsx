import React from 'react';
import { IconPin, IconUnpin } from '@/shared/IconSet';

/**
 * Unified wrapper that handles:
 * 1. Sticky positioning
 * 2. Pin/unpin buttons
 * 3. Header component rendering
 * 4. Dropdown positioning awareness
 */
export default function StickyTableHeader({
  header,
  isLeftSticky,
  isRightSticky,
  leftOffset,
  canPin = false,
  isPinned = false,
  onTogglePin,
  zoomLevel = 100,
  children
}) {
  const stickyStyles = {};
  
  if (isLeftSticky) {
    stickyStyles.position = 'sticky';
    stickyStyles.left = `${(leftOffset || 0) * (zoomLevel / 100)}px`;
    stickyStyles.zIndex = 32;
    stickyStyles.backgroundColor = '#16a34a'; // green-600
    stickyStyles.boxShadow = 'inset -1px 0 0 0 #d1d5db, 2px 0 4px rgba(0,0,0,0.1)';
  } else if (isRightSticky) {
    stickyStyles.position = 'sticky';
    stickyStyles.right = '0px';
    stickyStyles.zIndex = 33;
    stickyStyles.backgroundColor = '#16a34a'; // green-600
    stickyStyles.boxShadow = 'inset 1px 0 0 0 #d1d5db, -2px 0 4px rgba(0,0,0,0.1)';
  }

  return (
    <th
      className="border border-gray-300 px-2 h-8 bg-green-600 relative group text-left text-white font-medium"
      style={{
        width: isRightSticky ? '60px' : header.getSize(),
        minWidth: isRightSticky ? '60px' : header.getSize(),
        maxWidth: isRightSticky ? '60px' : undefined,
        ...stickyStyles
      }}
    >
      <div className="flex justify-between items-center h-full">
        <div className="flex-1 text-sm">
          <div className="flex items-center gap-1">
            {/* Render the header component with sticky context */}
            {React.cloneElement(children, {
              isSticky: isLeftSticky || isRightSticky,
              stickyPosition: isLeftSticky ? 'left' : isRightSticky ? 'right' : null,
              stickyOffset: leftOffset
            })}
            
            {/* Pin/unpin button for eligible columns */}
            {canPin && (
              <button
                type="button"
                aria-label={isPinned ? 'Unpin Column' : 'Pin Column'}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onTogglePin && onTogglePin(); 
                }}
                className="ml-1 focus:outline-none hover:bg-green-700/20 rounded p-1"
              >
                {isPinned ? <IconUnpin size={12} /> : <IconPin size={12} />}
              </button>
            )}
          </div>
        </div>
        
        {/* Column resize handle */}
        {header.column.getCanResize() && (
          <div
            onMouseDown={(e) => {
              const handler = header.getResizeHandler();
              if (handler) handler(e);
            }}
            onTouchStart={(e) => {
              const handler = header.getResizeHandler();
              if (handler) handler(e);
            }}
            className="resize-handle"
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              height: '100%',
              width: '5px',
              cursor: 'col-resize',
              userSelect: 'none',
              touchAction: 'none',
              transform: header.column.getIsResizing() ? 'scaleX(2)' : 'scaleX(1)',
              transition: 'transform 0.1s ease',
              zIndex: 1000
            }}
          />
        )}
      </div>
    </th>
  );
}
