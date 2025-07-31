// JobTable.jsx
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
import { Button } from 'antd';
import Avatar from '@/shared/Avatar';   // adjust path to your avatar component
import { useInlineEdits } from '@/appjobboard/hooks/useInlineEdits';
import { saveJobBoardData } from '@/appjobboard/api/jobApi';
import { basePlanTypes } from '@/shared/planTypes';


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
  // pull in our edit hook
  const { pendingEdits, updateLocal, flushEdits } = useInlineEdits(setData, async (rowId, edits) => {
    const fullRow = data.find(r => r._id === rowId);
    if (!fullRow) return;

    const planMeta = basePlanTypes.find(p => p.label === fullRow.PlanType);
    const uom = planMeta?.uom ?? '';
    const price = calculateAUD(fullRow, config.planTypes);
    const qty = parseFloat(fullRow.Qty || 0);
    const total = price && qty ? price * qty : 0;

    await saveJobBoardData(rowId, {
      PlanType: fullRow.PlanType,
      Qty: qty,
      PriceEach: price,
      Total: total,
      uom,
    });

    // Optional: update sync indicator here if you want
  });

  const [syncStatus, setSyncStatus] = useState({});


  // ── Sync local data when parent jobs prop changes ─────────────────────────
  useEffect(() => {
    setData(jobs);
  }, [jobs]);

  // ── 2) column sizing hook (cache + server) ───────────────────────────────
  const [prefs, { setColumnSizing, setSorting, setColumnFilters }, prefsLoaded] = useTablePreferences('jobBoard');
  const { columnSizing, sorting, columnFilters } = prefs;

  // ── 3) editable helpers ──────────────────────────────────────────────────
  // Editable cell: local state + commit on blur + auto-flush
  // 3b) Editable cell: keeps its own local state and only commits on blur
  const editable = (key) => ({ row, getValue }) => {
    const rowId = row.original._id;
    const initial = getValue() ?? '';
    const [value, setValue] = useState(initial);

    useEffect(() => {
      setValue(getValue() ?? '');
    }, [getValue]);

    const onBlur = async () => {
      if (value !== initial) {
        updateLocal(rowId, key, value, setData);
        await flushEdits(rowId);

        // Custom logic to persist job board fields
        const updatedRow = {
          ...row.original,
          [key]: value,
        };

        // Calculate backend values
        const price = calculateAUD(updatedRow, config.planTypes);
        const qty = parseFloat(updatedRow.Qty || 0);
        const total = price && qty ? price * qty : 0;

        await saveJobBoardData(rowId, {
          PlanType: updatedRow.PlanType,
          Qty: qty,
          PriceEach: price,
          Total: total,
        });
      }
    };

    return (
      <input
        className="border px-2 w-full"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={onBlur}
      />
    );
  };



  // ── 4) column definitions ────────────────────────────────────────────────
  const columns = React.useMemo(
    () =>
      jobBoardColumns(
        updateLocal,
        editable,
        exchangeRate,
        config,
        clients,
        openAssignClient
      ),
    [updateLocal, editable, exchangeRate, config, clients, openAssignClient]
  );

  // ── 5) table instance ────────────────────────────────────────────────────
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

  // ── 6) only after ALL hooks, guard rendering ─────────────────────────────
  if (!prefsLoaded) {
    return (
      <div className="p-4 text-center">
        Loading your table preferences…
      </div>
    );
  }

  // ── 7) // JobTable.jsx Return Block ──────────────────────────
  return (
    <div className="relative w-full h-[70vh] border rounded-lg flex flex-col">
      <div className="p-2 bg-none border-b flex space-x-2">
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
          onClick={() => {
            Object.keys(pendingEdits).forEach(id => flushEdits(id));
          }}
          disabled={!Object.keys(pendingEdits).length}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Save All Changes
        </button>
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
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell, colIdx) => (
                  <td
                    key={cell.id}
                    className={`border border-gray-300 px-3 h-5 bg-white whitespace-nowrap overflow-hidden text-ellipsis${
                      colIdx === 0 ? 'sticky left-0 z-10' : ''
                    }`}
                    style={colIdx === 0 ? { backgroundColor: 'white' } : {}}
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
