/**
 * OPTIMIZED INLINE EDITING COMPONENTS
 * Performance-optimized components for JobTable inline editing
 * Addresses LCP issues with div.w-full.px-2.py-1.cursor-pointer.hover:bg-gray-50
 */

import React, { memo, useState, useCallback, useMemo } from 'react';

/**
 * Optimized inline editable cell component
 * Reduces re-renders and optimizes the LCP element
 */
export const OptimizedEditableCell = memo(({ 
  value, 
  onChange, 
  isEditing: externalIsEditing = false,
  onEditingChange = () => {},
  placeholder = '—',
  type = 'text',
  className = '',
  disabled = false 
}) => {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const isEditing = externalIsEditing || internalIsEditing;

  const handleEdit = useCallback(() => {
    if (disabled) return;
    setInternalIsEditing(true);
    onEditingChange(true);
  }, [disabled, onEditingChange]);

  const handleBlur = useCallback((e) => {
    const newValue = e.target.value;
    if (newValue !== value) {
      onChange(newValue);
    }
    setInternalIsEditing(false);
    onEditingChange(false);
  }, [value, onChange, onEditingChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      e.target.value = value;
      e.target.blur();
    }
  }, [value]);

  // Memoize the display value to prevent unnecessary re-renders
  const displayValue = useMemo(() => value || placeholder, [value, placeholder]);

  if (isEditing) {
    return (
      <input
        type={type}
        defaultValue={value}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 optimized-text ${className}`}
        autoFocus
      />
    );
  }

  return (
    <div
      className={`w-full px-2 py-1 cursor-pointer hover:bg-gray-50 optimized-text stable-table-cell ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
      onClick={handleEdit}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          handleEdit();
        }
      }}
    >
      {displayValue}
    </div>
  );
});

OptimizedEditableCell.displayName = 'OptimizedEditableCell';

/**
 * Optimized table cell wrapper with memoization
 * Prevents unnecessary re-renders of cell content
 */
export const OptimizedTableCell = memo(({ 
  children, 
  className = '', 
  onClick,
  ...props 
}) => {
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (onClick) onClick(e);
  }, [onClick]);

  return (
    <td 
      className={`stable-table-cell ${className}`} 
      onClick={handleClick}
      {...props}
    >
      {children}
    </td>
  );
});

OptimizedTableCell.displayName = 'OptimizedTableCell';

/**
 * Performance-optimized table row for JobTable
 * Reduces re-renders and improves LCP
 */
export const OptimizedJobTableRow = memo(({ 
  row, 
  visibleColumns,
  isRowSelected,
  onRowClick,
  className = '',
  style = {},
  ...props 
}) => {
  const handleRowClick = useCallback(() => {
    if (onRowClick) {
      onRowClick(row);
    }
  }, [onRowClick, row]);

  const rowClassName = useMemo(() => 
    `${className} ${isRowSelected ? 'bg-blue-50' : ''} hover:bg-gray-50 cursor-pointer stable-table-cell`
  , [className, isRowSelected]);

  return (
    <tr 
      className={rowClassName}
      onClick={handleRowClick}
      style={style}
      {...props}
    >
      {visibleColumns.map((cell, index) => (
        <OptimizedTableCell key={cell.id || index}>
          {cell.render ? cell.render() : cell.content}
        </OptimizedTableCell>
      ))}
    </tr>
  );
});

OptimizedJobTableRow.displayName = 'OptimizedJobTableRow';

/**
 * Critical CSS for JobTable performance optimization
 */
export const JobTableLCPCSS = () => (
  <style jsx global>{`
    /* Optimize JobTable specific performance */
    .job-table-optimized {
      table-layout: fixed;
      will-change: auto;
      contain: layout style paint;
      border-collapse: collapse;
    }
    
    /* Optimize inline editing performance */
    .editable-cell-optimized {
      contain: layout style;
      will-change: auto;
      transition: background-color 0.1s ease;
    }
    
    /* Reduce paint time for hover states */
    .hover-optimized:hover {
      background-color: #f9fafb;
      will-change: auto;
    }
    
    /* Optimize text input performance */
    .input-optimized {
      contain: layout style;
      text-rendering: optimizeSpeed;
      font-display: swap;
    }
    
    /* Critical styles for first paint */
    .job-table-critical {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    
    /* Reduce layout shifts during edit mode */
    .stable-edit-container {
      min-height: 32px;
      display: flex;
      align-items: center;
    }
  `}</style>
);

/**
 * Performance monitoring hook for LCP tracking
 */
export const useLCPMonitoring = () => {
  const [lcpValue, setLcpValue] = useState(null);

  React.useEffect(() => {
    if ('web-vitals' in window) {
      // Use web-vitals library if available
      return;
    }

    // Fallback LCP monitoring
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setLcpValue(lastEntry.startTime);
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP monitoring not supported');
    }

    return () => observer.disconnect();
  }, []);

  return lcpValue;
};