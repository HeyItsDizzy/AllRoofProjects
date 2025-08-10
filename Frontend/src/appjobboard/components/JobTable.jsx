import React, { useMemo, useState, useContext, useEffect, useCallback, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  flexRender,
} from '@tanstack/react-table';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import { AuthContext } from '@/auth/AuthProvider';
import { useTablePreferences } from '@/appjobboard/hooks/useTablePreferences';
import { jobBoardColumns } from '@/appjobboard/config/JobBoardConfig';
import { useAutoSave } from '@/appjobboard/hooks/useAutoSave';
import { Button } from 'antd';
import Avatar from '@/shared/Avatar';   // adjust path to your avatar component
import { saveJobBoardData } from '@/appjobboard/api/jobApi';
import { basePlanTypes } from '@/shared/planTypes';
import { calculateAUD } from '@/shared/jobPricingUtils';


export default function JobTable({
  jobs,
  config,
  exchangeRate,
  clients = [],             // list of clients
  openAssignClient = () => {}, // callback to open modal
  openColumn,
  setOpenColumn,
}) {
  // ── 1) standard state & context ─────────────────────────────────────────
  // Local data state for inline edits and live updates
  const [data, setData] = useState(jobs);
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();

  // ── 2) Auto-save functionality ──────────────────────────────────────────
  const {
    queueChange,
    saveProject,
    saveAll,
    hasPendingChanges,
    isAutoSaving,
    pendingProjectsCount,
    pendingProjects
  } = useAutoSave(async (projectId, changes) => {
    // This function handles the actual backend save
    try {
      const fullRow = data.find(r => r._id === projectId);
      if (!fullRow) return;

      // Merge changes with current row data
      const updatedRow = { ...fullRow, ...changes };

      // For ALL changes, use the saveJobBoardData function
      // which should handle both job board specific fields and general project fields
      await saveJobBoardData(projectId, changes);

      console.log(`✅ Auto-saved project ${projectId}:`, changes);
    } catch (error) {
      console.error(`❌ Failed to save project ${projectId}:`, error);
      throw error; // Re-throw to let useAutoSave handle the error
    }
  });

  // ── 3) Update row function for immediate UI updates ─────────────────────
  const updateRow = useCallback((projectId, field, value) => {
    // Update local state immediately for responsive UI
    setData(prevData => 
      prevData.map(row => 
        row._id === projectId 
          ? { ...row, [field]: value }
          : row
      )
    );

    // Queue the change for auto-save
    queueChange(projectId, field, value);
  }, [queueChange]);

  // ── 4) Sync local data when parent jobs prop changes ───────────────────
  useEffect(() => {
    setData(jobs);
  }, [jobs]);

  // ── 5) column sizing hook (cache + server) ───────────────────────────────
  const [prefs, { setColumnSizing, setSorting, setColumnFilters }, prefsLoaded] = useTablePreferences('jobBoard');
  const { columnSizing, sorting, columnFilters } = prefs;

  // ── 6) editable helpers ──────────────────────────────────────────────────
  // Simple editable cell that updates immediately
  const editable = (key) => ({ row, getValue }) => {
    const rowId = row.original._id;
    const initial = getValue() ?? '';
    const [value, setValue] = useState(initial);

    useEffect(() => {
      setValue(getValue() ?? '');
    }, [getValue]);

    const handleChange = (e) => {
      const newValue = e.target.value;
      setValue(newValue);
      updateRow(rowId, key, newValue);
    };

    return (
      <input
        className="border px-2 py-1 w-full text-sm"
        value={value}
        onChange={handleChange}
      />
    );
  };

  // ── 7) column definitions ────────────────────────────────────────────────
  const columns = React.useMemo(
    () =>
      jobBoardColumns(
        updateRow,
        editable,
        exchangeRate,
        config,
        clients,
        openAssignClient
      ),
    [updateRow, editable, exchangeRate, config, clients, openAssignClient]
  );

  // ── 8) table instance ────────────────────────────────────────────────────
  const table = useReactTable({
    data,
    columns,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableSorting: true,
    enableColumnFilters: true,
    meta: { openColumn, setOpenColumn },
    filterFns: {
      arrIncludes: (row, columnId, filterValues) => {
        if (!filterValues || filterValues.length === 0) return true;
        return filterValues.includes(row.getValue(columnId));
      },
    },

    state: {
      columnSizing,
      sorting,
      columnFilters,
    },
    onColumnSizingChange:    setColumnSizing,
    onSortingChange:         setSorting,
    onColumnFiltersChange:   setColumnFilters,
    getCoreRowModel:         getCoreRowModel(),
    getSortedRowModel:       getSortedRowModel(),
    getFilteredRowModel:     getFilteredRowModel(),
    getFacetedRowModel:      getFacetedRowModel(),
    getFacetedUniqueValues:  getFacetedUniqueValues(),
    debugTable:              false,
  });

  // ── 9) only after ALL hooks, guard rendering ─────────────────────────────
  if (!prefsLoaded) {
    return (
      <div className="p-4 text-center">
        Loading your table preferences…
      </div>
    );
  }

  // ── 10) // JobTable.jsx Return Block ──────────────────────────
  return (
    <div className="relative w-full h-[70vh] border rounded-lg flex flex-col">
      <div className="p-2 bg-none border-b flex space-x-2 items-center">
        <button
          onClick={() => table.setColumnFilters([])}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          Clear All Filters
        </button>
        <button
          onClick={() => table.setSorting([])}
          className="px-3 bg-gray-600 hover:bg-gray-700 text-white rounded"
        >
          Reset Sorting
        </button>
        <button
          onClick={saveAll}
          disabled={pendingProjectsCount === 0 || isAutoSaving}
          className={`px-4 py-2 rounded font-medium ${
            pendingProjectsCount > 0 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isAutoSaving ? 'Saving...' : `Save All Changes${pendingProjectsCount > 0 ? ` (${pendingProjectsCount})` : ''}`}
        </button>
        {pendingProjectsCount > 0 && (
          <div className="flex items-center space-x-2 text-sm text-orange-600">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span>{pendingProjectsCount} project{pendingProjectsCount > 1 ? 's' : ''} with unsaved changes</span>
          </div>
        )}
        {isAutoSaving && (
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Auto-saving...</span>
          </div>
        )}
      </div>
      <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-green-600 scrollbar-track-gray-100">
        <table className="min-w-[3500px] border-collapse border border-gray-300 text-sm">
          <thead className="bg-green-600 ">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, colIdx) => (
                  <th
                    key={header.id}
                    className={`border border-gray-300 px-2 h-5 bg-green-600 relative group text-left z-10 ${
                      colIdx === 0 ? 'sticky left-0 z-20' : ''
                    } sticky top-0`}
                    style={{
                      width: header.getSize(),
                      minWidth: header.getSize(),
                    }}
                  >

                    <div className="flex justify-between items-center">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className="resize-handle absolute right-0 top-0 h-full w-1 bg-transparent group-hover:bg-blue-500 cursor-col-resize"
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => {
              const projectId = row.original._id;
              const hasChanges = hasPendingChanges(projectId);
              
              return (
                <tr key={row.id} className={hasChanges ? 'bg-yellow-50' : ''}>
                  {row.getVisibleCells().map((cell, colIdx) => (
                    <td
                      key={cell.id}
                      className={`border border-gray-300 px-3 h-5 whitespace-nowrap overflow-hidden text-ellipsis relative ${
                        colIdx === 0 ? 'sticky left-0 z-10' : ''
                      } ${hasChanges ? 'bg-yellow-50' : 'bg-white'}`}
                      style={colIdx === 0 ? { backgroundColor: hasChanges ? '#fefce8' : 'white' } : {}}
                    >
                      {hasChanges && colIdx === 0 && (
                        <div className="absolute left-1 top-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                      )}
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
