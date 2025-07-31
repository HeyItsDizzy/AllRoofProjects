import React, { useState, useRef, useEffect } from 'react';
import { IconExpandBox, IconCollapseBox, IconUp, IconDown } from '@/shared/IconSet';
import Avatar from '@/shared/Avatar';


export function FilterSortHeader({ column, label }) {
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
          className="absolute z-50 mt-1 p-2 bg-white border rounded shadow-lg"
          style={{ minWidth: `${dropdownWidth}px` }}
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
    const isAvatarColumn = ['clients', 'estimator'].includes(column.id);
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
    return Array.from(optionsMap.keys())
      // toString() handles non-strings safely
      .filter(val =>
        val.toString().toLowerCase().includes(filterSearch.toLowerCase())
      )
      .map(value => {
        const isSelected = staged.includes(value);
        return (
          <label
            key={value}
            className={`flex items-center justify-between px-2 py-1 cursor-default rounded ${
              isSelected ? 'bg-green-100' : 'hover:bg-gray-100'
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
               {isAvatarColumn && column.columnDef.meta?.clientsList
                  ? (() => {
                      const client = column.columnDef.meta.clientsList.find(c => c._id === value) || {};
                      return (
                        <>
                          <Avatar name={client.company || client.name} avatarUrl={client.avatar} size="sm" />
                          <span className="truncate">{client.company || client.name}</span>
                        </>
                      );
                    })()
                  : <span className="truncate">{value}</span>}
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
