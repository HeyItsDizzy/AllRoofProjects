import React from 'react';
import { flexRender } from '@tanstack/react-table';
import { IconPin, IconUnpin } from '@/shared/IconSet';

/**
 * UNIFIED TABLE CELL - Handles both headers and body cells with the same sticky logic
 * This ensures headers and columns are ALWAYS synchronized
 */
export default function UnifiedTableCell({
  type = 'header', // 'header' or 'body'
  header,
  cell,
  isLeftSticky,
  isRightSticky,
  leftOffset,
  zoomLevel = 100,
  canPin = false,
  isPinned = false,
  onTogglePin,
  children,
  ...props
}) {
  // Common sticky styles that work for BOTH headers and body cells
  const getStickyStyles = () => {
    const baseStyles = {};
    
    if (isLeftSticky) {
      baseStyles.position = 'sticky';
      // For viewport sticky positioning, we need to account for the scale
      // The leftOffset should be scaled to match the viewport
      baseStyles.left = `${(leftOffset || 0)}px`;
      baseStyles.zIndex = type === 'header' ? 32 : 15;
      baseStyles.backgroundColor = type === 'header' ? '#16a34a' : 'white';
      baseStyles.boxShadow = 'inset -1px 0 0 0 #d1d5db, 2px 0 4px rgba(0,0,0,0.1)';
    } else if (isRightSticky) {
      baseStyles.position = 'sticky';
      baseStyles.right = '0px';
      baseStyles.zIndex = type === 'header' ? 33 : 16;
      baseStyles.backgroundColor = type === 'header' ? '#16a34a' : 'white';
      baseStyles.boxShadow = 'inset 1px 0 0 0 #d1d5db, -2px 0 4px rgba(0,0,0,0.1)';
    }

    // Size settings - these should remain actual table column sizes
    if (isRightSticky) {
      baseStyles.width = '60px';
      baseStyles.minWidth = '60px';
      baseStyles.maxWidth = '60px';
    } else {
      const size = header ? header.getSize() : cell ? cell.column.getSize() : 'auto';
      baseStyles.width = size;
      baseStyles.minWidth = size;
    }

    return baseStyles;
  };

  // Header cell
  if (type === 'header') {
    return (
      <th
        className="border border-gray-300 px-2 h-8 bg-green-600 relative group text-left text-white font-medium"
        style={getStickyStyles()}
        {...props}
      >
        <div className="flex justify-between items-center h-full">
          <div className="flex-1 text-sm">
            <div className="flex items-center gap-1">
              {/* Render header content */}
              <div className="flex items-center flex-1">
                {children}
              </div>
              
              {/* Pin button */}
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
          
          {/* Resize handle */}
          {header && header.column.getCanResize() && (
            <div
              onMouseDown={(e) => {
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
                zIndex: 1000
              }}
            />
          )}
        </div>
      </th>
    );
  }

  // Body cell
  return (
    <td
      className="border border-gray-300 px-3 h-8 whitespace-nowrap overflow-hidden text-ellipsis relative cursor-pointer"
      style={getStickyStyles()}
      {...props}
    >
      {children}
    </td>
  );
}
