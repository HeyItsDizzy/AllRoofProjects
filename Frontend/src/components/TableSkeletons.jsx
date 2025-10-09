/**
 * Loading Skeleton for ProjectTable
 * Prevents layout shift during data loading
 */

import React from 'react';

export const TableRowSkeleton = ({ columns = 6 }) => (
  <tr className="border-t-[1px] animate-pulse">
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="py-4 px-3">
        <div className="bg-gray-200 rounded h-4 w-full"></div>
        {index === 1 && ( // Project name column - add address line
          <div className="bg-gray-100 rounded h-3 w-3/4 mt-1"></div>
        )}
      </td>
    ))}
  </tr>
);

export const StatusCellSkeleton = () => (
  <div 
    className="bg-gray-200 animate-pulse rounded-md border"
    style={{
      minWidth: '120px',
      height: '36px'
    }}
  />
);

export const ProjectTableSkeleton = ({ rows = 5, columns = 6 }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse">
      <thead className="bg-gray-50">
        <tr>
          {Array.from({ length: columns }).map((_, index) => (
            <th key={index} className="p-4 border-b">
              <div className="bg-gray-300 rounded h-4 w-full"></div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, index) => (
          <TableRowSkeleton key={index} columns={columns} />
        ))}
      </tbody>
    </table>
  </div>
);

export const LoadingTableOverlay = ({ children, isLoading, message = "Loading..." }) => (
  <div className="relative">
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-lg shadow-lg">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-700 font-medium">{message}</span>
        </div>
      </div>
    )}
  </div>
);