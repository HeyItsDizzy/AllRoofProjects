/**
 * PROJECT TABLE COMPONENT - Performance Optimized with Pagination ✅
 * 
 * CORE FUNCTIONALITY:
 * ✅ Server-side paginated project listing (Prevents CLS!)
 * ✅ Role-based filtering (Admin sees all, Estimator sees assigned)
 * ✅ Month-based filtering integrated with pagination
 * ✅ Status filtering and inline status editing
 * ✅ Client assignment and management
 * ✅ Responsive design (desktop table + mobile cards)
 * ✅ Project navigation and sorting
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * ✅ Server-side pagination (50 projects per page vs. ALL projects)
 * ✅ Skeleton loading to prevent layout shifts (CLS = 0)
 * ✅ Optimistic updates for status changes
 * ✅ Stable layout during loading and filtering
 * ✅ Efficient re-rendering with React.memo
 * 
 * MONTH FILTERING SYSTEM:
 * ✅ Compatible with existing MonthFilterTabs component
 * ✅ Server-side month filtering through pagination API
 * ✅ Tab structure: All → Older (dropdown) → Selected Older → Recent 3 Months
 * ✅ Maintains 30-project limit for "lastN" tab
 * 
 * ROLE-BASED ACCESS:
 * ✅ Admin: Full project access, can edit all statuses, assign clients
 * ✅ Estimator: See assigned projects only, read-only status display, view-only client info
 * ✅ User: Personalized project view with limited functionality
 * 
 * PROPS INTERFACE:
 * @param {Object} userData - Current user data object
 * @param {Array} clients - Array of client objects for assignment
 * @param {Function} openAssignClient - Modal opener for client assignment
 * @param {Function} openAssignUser - Modal opener for user assignment
 * @param {Function} onStatusChange - Callback for status changes
 * @param {String} userRole - Current user's role (Admin/Estimator)
 * @param {Object} columnConfig - Column visibility configuration
 * @param {Boolean} isUserView - Whether this is a user-specific view
 */

// src/Components/ProjectTable.jsx
import React, { useState, useMemo, useCallback, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from "@/shared/swalConfig";
import { projectStatuses, estimateStatuses } from "@/shared/projectStatuses";
import Avatar from "@/shared/Avatar";
import { navigateToProject } from "../utils/projectAliasUtils";
import { AuthContext } from "../auth/AuthProvider";
import usePaginatedProjects from "@/hooks/usePaginatedProjects";
import { ProjectTableSkeleton } from "@/components/UI/TableSkeleton";
import PaginationComponent from "@/components/UI/PaginationComponent";
import MonthFilterTabs from "@/shared/components/MonthFilterTabs";
import { 
  ProjectLocation, 
  ProjectName, 
  OptimizedTableRow, 
  LCPOptimizationCSS,
  LCPOptimizedSkeleton
} from "@/components/UI/TablePerformance";
import { 
  useCriticalResourcePreloader, 
  useLazyResourceLoader, 
  usePerformanceBudget 
} from "@/utils/performanceOptimizations";
import "../styles/cls-fix.css";

export default function ProjectTable({
  userData = {},
  clients = [],
  openAssignClient = () => {},
  openAssignUser = () => {},
  onStatusChange = () => {},
  userRole = "User",
  columnConfig = {},
  isUserView = false,
}) {
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);

  // ══════════════════════════════════════════════════════════════════
  // 🚀 PERFORMANCE OPTIMIZATIONS - LCP Improvements
  // ══════════════════════════════════════════════════════════════════
  useCriticalResourcePreloader();
  useLazyResourceLoader();
  usePerformanceBudget();

  // ══════════════════════════════════════════════════════════════════
  // 🚀 PAGINATED PROJECTS HOOK - Performance Optimized!
  // ══════════════════════════════════════════════════════════════════
  const {
    projects,
    pagination,
    filters,
    loading,
    error,
    isEmpty,
    hasProjects,
    updateFilters,
    clearFilters,
    setMonthFilter,
    goToPage,
    nextPage,
    prevPage,
    pageNumbers,
    updateProject,
    removeProject,
    addProject
  } = usePaginatedProjects({
    initialPage: 1,
    pageSize: 50, // Load 50 projects per page instead of ALL
    autoLoad: true,
    cacheKey: `projects-${userRole}`
  });

  // ══════════════════════════════════════════════════════════════════
  // 🎯 CORE STATE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════

  // Standard table sorting state (client-side sorting on current page)
  const [sortColumn, setSortColumn] = useState("projectNumber");
  const [sortOrder, setSortOrder] = useState("desc");

  // Month filtering state - integrated with pagination
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOlderMonth, setSelectedOlderMonth] = useState(null);

  // ══════════════════════════════════════════════════════════════════
  // 🗓️ MONTH FILTERING INTEGRATION
  // ══════════════════════════════════════════════════════════════════

  // Handle month tab changes - triggers server-side filtering
  const handleMonthTabChange = useCallback((tabId) => {
    console.log(`📅 Month tab changed: ${tabId}`);
    setActiveTab(tabId);
    
    // Convert MonthFilterTabs tab ID to backend month filter
    if (tabId === 'all') {
      setMonthFilter(''); // Clear month filter
    } else if (tabId === 'lastN') {
      setMonthFilter(''); // lastN is handled differently - clear month filter but keep lastN logic
    } else {
      setMonthFilter(tabId); // Pass month ID directly to backend
    }
  }, [setMonthFilter]);

  // Handle older month selection from dropdown
  const handleOlderMonthSelect = useCallback((monthId) => {
    setSelectedOlderMonth(monthId);
  }, []);

  // Handle removing selected older month tab
  const handleOlderMonthRemove = useCallback(() => {
    setSelectedOlderMonth(null);
  }, []);

  // Configuration for Last N Projects tab
  const lastNConfig = useMemo(() => ({
    enabled: true,
    limit: 30,
    label: "Most Recent"
  }), []);

  // Handle status filter changes - triggers server-side filtering
  const handleStatusFilterChange = useCallback((event) => {
    const newStatus = event.target.value;
    console.log(`🔍 Status filter changed: ${newStatus}`);
    updateFilters({ status: newStatus });
  }, [updateFilters]);

  // Set default tab based on user role
  useEffect(() => {
    if (user?.role) {
      const isAdmin = user.role === 'admin' || user.role === 'Admin' || user.role === 'administrator';
      
      if (isAdmin) {
        // Admin: Default to current month if available, otherwise 'all'
        const currentDate = new Date();
        const currentMonthKey = `${String(currentDate.getFullYear()).slice(-2)}-${String(currentDate.getMonth() + 1).padStart(2, '0')} ${currentDate.toLocaleDateString('en-US', { month: 'short' })}`;
        handleMonthTabChange(currentMonthKey);
      } else {
        // All other roles: Default to Most Recent (lastN)
        handleMonthTabChange('lastN');
      }
    }
  }, [user?.role, handleMonthTabChange]);

  // ══════════════════════════════════════════════════════════════════
  //  LAST N PROJECTS FILTERING (Compatible with existing behavior)
  // ══════════════════════════════════════════════════════════════════

  // Maintain the 30-project limit for "lastN" tab
  const projectLimit = 30;

  // Client-side filtering for current page data (preserves existing behavior)
  const getFilteredDataByTab = useMemo(() => {
    if (activeTab === 'lastN') {
      // For lastN, take first 30 projects (already sorted by backend)
      return projects.slice(0, projectLimit);
    }
    // For all other tabs, return all projects from current page
    return projects;
  }, [activeTab, projects, projectLimit]);

  // ══════════════════════════════════════════════════════════════════
  // 📊 DATA PROCESSING & BUSINESS LOGIC
  // ══════════════════════════════════════════════════════════════════

  // Combine all available statuses for filtering dropdown
  const statuses = useMemo(() => {
    const seen = new Set();
    return [...projectStatuses, ...estimateStatuses].filter((status) => {
      if (seen.has(status.label)) return false;
      seen.add(status.label);
      return true;
    });
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // 🎛️ EVENT HANDLERS
  // ══════════════════════════════════════════════════════════════════
  
  // Handle table column sorting (client-side sorting of current page)
  const handleSort = useCallback((column) => {
    if (column === sortColumn) {
      setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  }, [sortColumn]);

  // Handle project status updates with optimistic updates and proper error handling
  const [updatingProjects, setUpdatingProjects] = useState(new Set());
  
  const handleStatusChange = useCallback(async (projectId, newStatus) => {
    // Prevent duplicate updates
    if (updatingProjects.has(projectId)) {
      console.log(`⏳ Status update already in progress for project ${projectId}`);
      return;
    }
    
    try {
      console.log(`🔄 Optimistic Status Update: ${projectId} → "${newStatus}"`);
      
      // Mark project as updating
      setUpdatingProjects(prev => new Set(prev).add(projectId));
      
      // 🚀 OPTIMISTIC UPDATE - Update UI immediately using the hook's updateProject method
      updateProject(projectId, { status: newStatus, _isUpdating: true });
      
      // Make API call in background
      const response = await axiosSecure.patch(
        `/projects/update/${projectId}`,
        { status: newStatus }
      );
      
      if (response.data.success) {
        console.log(`✅ Confirmed status update: ${projectId} → "${newStatus}"`);
        
        // Remove updating flag
        updateProject(projectId, { _isUpdating: false });
        
        // Call parent callback if provided
        onStatusChange(projectId, newStatus);
        
      } else {
        throw new Error(response.data.message || 'Update failed');
      }
      
    } catch (error) {
      console.error(`❌ Status update failed for ${projectId}:`, error);
      
      // 🔄 ROLLBACK - Revert optimistic update on failure
      // We need to refresh the data to get the original status
      // updateProject doesn't handle rollbacks, so we refresh the current page
      const currentProject = projects.find(p => p._id === projectId);
      if (currentProject) {
        updateProject(projectId, { 
          status: currentProject.status, // Keep original status
          _isUpdating: false 
        });
      }
      
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: `Failed to update status to "${newStatus}". Please try again.`,
        toast: true,
        position: 'top-end',
        timer: 3000
      });
      
    } finally {
      // Clean up updating state
      setUpdatingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  }, [axiosSecure, updateProject, projects, onStatusChange, updatingProjects]);

  // ══════════════════════════════════════════════════════════════════
  // 🔢 SORTING ALGORITHMS (Client-side sorting of current page)
  // ══════════════════════════════════════════════════════════════════

  // Custom numeric sorting for project numbers (format: YYYY-MMXXX)
  const numericProjectNumberSort = useCallback(
    (projectA, projectB) => {
      const [yearA, restA] = (projectA.projectNumber || "0-00000").split("-");
      const [yearB, restB] = (projectB.projectNumber || "0-00000").split("-");
      
      const yearNumA = parseInt(yearA);
      const yearNumB = parseInt(yearB);
      
      // Sort by year first
      if (yearNumA !== yearNumB) {
        return sortOrder === "asc" 
          ? yearNumA - yearNumB 
          : yearNumB - yearNumA;
      }
      
      // If same year, sort by month
      const monthA = parseInt(restA.slice(0, 2));
      const monthB = parseInt(restB.slice(0, 2));
      
      if (monthA !== monthB) {
        return sortOrder === "asc" 
          ? monthA - monthB 
          : monthB - monthA;
      }
      
      // If same year and month, sort by sequence number
      const sequenceA = parseInt(restA.slice(2));
      const sequenceB = parseInt(restB.slice(2));
      
      return sortOrder === "asc" 
        ? sequenceA - sequenceB 
        : sequenceB - sequenceA;
    },
    [sortOrder]
  );

  // ══════════════════════════════════════════════════════════════════
  // 📋 FINAL DATA PROCESSING PIPELINE (Client-side only)
  // ══════════════════════════════════════════════════════════════════

  // Apply client-side sorting to current page data (server filtering already applied)
  // Note: Status filtering is now handled server-side through the pagination hook
  const displayedProjects = useMemo(() => {
    // Start with projects from pagination hook (server-filtered)
    let sortableProjects = [...projects];

    // Apply client-side sorting based on selected column
    if (sortColumn === "projectNumber") {
      // Use custom numeric sorting for project numbers
      sortableProjects.sort(numericProjectNumberSort);
    } else {
      // Use standard string/value sorting for other columns
      sortableProjects.sort((projectA, projectB) => {
        const valueA = projectA[sortColumn] ?? "";
        const valueB = projectB[sortColumn] ?? "";
        
        if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
        if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return sortableProjects;
  }, [projects, sortColumn, sortOrder, numericProjectNumberSort]);

  // ══════════════════════════════════════════════════════════════════
  // 🛠️ UTILITY FUNCTIONS
  // ══════════════════════════════════════════════════════════════════

  // Get sort icon for table headers
  const getSortIcon = useCallback((column) => {
    if (column !== sortColumn) return " ↕️";
    return sortOrder === "asc" ? " ↗️" : " ↘️";
  }, [sortColumn, sortOrder]);

  // Get project location string
  const getProjectLocation = useCallback((project) => {
    if (typeof project.location === "string") {
      return project.location;
    }
    return project.location?.full_address || project.address || project.suburb || "";
  }, []);

  // Determine project display properties based on status and role
  const getProjectDisplayInfo = useCallback((project) => {
    const effectiveStatus = project.status;
    
    const isProjectStatus = projectStatuses.find(
      (status) => status.label === effectiveStatus
    );
    const isEstimateStatus = estimateStatuses.find(
      (status) => status.label === effectiveStatus
    );
    
    // Show "ART:" prefix for ALL estimate statuses (JobBoard context)
    const shouldShowArtPrefix = isEstimateStatus && effectiveStatus !== "Estimate Completed";
    
    return {
      displayLabel: shouldShowArtPrefix ? `ART: ${effectiveStatus}` : effectiveStatus,
      displayColor: isEstimateStatus 
        ? "bg-blue-50 text-blue-700 border-blue-200" 
        : "bg-gray-50 text-gray-700 border-gray-200",
      isClientLocked: effectiveStatus === "Quote Approved" || effectiveStatus === "Project Active"
    };
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // 🎨 RENDER COMPONENTS
  // ══════════════════════════════════════════════════════════════════

  // Render client assignment cell
  const renderClientCell = useCallback((project) => {
    const hasLinkedClients = Array.isArray(project.linkedClients) && 
      project.linkedClients.length > 0;
    const isEstimator = user?.role === "Estimator";

    return (
      <td onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap gap-2">
          {hasLinkedClients ? (
            project.linkedClients.map((clientId) => {
              const client = clients.find((c) => c._id === clientId) || {};
              return (
                <button
                  key={clientId}
                  className={`flex items-center gap-2 border rounded-md px-3 h-8 text-sm font-medium shadow transition ${
                    isEstimator 
                      ? 'bg-gray-50 text-gray-700 cursor-default border-gray-200'
                      : 'bg-gray-100 hover:bg-gray-200 cursor-pointer'
                  }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isEstimator) {
                      openAssignClient(project);
                    }
                  }}
                  disabled={isEstimator}
                  title={isEstimator ? "View only - Contact admin to modify client assignments" : "Click to modify client assignment"}
                >
                  <Avatar
                    name={client.company || client.name}
                    avatarUrl={client.avatar}
                    size="sm"
                  />
                  <span className="truncate overflow-hidden max-w-[200px] text-left">
                    {client.company || client.name}
                  </span>
                </button>
              );
            })
          ) : (
            <button
              className={`px-3 py-2 h-8 rounded-md text-sm font-medium shadow transition ${
                isEstimator
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'
                  : 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
              }`}
              onClick={(event) => {
                event.stopPropagation();
                if (!isEstimator) {
                  openAssignClient(project);
                }
              }}
              disabled={isEstimator}
              title={isEstimator ? "Contact admin to assign clients" : "Click to assign client"}
            >
              {isEstimator ? "No Client" : "Assign Client"}
            </button>
          )}
        </div>
      </td>
    );
  }, [clients, openAssignClient, user?.role]);

  // Render status cell with performance optimization and loading states
  const renderStatusCell = useCallback((project) => {
    const { displayLabel, displayColor, isClientLocked } = getProjectDisplayInfo(project);
    const isEstimator = user?.role === "Estimator";
    const isUpdating = updatingProjects.has(project._id);
    
    return (
      <td onClick={(event) => event.stopPropagation()} className="text-center">
        {isEstimator ? (
          // Read-only status display for Estimators with loading state
          <div 
            className={`border rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${displayColor} ${
              isUpdating ? 'opacity-60 cursor-wait' : ''
            }`}
            style={{
              minWidth: '120px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
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
        ) : (
          // Editable status dropdown with loading state
          <select
            value={project.status}
            onChange={(event) => handleStatusChange(project._id, event.target.value)}
            disabled={isUpdating}
            className={`border rounded-md px-3 py-2 cursor-pointer text-sm font-medium transition-all duration-200 ${displayColor} ${
              isUpdating ? 'opacity-60 cursor-wait' : 'hover:shadow-sm'
            }`}
            style={{
              minWidth: '120px',
              height: '36px'
            }}
          >
            {isUpdating ? (
              <option value={project.status}>Updating...</option>
            ) : isClientLocked ? (
              <>
                <option value={project.status} disabled>
                  {displayLabel}
                </option>
                <option value="Cancelled">Cancel Project</option>
              </>
            ) : (
              projectStatuses.map((status) => (
                <option key={status.label} value={status.label}>
                  {status.label}
                </option>
              ))
            )}
          </select>
        )}
      </td>
    );
  }, [getProjectDisplayInfo, user?.role, updatingProjects, handleStatusChange]);

  // Render table header with sorting controls and status filter
  const renderTableHeader = useCallback(() => (
    <thead>
      <tr className="text-left h-8 bg-gray-50 text-sm font-medium">
        <th
          className="w-[150px] cursor-pointer px-4 py-3"
          onClick={() => handleSort("projectNumber")}
        >
          Project ID {getSortIcon("projectNumber")}
        </th>

        {columnConfig.assignClient !== false && !isUserView && (
          <th className="w-[200px] px-4 py-3">Linked Client</th>
        )}

        {columnConfig.projectName !== false && (
          <th
            className="w-[250px] cursor-pointer px-4 py-3"
            onClick={() => handleSort("name")}
          >
            Project Name / Address {getSortIcon("name")}
          </th>
        )}

        {columnConfig.dueDate !== false && (
          <th
            className="w-[150px] cursor-pointer text-center px-4 py-3"
            onClick={() => handleSort("due_date")}
          >
            Due Date {getSortIcon("due_date")}
          </th>
        )}

        {columnConfig.cost !== false && (
          <th
            className="w-[100px] cursor-pointer px-4 py-3"
            onClick={() => handleSort("total")}
          >
            Cost {getSortIcon("total")}
          </th>
        )}

        {columnConfig.status !== false && (
          <th className="w-[150px] text-center px-4 py-3">
            Status
            <div className="inline-block ml-2">
              <select
                value={filters.status || 'All'}
                onChange={handleStatusFilterChange}
                className="border rounded px-2 py-1 text-xs font-normal"
                disabled={loading}
              >
                <option value="All">All</option>
                {statuses.map((status) => (
                  <option key={status.label} value={status.label}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </th>
        )}

        {columnConfig.postingDate !== false && (
          <th
            className="w-[150px] cursor-pointer text-center px-4 py-3"
            onClick={() => handleSort("posting_date")}
          >
            Date Posted {getSortIcon("posting_date")}
          </th>
        )}
      </tr>
    </thead>
  ), [handleSort, getSortIcon, isUserView, filters.status, handleStatusFilterChange, statuses, columnConfig, loading]);

  // Render individual table row with click-to-navigate functionality
  const renderTableRow = useCallback((project) => (
    <tr
      key={project._id}
      className="border-t hover:bg-gray-50 cursor-pointer"
      onClick={() => navigateToProject(project, navigate, axiosSecure)}
    >
      <td className="px-4 py-3 font-mono text-sm">{project.projectNumber}</td>
      
      {columnConfig.assignClient !== false && !isUserView && renderClientCell(project)}

      {columnConfig.projectName !== false && (
        <td className="px-4 py-3">
          <div className="font-semibold text-gray-900 mb-1">
            {project.name}
          </div>
          <div className="text-sm text-gray-500">
            {getProjectLocation(project)}
          </div>
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
  ), [columnConfig, isUserView, renderClientCell, getProjectLocation, renderStatusCell, navigate, axiosSecure]);

  // Render mobile client section
  const renderMobileClientSection = useCallback((project) => {
    const hasLinkedClients = Array.isArray(project.linkedClients) && 
      project.linkedClients.length > 0;
    const isEstimator = user?.role === "Estimator";

    return (
      <div className="mb-3">
        <label className="text-sm font-medium text-gray-600 mb-1 block">Client:</label>
        {hasLinkedClients ? (
          <div className="flex flex-wrap gap-1">
            {project.linkedClients.map((clientId) => {
              const client = clients.find((c) => c._id === clientId) || {};
              return (
                <span
                  key={clientId}
                  className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs"
                >
                  <Avatar
                    name={client.company || client.name}
                    avatarUrl={client.avatar}
                    size="xs"
                  />
                  {client.company || client.name}
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-sm text-gray-500">No client assigned</span>
        )}
      </div>
    );
  }, [clients, user?.role]);











  // Render empty state when no projects match current filters
  const renderEmptyState = useCallback(() => {
    // Calculate colspan based on visible columns for proper table formatting
    let colspan = 1; // Project ID always visible
    if (columnConfig.assignClient !== false && !isUserView) colspan++;
    if (columnConfig.projectName !== false) colspan++;
    if (columnConfig.dueDate !== false) colspan++;
    if (columnConfig.cost !== false) colspan++;
    if (columnConfig.status !== false) colspan++;
    if (columnConfig.postingDate !== false) colspan++;
    
    return (
      <tr>
        <td colSpan={colspan} className="text-center py-4">
          No projects found
        </td>
      </tr>
    );
  }, [isUserView, columnConfig]);

  // Skeleton loader for preventing layout shifts during loading
  const renderTableSkeleton = useCallback(() => {
    const skeletonRows = Array.from({ length: 5 }, (_, index) => (
      <tr key={`skeleton-${index}`} className="border-b border-gray-100">
        <td className="py-3"><div className="table-skeleton"></div></td>
        {columnConfig.assignClient !== false && !isUserView && (
          <td className="py-3"><div className="table-skeleton"></div></td>
        )}
        {columnConfig.projectName !== false && (
          <td className="py-3"><div className="table-skeleton"></div></td>
        )}
        {columnConfig.dueDate !== false && (
          <td className="py-3"><div className="table-skeleton"></div></td>
        )}
        {columnConfig.cost !== false && (
          <td className="py-3"><div className="table-skeleton"></div></td>
        )}
        {columnConfig.status !== false && (
          <td className="py-3"><div className="table-skeleton"></div></td>
        )}
        {columnConfig.postingDate !== false && (
          <td className="py-3"><div className="table-skeleton"></div></td>
        )}
      </tr>
    ));
    
    return (
      <tbody>
        {skeletonRows}
      </tbody>
    );
  }, [columnConfig, isUserView]);

  // Mobile skeleton loader
  const renderMobileSkeleton = useCallback(() => {
    const skeletonCards = Array.from({ length: 3 }, (_, index) => (
      <div key={`mobile-skeleton-${index}`} className="bg-white p-5 rounded-lg shadow-md border border-gray-300">
        <div className="mb-3">
          <div className="flex justify-between items-start mb-2">
            <div className="table-skeleton h-4 w-20"></div>
            <div className="table-skeleton h-4 w-16"></div>
          </div>
          <div className="table-skeleton h-6 w-full mb-1"></div>
          <div className="table-skeleton h-4 w-3/4"></div>
        </div>
        <div className="space-y-2">
          <div className="table-skeleton h-4 w-full"></div>
          <div className="table-skeleton h-4 w-2/3"></div>
          <div className="table-skeleton h-4 w-1/2"></div>
        </div>
      </div>
    ));
    
    return skeletonCards;
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // 🎨 MAIN COMPONENT RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="overflow-x-auto bg-white rounded-md">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* � PAGINATED PROJECT INTERFACE - Performance Optimized */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Header Section with Title and Pagination Info */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800">
              Projects
              {filters.month && (
                <span className="ml-1 text-blue-600">({filters.month})</span>
              )}
              {activeTab === 'lastN' && (
                <span className="ml-1 text-green-600">(Last {projectLimit})</span>
              )}
            </h3>
            {/* Pagination Summary */}
            {pagination.totalProjects > 0 && (
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {pagination.totalProjects.toLocaleString()} total projects
              </span>
            )}
            {/* Development Mode Role Indicators (Hidden in Production) */}
            {process.env.NODE_ENV === 'development' && userRole === 'Estimator' && (
              <div className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                Estimator View: Your Assigned Projects
              </div>
            )}
            {process.env.NODE_ENV === 'development' && userRole === 'Admin' && (
              <div className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                Admin View: All Projects
              </div>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded border border-red-200">
                {error}
              </div>
            )}
            {filters.status && filters.status !== 'All' && (
              <button
                onClick={() => updateFilters({ status: 'All' })}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Clear Status Filter
              </button>
            )}
          </div>
        </div>

        {/* Month Filter Tabs Container - Matching JobTable styling */}
        <div className="flex flex-col space-y-2 p-2 bg-gray-50 border-b">
          {/* Month Filter Tabs - Server-Side Pagination Compatible */}
          <MonthFilterTabs
            projects={[]} // Empty for server-side mode
            activeTab={activeTab}
            onTabChange={handleMonthTabChange}
            selectedOlderMonth={selectedOlderMonth}
            onOlderMonthSelect={handleOlderMonthSelect}
            onOlderMonthRemove={handleOlderMonthRemove}
            lastNConfig={lastNConfig}
            userRole={user?.role || 'User'}
            showProjectCount={true}
            projectCount={pagination.totalProjects}
            serverSideMode={true}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 📊 PROJECT DATA TABLE */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="p-4">
        {/* Show loading skeleton during initial load or when filtering */}
        {loading ? (
          <div className="stable-container">
            <LCPOptimizationCSS />
            <table className="w-full min-w-[600px] lcp-optimized-table critical-table-styles">
              {renderTableHeader()}
              <LCPOptimizedSkeleton rows={10} columns={6} />
            </table>
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Failed to Load Projects</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Retry
            </button>
          </div>
        ) : isEmpty ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Projects Found</h3>
            <p className="text-gray-600">
              {filters.status && filters.status !== 'All' 
                ? `No projects found with status "${filters.status}"`
                : activeTab === 'lastN'
                ? 'No recent projects available'
                : 'No projects match your current filters'
              }
            </p>
            {(filters.status || filters.search || filters.month) && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block stable-container">
              <LCPOptimizationCSS />
              <table className="w-full min-w-[600px] stable-table lcp-optimized-table critical-table-styles">
                {renderTableHeader()}
                <tbody>
                  {displayedProjects.map((project) => (
                    <OptimizedTableRow
                      key={project._id}
                      project={project}
                      columnConfig={columnConfig}
                      isUserView={isUserView}
                      renderClientCell={renderClientCell}
                      renderStatusCell={renderStatusCell}
                      getProjectLocation={getProjectLocation}
                      onClick={(project) => navigateToProject(project, navigate, axiosSecure)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* ═══════════════════ MOBILE RESPONSIVE VIEW ═══════════════════ */}
            <div className="md:hidden space-y-4 px-2">
              {displayedProjects.map((project) => {
                const { displayLabel, displayColor, isClientLocked } = getProjectDisplayInfo(project);

                return (
                  <div
                    key={project._id}
                    className="bg-white p-5 rounded-lg shadow-md border border-gray-300 hover:shadow-lg transition cursor-pointer"
                    onClick={() => navigateToProject(project, navigate, axiosSecure)}
                  >
                    {/* Project Header */}
                    <div className="mb-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-600">Project ID:</span>
                        <span className="text-sm font-semibold">{project.projectNumber}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
                      <p className="text-sm text-gray-600">{getProjectLocation(project)}</p>
                    </div>

                    {/* Client Assignment Section - Role-based visibility */}
                    {columnConfig.assignClient !== false && !isUserView && renderMobileClientSection(project)}

                    {/* Status Section with Role-based Editing */}
                    <div className="mb-3">
                      <label className="text-sm font-medium text-gray-600 mb-1 block">Status:</label>
                      <div onClick={(event) => event.stopPropagation()}>
                        {user?.role === "Estimator" ? (
                          // Read-only status for Estimators in mobile view
                          <div className={`border rounded-md px-3 py-2 text-sm font-medium w-full ${displayColor}`}>
                            {displayLabel}
                          </div>
                        ) : (
                          // Editable status dropdown for Admin and other roles
                          <select
                            value={project.status}
                            onChange={(event) =>
                              handleStatusChange(project._id, event.target.value)
                            }
                            className={`border rounded-md px-3 py-2 cursor-pointer text-sm font-medium w-full ${displayColor}`}
                          >
                            {isClientLocked ? (
                              <>
                                <option value={project.status} disabled>
                                  {displayLabel}
                                </option>
                                <option value="Cancelled">Cancel Estimate</option>
                              </>
                            ) : (
                              projectStatuses.map((status) => (
                                <option key={status.label} value={status.label}>
                                  {status.label}
                                </option>
                              ))
                            )}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Project Footer */}
                    <div className="text-right">
                      <span className="text-xs text-gray-500">
                        Due Date: {project.due_date || "N/A"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ═══════════════════ PAGINATION COMPONENT ═══════════════════ */}
            <PaginationComponent
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalProjects}
              itemsPerPage={pagination.projectsPerPage}
              onPageChange={goToPage}
              loading={loading}
              disabled={false}
              showFirstLast={true}
              showResultsInfo={true}
              maxVisiblePages={7}
              size="medium"
              className="mt-6"
            />
          </>
        )}
      </div>
    </div>
  );
}
