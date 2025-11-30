/**
 * TABLE PERFORMANCE OPTIMIZATIONS
 * Utilities to improve LCP (Largest Contentful Paint) performance for large tables
 */

import React, { memo, useMemo } from 'react';

/**
 * Optimized project location component with memoization
 * Reduces re-renders of the LCP element (div.text-sm.text-gray-500)
 */
export const ProjectLocation = memo(({ project }) => {
  const location = useMemo(() => {
    if (typeof project.location === "string") {
      return project.location;
    }
    return project.location?.full_address || project.address || project.suburb || "";
  }, [project.location, project.address, project.suburb]);

  return (
    <div className="text-sm text-gray-500">
      {location}
    </div>
  );
});

ProjectLocation.displayName = 'ProjectLocation';

/**
 * Optimized project name component with memoization
 * Prevents unnecessary re-renders of project name cells
 */
export const ProjectName = memo(({ project }) => {
  return (
    <div className="font-semibold text-gray-900 mb-1">
      {project.name}
    </div>
  );
});

ProjectName.displayName = 'ProjectName';

/**
 * Skeleton loader specifically optimized for LCP
 * Uses CSS animations instead of JavaScript for better performance
 */
export const LCPOptimizedSkeleton = memo(({ rows = 5, columns = 6 }) => {
  const skeletonRows = useMemo(() => 
    Array.from({ length: rows }, (_, index) => (
      <tr key={`skeleton-${index}`} className="border-b border-gray-100">
        {Array.from({ length: columns }, (_, colIndex) => (
          <td key={`skeleton-${index}-${colIndex}`} className="py-3 px-4">
            <div className="lcp-skeleton h-4 bg-gray-200 rounded w-full"></div>
          </td>
        ))}
      </tr>
    ))
  , [rows, columns]);

  return (
    <tbody>
      {skeletonRows}
      <style jsx>{`
        .lcp-skeleton {
          animation: lcp-pulse 1.5s ease-in-out infinite;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
        }
        
        @keyframes lcp-pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </tbody>
  );
});

LCPOptimizedSkeleton.displayName = 'LCPOptimizedSkeleton';

/**
 * Optimized table row component with proper memoization
 * Reduces re-renders of table rows during data updates
 */
export const OptimizedTableRow = memo(({ 
  project, 
  columnConfig, 
  isUserView, 
  renderClientCell, 
  renderStatusCell,
  getProjectLocation,
  onClick 
}) => {
  const handleClick = useMemo(() => () => onClick(project), [onClick, project]);

  return (
    <tr
      className="border-t hover:bg-gray-50 cursor-pointer"
      onClick={handleClick}
    >
      <td className="px-4 py-3 font-mono text-sm">{project.projectNumber}</td>
      
      {columnConfig.assignClient !== false && !isUserView && renderClientCell(project)}

      {columnConfig.projectName !== false && (
        <td className="px-4 py-3">
          <ProjectName project={project} />
          <ProjectLocation project={project} />
        </td>
      )}

      {columnConfig.dueDate !== false && (
        <td className="px-4 py-3 text-center text-sm">
          {project.due_date ? new Date(project.due_date).toLocaleDateString() : "N/A"}
        </td>
      )}

      {columnConfig.cost !== false && (
        <td className="px-4 py-3 text-sm">
          {project.total ? `$${Number(project.total).toLocaleString()}` : "N/A"}
        </td>
      )}

      {columnConfig.status !== false && renderStatusCell(project)}

      {columnConfig.postingDate !== false && (
        <td className="px-4 py-3 text-center text-sm">
          {project.posting_date ? new Date(project.posting_date).toLocaleDateString() : "N/A"}
        </td>
      )}
    </tr>
  );
});

OptimizedTableRow.displayName = 'OptimizedTableRow';

/**
 * CSS optimizations for better LCP performance
 */
export const LCPOptimizationCSS = () => (
  <style jsx global>{`
    /* Optimize table rendering performance */
    .lcp-optimized-table {
      table-layout: fixed;
      will-change: auto;
      contain: layout style paint;
    }
    
    /* Reduce layout thrashing */
    .stable-table-cell {
      contain: layout style;
      will-change: auto;
    }
    
    /* Optimize text rendering */
    .optimized-text {
      contain: layout style;
      text-rendering: optimizeSpeed;
      font-display: swap;
    }
    
    /* Prevent layout shifts during loading */
    .stable-container {
      min-height: 400px;
      contain: layout style;
    }
    
    /* Critical CSS for first paint */
    .critical-table-styles {
      border-collapse: collapse;
      width: 100%;
      font-family: system-ui, -apple-system, sans-serif;
    }
  `}</style>
);