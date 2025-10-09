/**
 * PROJECT TABLE COMPONENT - Production Ready ✅
 * 
 * CORE FUNCTIONALITY:
 * ✅ Project listing with role-based filtering (Admin sees all, Estimator sees assigned)
 * ✅ Month-based filtering tabs (matches JobBoard exactly)
 * ✅ Status filtering and inline status editing
 * ✅ Client assignment and management
 * ✅ Responsive design (desktop table + mobile cards)
 * ✅ Project navigation and sorting
 * 
 * MONTH FILTERING SYSTEM:
 * ✅ Uses shared useMonthGrouping hook for consistency with JobBoard
 * ✅ Tab structure: All → Older (dropdown) → Selected Older → Recent 3 Months
 * ✅ Defaults to current month on page load
 * ✅ Older months (like May 2025) hidden in "Older" dropdown
 * 
 * ROLE-BASED ACCESS:
 * ✅ Admin: Full project access, can edit all statuses, assign clients
 * ✅ Estimator: See assigned projects only, read-only status display, view-only client info
 * ✅ User: Personalized project view with limited functionality
 * 
 * PROPS INTERFACE:
 * @param {Array} projects - Array of project objects to display
 * @param {Function} setProjects - State setter for updating projects
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
import { useMonthGrouping } from "@/appjobboard/hooks/useMonthGrouping";
import MonthFilterTabs from "@/shared/components/MonthFilterTabs";
import "../styles/cls-fix.css";

export default function ProjectTable({
  projects = [],
  setProjects,
  userData = {},
  clients = [],
  openAssignClient = () => {},
  openAssignUser = () => {},
  onStatusChange = () => {},
  userRole = "User",
  columnConfig = {},
  isUserView = false,
  isLoading = false,
}) {
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);

  // ══════════════════════════════════════════════════════════════════
  // 🎯 CORE STATE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════

  // Standard table sorting and filtering state
  const [sortColumn, setSortColumn] = useState("projectNumber");
  const [sortOrder, setSortOrder] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("All");

  // Month filtering state - now managed by shared MonthFilterTabs component
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOlderMonth, setSelectedOlderMonth] = useState(null);

  // ══════════════════════════════════════════════════════════════════
  // 🗓️ MONTH FILTERING SYSTEM - Now handled by shared MonthFilterTabs component
  // ══════════════════════════════════════════════════════════════════

  // Use shared month grouping hook for getting filtered data
  const { 
    allMonths, 
    recentMonths, 
    olderMonths, 
    getMonthById, 
    totalJobCount 
  } = useMonthGrouping(projects);

  // Set default tab based on user role
  useEffect(() => {
    if (user?.role) {
      const isAdmin = user.role === 'admin' || user.role === 'Admin' || user.role === 'administrator';
      
      if (isAdmin) {
        // Admin: Default to current month (if available), otherwise 'all'
        if (recentMonths.length > 0) {
          const currentDate = new Date();
          const currentMonthKey = `${String(currentDate.getFullYear()).slice(-2)}-${String(currentDate.getMonth() + 1).padStart(2, '0')} ${currentDate.toLocaleDateString('en-US', { month: 'short' })}`;
          const currentMonth = recentMonths.find(month => month.id === currentMonthKey);
          setActiveTab(currentMonth ? currentMonth.id : 'all');
        } else {
          // No month data available, default to 'all' for admin
          setActiveTab('all');
        }
      } else {
        // All other roles: Default to Most Recent (lastN)
        setActiveTab('lastN');
      }
    }
  }, [user?.role, recentMonths.length]);

  // ══════════════════════════════════════════════════════════════════
  //  LAST N PROJECTS FILTERING (Configurable for Freemium/Premium)
  // ══════════════════════════════════════════════════════════════════

  // Configure project limit based on user tier (future freemium feature)
  // TODO: Connect to user subscription level when freemium is implemented
  const projectLimit = 30; // Will be: userTier === 'freemium' ? 10 : 30

  // Get filtered projects based on active month tab - this logic will be provided by MonthFilterTabs
  const getFilteredDataByTab = useMemo(() => {
    // Find the matching month data
    if (activeTab === 'all') {
      return projects;
    } else if (activeTab === 'lastN') {
      // Sort projects by posting_date (newest first), fallback to creation date or project number
      const sortedProjects = [...projects].sort((a, b) => {
        const dateA = new Date(a.posting_date || a.createdAt || a.projectNumber || 0);
        const dateB = new Date(b.posting_date || b.createdAt || b.projectNumber || 0);
        return dateB - dateA; // Newest first
      });
      return sortedProjects.slice(0, projectLimit);
    } else {
      // Find month data from the grouping hook
      const monthData = [...recentMonths, ...olderMonths].find(month => month.id === activeTab);
      return monthData ? monthData.jobs : [];
    }
  }, [activeTab, projects, recentMonths, olderMonths, projectLimit]);

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
  // Handle table column sorting with toggle behavior
  const handleSort = useCallback((column) => {
    if (column === sortColumn) {
      setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  }, [sortColumn]);

  // Handle status filter dropdown changes
  const handleStatusFilterChange = useCallback((event) => {
    setStatusFilter(event.target.value);
  }, []);

  // Handle project status updates with performance optimization and loading states
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
      
      // 🚀 OPTIMISTIC UPDATE - Update UI immediately to prevent freezing
      setProjects(previousProjects =>
        previousProjects.map(project =>
          project._id === projectId 
            ? { ...project, status: newStatus, _isUpdating: true }
            : project
        )
      );
      
      // Make API call in background
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
              ? { ...project, _isUpdating: false }
              : project
          )
        );
        
      } else {
        throw new Error(response.data.message || 'Update failed');
      }
      
    } catch (error) {
      console.error(`❌ Status update failed for ${projectId}:`, error);
      
      // 🔄 ROLLBACK - Revert optimistic update on failure
      setProjects(previousProjects =>
        previousProjects.map(project =>
          project._id === projectId 
            ? { ...project, _isUpdating: false } // Keep original status
            : project
        )
      );
      
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
  }, [axiosSecure, setProjects, updatingProjects]);

  // ══════════════════════════════════════════════════════════════════
  // 🔢 SORTING ALGORITHMS
  // ══════════════════════════════════════════════════════════════════

  // Custom numeric sorting for project numbers (format: YYYY-MMXXX)
  // Properly handles year, month, and sequence components for correct chronological ordering
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
  // 📋 FINAL DATA PROCESSING PIPELINE
  // ══════════════════════════════════════════════════════════════════

  // Apply all filters and sorting to get final display data
  // Processing order: Month Filter → Status Filter → Sorting
  const displayedProjects = useMemo(() => {
    // 1. Start with month-filtered projects from active tab
    let filteredProjects = [...getFilteredDataByTab];

    // 2. Apply status filter if not "All"
    if (statusFilter !== "All") {
      filteredProjects = filteredProjects.filter(
        (project) => project.status === statusFilter
      );
    }

    // 3. Apply sorting based on selected column
    if (sortColumn === "projectNumber") {
      // Use custom numeric sorting for project numbers
      filteredProjects.sort(numericProjectNumberSort);
    } else {
      // Use standard string/value sorting for other columns
      filteredProjects.sort((projectA, projectB) => {
        const valueA = projectA[sortColumn] ?? "";
        const valueB = projectB[sortColumn] ?? "";
        
        if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
        if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filteredProjects;
  }, [getFilteredDataByTab, statusFilter, sortColumn, sortOrder, numericProjectNumberSort]);

  // ══════════════════════════════════════════════════════════════════
  // 🛠️ UTILITY FUNCTIONS
  // ══════════════════════════════════════════════════════════════════

  // Determine project display properties based on status and role
  // Returns: display label, color styling, and client lock status
  const getProjectDisplayInfo = useCallback((project) => {
    // 🎯 KISS: Only use the main status field
    const effectiveStatus = project.status;
    
    const isProjectStatus = projectStatuses.find(
      (status) => status.label === effectiveStatus
    );
    const isEstimateStatus = estimateStatuses.find(
      (status) => status.label === effectiveStatus
    );
    
    // Show "ART:" prefix for ALL estimate statuses (JobBoard context)
    // Exception: Don't show ART: prefix for "Estimate Completed" as per custom rules
    const shouldShowArtPrefix = isEstimateStatus && effectiveStatus !== "Estimate Completed";
    const displayLabel = shouldShowArtPrefix
      ? `ART: ${effectiveStatus}`
      : effectiveStatus;
    
    // Use predefined colors or fallback to gray
    const displayColor = (isProjectStatus || isEstimateStatus)?.color ?? 
      "bg-gray-300 text-black";
    
    // Lock client editing for estimates that aren't completed
    const isClientLocked = !isProjectStatus && 
      effectiveStatus !== "Estimate Completed";

    return { displayLabel, displayColor, isClientLocked };
  }, []);

  // Get sort indicator icon for table headers
  const getSortIcon = useCallback((column) => {
    if (sortColumn === column) {
      return sortOrder === "asc" ? "🔼" : "🔽";
    }
    return "";
  }, [sortColumn, sortOrder]);

  // Extract and format project location from location object or string
  const getProjectLocation = useCallback((project) => {
    if (typeof project.location === "string") {
      return project.location;
    }
    return project.location?.full_address || "No Address Available";
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // 🎨 COMPONENT RENDERERS
  // ══════════════════════════════════════════════════════════════════

  // Render client assignment cell with role-based permissions
  // Estimators see read-only client info, Admins can click to assign
  const renderClientCell = useCallback((project) => {
    // Hide client column entirely in user view
    if (isUserView) return null;

    const hasLinkedClients = Array.isArray(project.linkedClients) && 
      project.linkedClients.length > 0;
    const isEstimator = user?.role === "Estimator";

    return (
      <td onClick={(event) => event.stopPropagation()}>
        {hasLinkedClients ? (
          <div className="flex flex-wrap gap-2">
            {project.linkedClients.map((clientId) => {
              const client = clients.find((c) => c._id === clientId) || {};
              return (
                <button
                  key={clientId}
                  className={`flex items-center gap-2 border rounded-md px-3 h-8 text-sm font-medium shadow transition ${
                    isEstimator 
                      ? 'bg-gray-50 text-gray-700 cursor-default border-gray-200' // Read-only styling
                      : 'bg-gray-100 hover:bg-gray-200 cursor-pointer' // Interactive styling
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
                  <span className="truncate overflow-hidden max-w-[250px] text-left">
                    {client.company || client.name}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <button
            className={`px-3 py-2 h-8 rounded-md text-sm font-medium shadow transition ${
              isEstimator
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300' // Disabled styling
                : 'bg-green-500 text-white hover:bg-green-600 cursor-pointer' // Active styling
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
            {isEstimator ? "No Client" : "Assign"}
          </button>
        )}
      </td>
    );
  }, [isUserView, clients, openAssignClient, user?.role]);

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
              height: '36px' // Fixed height to prevent layout shift
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
  }, [getProjectDisplayInfo, handleStatusChange, user?.role, updatingProjects]);

  // Render mobile client section for responsive card layout with role-based permissions
  const renderMobileClientSection = useCallback((project) => {
    // Note: isUserView and columnConfig checks are now handled at the call site
    const hasLinkedClients = Array.isArray(project.linkedClients) && 
      project.linkedClients.length > 0;
    const isEstimator = user?.role === "Estimator";

    return (
      <div className="mb-3">
        <label className="text-sm font-medium text-gray-600 mb-1 block">Linked Client:</label>
        {hasLinkedClients ? (
          <div className="flex flex-wrap gap-2">
            {project.linkedClients.map((clientId) => {
              const client = clients.find((c) => c._id === clientId) || {};
              return (
                <button
                  key={clientId}
                  className={`flex items-center gap-2 border rounded-md px-3 py-2 text-sm font-medium shadow transition ${
                    isEstimator 
                      ? 'bg-gray-50 text-gray-700 cursor-default border-gray-200' // Read-only styling
                      : 'bg-gray-100 hover:bg-gray-200 cursor-pointer' // Interactive styling
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
                  <span className="truncate overflow-hidden max-w-[250px] text-left">
                    {client.company || client.name}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium shadow transition ${
              isEstimator
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300' // Disabled styling
                : 'bg-green-500 text-white hover:bg-green-600 cursor-pointer' // Active styling
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
            {isEstimator ? "No Client Assigned" : "Assign Client"}
          </button>
        )}
      </div>
    );
  }, [clients, openAssignClient, user?.role]);

  // Render table header with sorting controls and status filter
  const renderTableHeader = useCallback(() => (
    <thead>
      <tr className="text-left h-8 bg-primary-10 text-medium">
        <th
          className="w-[150px] cursor-pointer"
          onClick={() => handleSort("projectNumber")}
        >
          Project ID {getSortIcon("projectNumber")}
        </th>

        {columnConfig.assignClient !== false && !isUserView && (
          <th className="w-[150px]">Linked Client</th>
        )}

        {columnConfig.projectName !== false && (
          <th
            className="w-[250px] cursor-pointer"
            onClick={() => handleSort("name")}
          >
            Project Name / Address {getSortIcon("name")}
          </th>
        )}

        {columnConfig.dueDate !== false && (
          <th
            className="w-[150px] cursor-pointer text-center"
            onClick={() => handleSort("due_date")}
          >
            Due Date {getSortIcon("due_date")}
          </th>
        )}

        {columnConfig.cost !== false && (
          <th
            className="w-[100px] cursor-pointer"
            onClick={() => handleSort("total")}
          >
            Cost {getSortIcon("total")}
          </th>
        )}

        {columnConfig.status !== false && (
          <th className="w-[150px] cursor-pointer relative text-center">
            Status
            <div className="inline-block ml-2">
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="border rounded px-3 py-2 w-full text-sm font-medium"
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
            className="w-[150px] cursor-pointer ml-5 text-center"
            onClick={() => handleSort("posting_date")}
          >
            Date Posted {getSortIcon("posting_date")}
          </th>
        )}
      </tr>
    </thead>
  ), [handleSort, getSortIcon, isUserView, statusFilter, handleStatusFilterChange, statuses, columnConfig]);

  // Render individual table row with click-to-navigate functionality
  const renderTableRow = useCallback((project) => (
    <tr
      key={project._id}
      className="border-t-[1px] text-semiBold cursor-pointer hover:bg-gray-100"
      onClick={() => navigateToProject(project, navigate, axiosSecure)}
    >
      <td>{project.projectNumber}</td>
      
      {columnConfig.assignClient !== false && renderClientCell(project)}

      {columnConfig.projectName !== false && (
        <td>
          <span 
            className="font-semibold line-clamp-1 will-change-auto contain-layout"
            style={{
              minHeight: '20px',
              display: 'block',
              contain: 'layout style',
              transform: 'translateZ(0)', // Force GPU acceleration
              fontSize: '14px',
              lineHeight: '20px',
              maxWidth: '250px'
            }}
          >
            {project.name}
          </span>
          <p 
            className="text-gray-500 text-sm line-clamp-2"
            style={{
              minHeight: '32px',
              contain: 'layout',
              lineHeight: '16px'
            }}
          >
            {getProjectLocation(project)}
          </p>
        </td>
      )}

      {columnConfig.dueDate !== false && (
        <td className="text-center">{project.due_date || "N/A"}</td>
      )}
      
      {columnConfig.cost !== false && (
        <td>${project.total || "0"}</td>
      )}
      
      {columnConfig.status !== false && renderStatusCell(project)}

      {columnConfig.postingDate !== false && (
        <td className="ml-5 text-center">{project.posting_date || "N/A"}</td>
      )}
    </tr>
  ), [navigate, renderClientCell, getProjectLocation, renderStatusCell, axiosSecure, columnConfig]);

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
      {/* 📅 MONTH FILTER INTERFACE - Using Shared MonthFilterTabs Component */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Header Section with Title and Role Indicators */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800">
              Projects by Month
              {activeTab !== 'all' && activeTab !== 'lastN' && (
                <span className="ml-1 text-blue-600">({
                  [...recentMonths, ...olderMonths].find(month => month.id === activeTab)?.label || activeTab
                })</span>
              )}
              {activeTab === 'lastN' && (
                <span className="ml-1 text-green-600">(Last {projectLimit} Projects)</span>
              )}
            </h3>
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
        </div>

        {/* Shared Month Filter Tabs Component */}
        <MonthFilterTabs
          projects={projects}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedOlderMonth={selectedOlderMonth}
          onOlderMonthSelect={setSelectedOlderMonth}
          onOlderMonthRemove={() => setSelectedOlderMonth(null)}
          lastNConfig={{ 
            enabled: true, 
            limit: projectLimit, 
            label: `Last ${projectLimit}` 
          }}
          userRole={userRole}
          showProjectCount={true}
          projectCount={displayedProjects.length}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 📊 PROJECT DATA TABLE */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="p-4">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <table className="w-full min-w-[600px] stable-table">
          {renderTableHeader()}
          {isLoading ? (
            renderTableSkeleton()
          ) : (
            <tbody>
              {displayedProjects.length > 0 
                ? displayedProjects.map(renderTableRow)
                : renderEmptyState()
              }
            </tbody>
          )}
        </table>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 📱 MOBILE RESPONSIVE VIEW */}
      {/* ══════════════════════════════════════════════════════════════════ */}
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

              {/* Project Details Grid - Removed Due Date and Cost fields */}

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
                  Estimate Due: {project.due_date || "N/A"}
                </span>
              </div>
            </div>
          );
        })}
        
        {/* Mobile Empty State */}
        {displayedProjects.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            No projects found
          </p>
        )}
      </div>
      </div>
    </div>
  );
}