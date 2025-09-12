import React, { useState, useRef, useEffect } from 'react';
import { IconExpandBox, IconCollapseBox, IconUp, IconDown } from '@/shared/IconSet';
import Avatar from '@/shared/Avatar';


export function FilterSortHeader({ column, label, isSticky, stickyPosition, stickyOffset, table, filterHandlers }) {
  // Keep track of staged filter selections
  const [staged, setStaged] = useState(column.getFilterValue() ?? []);
  // Text search within the dropdown
  const [filterSearch, setFilterSearch] = useState('');
  // Compute the unique values/counts for this column
  const uniq = column.getFacetedUniqueValues();

  // Reference to the wrapping div, for outside-click detection
  const ref = useRef(null);
  // Dropdown width = column width + some padding
  const dropdownWidth = column.getSize() + 50;

  // Test if we have the new filter handlers
  if (filterHandlers?.handleFilterDropdown) {
    // Use the new lifted filter system
    const isOpen = filterHandlers.activeFilterColumn === column.id;
    
    // Outside-click handler: only when open
    useEffect(() => {
      if (!isOpen) return;
      const onClick = e => {
        if (ref.current && !ref.current.contains(e.target)) {
          // Apply staged filters, then close
          column.setFilterValue(staged);
          filterHandlers.handleFilterDropdown(null);
        }
      };
      document.addEventListener('mousedown', onClick);
      return () => document.removeEventListener('mousedown', onClick);
    }, [isOpen, staged]); // react when open or staged changes
    
    // Choose the right sort icon
    const SortIcon =
      column.getIsSorted() === 'asc'
        ? IconUp
        : column.getIsSorted() === 'desc'
        ? IconDown
        : IconDown;
    
    return (
      <div ref={ref} className="relative">
        {/* Header bar: sort label + filter toggle */}
        <div className="flex items-center justify-between w-full h-full bg-green-600 px-2 select-none">
          <div
            className="flex items-center space-x-1 p-1 hover:bg-green-700/20 rounded cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span className="text-sm font-medium">{label}</span>
            <SortIcon className="w-4 h-4 text-gray-500" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              filterHandlers.handleFilterDropdown(column.id, e.currentTarget);
            }}
            className="p-1 bg-transparent hover:bg-green-700/20 rounded"
            title="Filter"
          >
            {isOpen
              ? <IconCollapseBox size={16} className="text-gray-500" />
              : <IconExpandBox size={16} className="text-gray-500" />}
          </button>
        </div>
      </div>
    );
  }

  // Fallback to old system if new handlers not available
  // If the parent passed down openColumn/setOpenColumn via meta, use those;
  // otherwise fall back to local state
  const { openColumn, setOpenColumn } = column.columnDef.meta ?? {};
  const [localOpen, setLocalOpen] = useState(false);
  const open = setOpenColumn
    ? openColumn === column.id
    : localOpen;
  const toggle = () => {
    if (setOpenColumn) {
      setOpenColumn(open ? null : column.id);
    } else {
      setLocalOpen(o => !o);
    }
  };

  // Outside-click handler: only when open
  useEffect(() => {
    if (!open) return;
    const onClick = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        // Apply staged filters, then close
        column.setFilterValue(staged);
        toggle();
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, staged]); // react when open or staged changes

  // Choose the right sort icon
  const SortIcon =
    column.getIsSorted() === 'asc'
      ? IconUp
      : column.getIsSorted() === 'desc'
      ? IconDown
      : IconDown;

  return (
    <div ref={ref} className="relative">
      {/* Header bar: sort label + filter toggle */}
      <div className="flex items-center justify-between w-full h-full bg-green-600 px-2 select-none">
        <div
          className="flex items-center space-x-1 p-1 hover:bg-green-700/20 rounded cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <span className="text-sm font-medium">{label}</span>
          <SortIcon className="w-4 h-4 text-gray-500" />
        </div>
        <button
          onClick={toggle}
          className="p-1 bg-transparent hover:bg-green-700/20 rounded"
          title="Filter"
        >
          {open
            ? <IconCollapseBox size={16} className="text-gray-500" />
            : <IconExpandBox size={16} className="text-gray-500" />}
        </button>
      </div>

      {/* Filter dropdown */}
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute z-[240] mt-1 p-2 bg-white border rounded shadow-lg"
          style={{ 
            minWidth: `${dropdownWidth}px`,
            // Position based on sticky state
            ...(isSticky && stickyPosition === 'left' 
              ? { 
                  left: '0px', // Align with sticky column
                  transform: 'none'
                }
              : isSticky && stickyPosition === 'right' 
              ? { 
                  right: '0px', // Align with right sticky column
                  transform: 'none'
                }
              : { 
                  left: '50%', // Center on normal columns
                  transform: 'translateX(-50%)'
                })
          }}
        >
          {/* Clear All */}
          <button
            onClick={() => setStaged([])}
            className="mb-2 w-full text-left text-xs text-blue-600 hover:underline"
          >
            Clear All
          </button>

          {/* Search box */}
          <input
            type="text"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder="Search…"
            className="mb-2 w-full border px-2 py-1 text-sm"
          />

{/* Options list */}
<div className="h-32 overflow-auto">
  {(() => {
    const isAvatarColumn = ['clients', 'estimators'].includes(column.id);
    const isDateColumn = ['posting_date', 'due_date', 'DateCompleted'].includes(column.id);
    const isOptionalColumn = ['PlanType', 'clients', 'estimators', 'posting_date', 'due_date', 'DateCompleted', 'Comments', 'ARTInvNumber', 'InvoiceLine', 'FlashingSet'].includes(column.id);
    
    // Start with the raw faceted map...
    let optionsMap = uniq;
    if (isAvatarColumn) {
      // ...but flatten any array-keys into individual string counts
      const flatMap = new Map();
      optionsMap.forEach((count, key) => {
        if (Array.isArray(key)) {
          key.forEach(item => {
            flatMap.set(item, (flatMap.get(item) || 0) + count);
          });
        } else {
          flatMap.set(key, (flatMap.get(key) || 0) + count);
        }
      });
      optionsMap = flatMap;
    }
    
    // Convert to array and add blank/undefined option for relevant columns
    let optionsArray = Array.from(optionsMap.keys());
    
    // Add blank/undefined option for columns that can have empty values
    if (isOptionalColumn) {
      // Check if there are any null/undefined/empty values in the data
      const emptyKeys = Array.from(optionsMap.keys()).filter(key => 
        key === null || key === undefined || key === '' || 
        (typeof key === 'string' && key.trim() === '') ||
        key === '__BLANK__' || // Also remove any existing __BLANK__ keys
        (isDateColumn && (key === 'dd/mm/yyyy' || key === 'mm/dd/yyyy' || key === 'yyyy-mm-dd' || 
         key === 'Invalid Date' || (typeof key === 'string' && key.match(/^[dmy\/\-]{8,10}$/))))
      );
      
      if (emptyKeys.length > 0 || isDateColumn || isAvatarColumn) {
        // Calculate total count of all empty values (excluding any existing __BLANK__)
        const blankCount = emptyKeys
          .filter(key => key !== '__BLANK__') // Don't double-count existing __BLANK__
          .reduce((total, key) => total + (optionsMap.get(key) || 0), 0);
        
        // For date columns using accessorFn, we might have null values that need to be counted from the actual data
        let actualBlankCount = blankCount;
        if (isDateColumn && blankCount === 0) {
          // Count null values directly from the table data for date columns
          const tableData = table.getRowModel().rows.map(row => row.original);
          const fieldName = column.id === 'posting_date' ? 'posting_date' : 
                           column.id === 'due_date' ? 'due_date' : 'DateCompleted';
          actualBlankCount = tableData.filter(row => {
            const value = row[fieldName];
            return value === null || value === undefined || value === '' || 
                   (typeof value === 'string' && value.trim() === '');
          }).length;
        }
        
        if (actualBlankCount > 0 || isDateColumn || isAvatarColumn) {
          // Remove ALL empty keys from the optionsMap (including any existing __BLANK__)
          emptyKeys.forEach(key => optionsMap.delete(key));
          // Remove all empty keys from the array
          optionsArray = optionsArray.filter(key => !emptyKeys.includes(key));
          
          // Add __BLANK__ with the actual count
          optionsArray.push('__BLANK__');
          optionsMap.set('__BLANK__', actualBlankCount);
        }
      }
    }
    
    return optionsArray
      // Filter based on search, but handle special blank option
      .filter(val => {
        if (val === '__BLANK__') {
          return 'blank'.includes(filterSearch.toLowerCase()) || 'empty'.includes(filterSearch.toLowerCase()) || filterSearch === '';
        }
        return val != null && val.toString().toLowerCase().includes(filterSearch.toLowerCase());
      })
      // Sort so that __BLANK__ always appears at the bottom
      .sort((a, b) => {
        if (a === '__BLANK__') return 1; // Move __BLANK__ to end
        if (b === '__BLANK__') return -1; // Keep __BLANK__ at end
        return 0; // Keep original order for other items
      })
      .map((value, index) => {
        const isSelected = staged.includes(value);
        const isBlankOption = value === '__BLANK__';
        // Use a more unique key that includes the column ID to prevent duplicates across columns
        const uniqueKey = isBlankOption ? `${column.id}_blank` : `${column.id}_${value}`;
        
        return (
          <label
            key={uniqueKey}
            className={`flex items-center justify-between px-2 py-1 cursor-default rounded ${
              isSelected ? 'bg-green-100 text-gray-900' : 'hover:bg-gray-200 text-gray-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {
                  const next = isSelected
                    ? staged.filter(v => v !== value)
                    : [...staged, value];
                  setStaged(next);
                }}
                className="form-checkbox h-4 w-4 text-green-600"
                onClick={e => e.stopPropagation()}
              />
              {isBlankOption ? (
                <span className="truncate text-gray-500 italic">(Blank/Empty)</span>
              ) : isAvatarColumn && column.columnDef.meta?.clientsList ? (
                (() => {
                  const client = column.columnDef.meta.clientsList.find(c => c._id === value) || {};
                  return (
                    <>
                      <Avatar name={client.company || client.name} avatarUrl={client.avatar} size="sm" />
                      <span className="truncate text-gray-900">{client.company || client.name}</span>
                    </>
                  );
                })()
              ) : isAvatarColumn && column.columnDef.meta?.estimatorsList ? (
                (() => {
                  const estimator = column.columnDef.meta.estimatorsList.find(e => e._id === value) || {};
                  return (
                    <>
                      <Avatar 
                        name={`${estimator.firstName || ''} ${estimator.lastName || ''}`} 
                        avatarUrl={estimator.avatar} 
                        size="sm" 
                      />
                      <span className="truncate text-gray-900">
                        {`${estimator.firstName || ''} ${estimator.lastName || ''}`.trim() || estimator.email}
                      </span>
                    </>
                  );
                })()
              ) : (
                <span className="truncate text-gray-900">{value}</span>
              )}
            </div>
            <span className="text-xs text-gray-500">
              ({optionsMap.get(value)})
            </span>
          </label>
        );
      });
  })()}
</div>

        </div>
      )}
    </div>
  );
}
