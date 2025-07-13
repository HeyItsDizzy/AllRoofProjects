// JobTable.jsx
import React, { useMemo, useState, useEffect, useContext } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import { AuthContext } from '@/auth/AuthProvider';
import { useColumnSizing } from '@/appjobboard/hooks/useColumnSizing';
import { jobBoardColumns } from '@/appjobboard/config/JobBoardConfig';
import { calculateEstCost, calculatePay, calculateNOK } from '@/appjobboard/utils/formulaLogic'; //Possibly legacy not required

export default function JobTable({ jobs, config, exchangeRate }) {
  const [data, setData] = useState(jobs);
  const [columnSizing, setColumnSizing] = useColumnSizing('jobBoard');
const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    return () => {
      // Only write if valid and changed
      if (user?.id && Object.keys(columnSizing).length > 0) {
        axiosSecure.post('/api/user-preferences/column-sizing', {
          userId: user.id,
          tableKey: 'jobBoard',
          columnSizing,
        }).catch(err => {
          console.warn('Failed to persist column widths:', err);
        });
      }
    };
  }, [columnSizing, user]);

  const updateRow = (rowIndex, key, value) => {
    setData(old =>
      old.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row))
    );
  };

  const editable = (key) => ({ row, getValue }) => (
    <input
      value={getValue() || ''}
      onChange={e => updateRow(row.index, key, e.target.value)}
      className="border px-2 py-1 w-full"
    />
  );

const columns = useMemo(
  () => jobBoardColumns(updateRow, editable, exchangeRate, config),
  [updateRow, editable, exchangeRate, config]
);

const table = useReactTable({
  data,
  columns,
  columnResizeMode: 'onChange',
  enableColumnResizing: true,
  state: {
    columnSizing,
  },
  onColumnSizingChange: (updater) => {
    const newState = typeof updater === 'function' ? updater(columnSizing) : updater;
    setColumnSizing(newState);
    localStorage.setItem('jobBoardColumnSizing', JSON.stringify(newState));
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  debugTable: false,
});

// JobTable.jsx Return Block
return (
  <div className="relative w-full h-[70vh] border rounded-lg flex flex-col">
    <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-green-600 scrollbar-track-gray-100">
      <table className="min-w-[3500px] border text-sm">
        <thead className="bg-gray-100">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, colIdx) => (
                <th
                  key={header.id}
                  className={`border px-2 py-1 relative group text-left bg-white z-10 ${
                    colIdx === 0 ? 'sticky left-0 z-20' : ''
                  } sticky top-0`}
                  style={{
                    width: header.getSize(),
                    minWidth: header.getSize(),
                    backgroundColor: 'white',
                  }}
                >
                  <div className="flex justify-between items-center">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className="resize-handle absolute right-0 top-0 h-full w-1 bg-gray-300 group-hover:bg-blue-500 cursor-col-resize"
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
                  className={`border px-2 py-1 bg-white ${
                    colIdx === 0 ? 'sticky left-0 z-10' : ''
                  }`}
                  style={colIdx === 0 ? { backgroundColor: 'white' } : {}}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
