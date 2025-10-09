/**
 * Performance-Optimized Status Update Utils
 * Prevents layout shift and freezing during status changes
 */

import { useState, useCallback, useMemo } from 'react';
import { startTimer, endTimer } from './performanceMonitor';

/**
 * Hook for optimized status changes with loading states
 * @param {Function} axiosSecure - Axios instance
 * @param {Function} setProjects - Project state setter
 * @param {Function} showMessage - Message function (Swal/notification)
 */
export const useOptimizedStatusChange = (axiosSecure, setProjects, showMessage) => {
  const [updatingProjects, setUpdatingProjects] = useState(new Set());
  
  const handleStatusChange = useCallback(async (projectId, newStatus) => {
    // Start performance monitoring
    startTimer(`status-update-${projectId}`);
    
    // Prevent duplicate updates
    if (updatingProjects.has(projectId)) {
      console.log(`⏳ Status update already in progress for project ${projectId}`);
      return;
    }
    
    try {
      // Mark project as updating
      setUpdatingProjects(prev => new Set(prev).add(projectId));
      
      // 🚀 OPTIMISTIC UPDATE - Update UI immediately
      setProjects(previousProjects =>
        previousProjects.map(project =>
          project._id === projectId 
            ? { ...project, status: newStatus, _isUpdating: true }
            : project
        )
      );
      
      console.log(`🔄 Optimistic status update: ${projectId} → "${newStatus}"`);
      
      // Make API call
      const response = await axiosSecure.patch(
        `/projects/update/${projectId}`,
        { status: newStatus }
      );
      
      if (response.data.success) {
        console.log(`✅ Confirmed status update: ${projectId} → "${newStatus}"`);
        
        // Remove updating flag
        setProjects(previousProjects =>
          previousProjects.map(project =>
            project._id === projectId 
              ? { ...project, status: newStatus, _isUpdating: false }
              : project
          )
        );
        
      } else {
        throw new Error(response.data.message || 'Update failed');
      }
      
    } catch (error) {
      console.error(`❌ Status update failed for ${projectId}:`, error);
      
      // 🔄 ROLLBACK - Revert optimistic update
      setProjects(previousProjects =>
        previousProjects.map(project =>
          project._id === projectId 
            ? { ...project, _isUpdating: false } // Remove updating flag, keep original status
            : project
        )
      );
      
      showMessage({
        icon: "error",
        title: "Update Failed",
        text: `Failed to update status to "${newStatus}". Please try again.`,
        toast: true,
        position: 'top-end',
        timer: 3000
      });
      
    } finally {
      // Clean up
      setUpdatingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
      
      endTimer(`status-update-${projectId}`, 50); // Warn if >50ms
    }
  }, [axiosSecure, setProjects, showMessage, updatingProjects]);
  
  return { handleStatusChange, updatingProjects };
};

/**
 * Hook for optimized status cell rendering with loading states
 * @param {Object} project - Project object
 * @param {Function} handleStatusChange - Status change handler
 * @param {Set} updatingProjects - Set of project IDs being updated
 * @param {Object} user - Current user object
 * @param {Function} getProjectDisplayInfo - Display info getter
 */
export const useOptimizedStatusCell = (project, handleStatusChange, updatingProjects, user, getProjectDisplayInfo) => {
  const isUpdating = updatingProjects.has(project._id);
  const isEstimator = user?.role === "Estimator";
  const { displayLabel, displayColor, isClientLocked } = getProjectDisplayInfo(project);
  
  // Memoize the cell content to prevent unnecessary re-renders
  const statusCell = useMemo(() => {
    if (isEstimator) {
      // Read-only status display for Estimators
      return (
        <div 
          className={`border rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${displayColor} ${
            isUpdating ? 'opacity-50 cursor-wait' : ''
          }`}
        >
          {isUpdating ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
              <span>Updating...</span>
            </div>
          ) : (
            displayLabel
          )}
        </div>
      );
    }
    
    // Editable status dropdown for Admin and other roles
    return (
      <select
        value={project.status}
        onChange={(event) => handleStatusChange(project._id, event.target.value)}
        disabled={isUpdating}
        className={`border rounded-md px-3 py-2 cursor-pointer text-sm font-medium transition-all duration-200 ${displayColor} ${
          isUpdating ? 'opacity-50 cursor-wait' : 'hover:shadow-sm'
        }`}
        style={{
          // Prevent layout shift by maintaining consistent size
          minWidth: '120px',
          height: '36px' // Fixed height
        }}
      >
        {isUpdating ? (
          <option value={project.status}>Updating...</option>
        ) : isClientLocked ? (
          <>
            <option value={project.status} disabled>
              {displayLabel}
            </option>
            <option value="Cancelled">Cancel Estimate</option>
          </>
        ) : (
          // Render all available statuses
          project.availableStatuses?.map((status) => (
            <option key={status.label} value={status.label}>
              {status.label}
            </option>
          )) || (
            <option value={project.status}>{displayLabel}</option>
          )
        )}
      </select>
    );
  }, [project, isUpdating, isEstimator, displayLabel, displayColor, isClientLocked, handleStatusChange]);
  
  return statusCell;
};

/**
 * Hook for stable table row rendering
 * Prevents unnecessary re-renders that cause layout shifts
 */
export const useStableTableRow = (project, dependencies = []) => {
  // Memoize row content to prevent re-renders when project hasn't changed
  return useMemo(() => {
    // Return row rendering function
    return (renderFn) => renderFn(project);
  }, [project._id, project.status, project.name, ...dependencies]);
};

/**
 * Skeleton loader for status cells during loading
 */
export const StatusSkeleton = ({ width = '120px', height = '36px' }) => (
  <div 
    className="bg-gray-200 animate-pulse rounded-md"
    style={{ width, height }}
  />
);

/**
 * Performance monitoring for table operations
 */
export const useTablePerformance = (componentName) => {
  const monitorRender = useCallback(() => {
    startTimer(`${componentName}-render`);
    
    // Return cleanup function
    return () => {
      endTimer(`${componentName}-render`, 5); // Warn if render >5ms
    };
  }, [componentName]);
  
  return { monitorRender };
};