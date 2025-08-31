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

  // Month filtering state (matches JobBoard exactly)
  // - activeTab: Currently selected month tab ('all', month ID, or 'older')
  // - selectedOlderMonth: When user clicks older month from dropdown, becomes separate tab
  // - showOlderDropdown: Controls visibility of older months dropdown menu
  // - dropdownPosition: Absolute positioning for dropdown menu
  // - hasUserSelectedTab: Tracks if user has made an explicit tab selection (prevents auto-selection override)
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOlderMonth, setSelectedOlderMonth] = useState(null);
  const [showOlderDropdown, setShowOlderDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [hasUserSelectedTab, setHasUserSelectedTab] = useState(false);

  // ══════════════════════════════════════════════════════════════════
  // 🗓️ MONTH FILTERING SYSTEM (Matches JobBoard Exactly)
  // ══════════════════════════════════════════════════════════════════

  // Use shared month grouping hook for consistency with JobBoard
  // Returns: allMonths, recentMonths (last 3), olderMonths, helper functions
  const { 
    allMonths, 
    recentMonths, 
    olderMonths, 
    getMonthById, 
    totalJobCount 
  } = useMonthGrouping(projects);

  // Generate tab structure matching JobBoard exactly:
  // 1. All Projects → 2. Older (dropdown) → 3. Selected Older → 4. Recent 3 Months
  const tabData = useMemo(() => {
    const tabs = [];

    // 1. All tab - shows all projects regardless of date
    tabs.push({
      id: 'all',
      label: 'All Projects',
      count: projects.length,
      jobs: projects // Use original projects array
    });

    // 2. Older dropdown tab - aggregates all months older than recent 3
    // This hides older months (like May 2025) in a dropdown menu
    const olderTotalCount = olderMonths.reduce((sum, month) => sum + month.count, 0);
    tabs.push({
      id: 'older',
      label: 'Older',
      count: olderTotalCount,
      isDropdown: true,
      dropdownOptions: olderMonths,
      jobs: olderMonths.flatMap(month => month.jobs)
    });

    // 3. Selected older month as separate tab (when user clicks from dropdown)
    // This creates a temporary tab next to "Older" with close button
    if (selectedOlderMonth) {
      const selectedMonth = getMonthById(selectedOlderMonth);
      if (selectedMonth) {
        tabs.push({
          ...selectedMonth,
          isSelectedOlder: true // Flag to show close button
        });
      }
    }

    // 4. Recent 3 months in chronological order (2 months ago → last month → current month)
    // Reversed because useMonthGrouping returns newest first
    const orderedRecentMonths = [...recentMonths].reverse(); // Reverse to get oldest to newest
    orderedRecentMonths.forEach(month => {
      tabs.push(month);
    });

    return tabs;
  }, [projects, recentMonths, olderMonths, selectedOlderMonth, getMonthById]);

  // Auto-select appropriate default tab based on user role
  // Users default to "All" projects, Admin/Estimator default to current month
  useEffect(() => {
    // Only set default tab if user hasn't made any explicit selection (initial load only)
    if (!hasUserSelectedTab && activeTab === 'all') {
      // For Users: stay on "All" tab (don't change activeTab)
      if (userRole === "User") {
        console.log("👤 User role detected → keeping 'All' tab as default");
        return; // Keep activeTab as 'all'
      }
      
      // For Admin/Estimator: auto-select current month if available
      if (recentMonths.length > 0) {
        const currentMonth = recentMonths[0];
        if (currentMonth) {
          console.log(`👔 ${userRole} role detected → auto-selecting current month: ${currentMonth.label}`);
          setActiveTab(currentMonth.id);
        }
      }
    }
  }, [recentMonths, activeTab, hasUserSelectedTab, userRole]);

  // Handle clicks outside dropdown to close it (matches JobBoard behavior)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showOlderDropdown && !event.target.closest('.dropdown-container')) {
        setShowOlderDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOlderDropdown]);

  // Position dropdown menu relative to "Older" button (matches JobBoard positioning)
  const handleDropdownToggle = (event) => {
    if (!showOlderDropdown) {
      const rect = event.target.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
    setShowOlderDropdown(!showOlderDropdown);
  };

  // Get filtered projects based on active month tab
  const getFilteredDataByTab = useMemo(() => {
    const currentTab = tabData.find(tab => tab.id === activeTab);
    if (!currentTab) return projects;
    
    const result = currentTab.id === 'all' ? projects : currentTab.jobs || [];
    
    // Development logging for debugging month filters
    if (process.env.NODE_ENV === 'development') {
      console.log(`🗂️ Month Filter: ${currentTab.label} (${activeTab}) → ${result.length} projects`);
    }
    
    return result;
  }, [tabData, activeTab, projects]);

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

  // Handle project status updates with API call and optimistic UI updates
  const handleStatusChange = useCallback(async (projectId, newStatus) => {
    try {
      const response = await axiosSecure.patch(
        `/projects/update-status/${projectId}`,
        { status: newStatus }
      );
      
      if (response.data.success) {
        setProjects((previousProjects) =>
          previousProjects.map((project) =>
            project._id === projectId 
              ? { ...project, status: newStatus } 
              : project
          )
        );
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to update status. Please try again.",
      });
    }
  }, [axiosSecure, setProjects]);

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
    const isProjectStatus = projectStatuses.find(
      (status) => status.label === project.status
    );
    const isEstimateStatus = estimateStatuses.find(
      (status) => status.label === project.status
    );
    
    // Format estimate statuses with "ART:" prefix for clarity
    const displayLabel = isEstimateStatus && !isProjectStatus
      ? `ART: ${project.status}`
      : project.status;
    
    // Use predefined colors or fallback to gray
    const displayColor = (isProjectStatus || isEstimateStatus)?.color ?? 
      "bg-gray-300 text-black";
    
    // Lock client editing for estimates that aren't completed
    const isClientLocked = !isProjectStatus && 
      project.status !== "Estimate Completed";

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

  // Render status cell with role-based editing permissions
  // Estimators see read-only display, Admins get editable dropdown
  const renderStatusCell = useCallback((project) => {
    const { displayLabel, displayColor, isClientLocked } = getProjectDisplayInfo(project);
    const isEstimator = user?.role === "Estimator";
    
    return (
      <td onClick={(event) => event.stopPropagation()} className="text-center">
        {isEstimator ? (
          // Read-only status display for Estimators - looks like original but unclickable
          <div className={`border rounded-md px-3 py-2 text-sm font-medium ${displayColor}`}>
            {displayLabel}
          </div>
        ) : (
          // Editable status dropdown for Admin and other roles
          <select
            value={project.status}
            onChange={(event) =>
              handleStatusChange(project._id, event.target.value)
            }
            className={`border rounded-md px-3 py-2 cursor-pointer text-sm font-medium ${displayColor}`}
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
      </td>
    );
  }, [getProjectDisplayInfo, handleStatusChange, user?.role]);

  // Render mobile client section for responsive card layout with role-based permissions
  const renderMobileClientSection = useCallback((project) => {
    if (isUserView) return null;

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
  }, [isUserView, clients, openAssignClient, user?.role]);

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
          <span className="font-semibold line-clamp-1">{project.name}</span>
          <p className="text-gray-500 text-sm line-clamp-2">
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

  // ══════════════════════════════════════════════════════════════════
  // 🎨 MAIN COMPONENT RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="overflow-x-auto bg-white rounded-md">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 📅 MONTH FILTER INTERFACE - Matches JobBoard Design Exactly */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Header Section with Title and Role Indicators */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800">
              Projects by Month
              {activeTab !== 'all' && (
                <span className="ml-1 text-blue-600">({tabData.find(t => t.id === activeTab)?.label})</span>
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

        {/* Month Filter Tabs - EXACT MATCH TO JOBTABLE */}
        <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 p-2 bg-gray-50">
          {tabData.map(tab => (
            <div key={tab.id} className="relative">
              {tab.isDropdown ? (
                // Dropdown for "Older" tab
                <div className="relative dropdown-container">
                  <button
                    onClick={handleDropdownToggle}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center ${
                      activeTab === tab.id || tab.dropdownOptions?.some(opt => opt.id === activeTab)
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id || tab.dropdownOptions?.some(opt => opt.id === activeTab)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                    <svg className={`ml-1 w-3 h-3 transition-transform ${showOlderDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                // Regular tab (including selected older month tabs)
                <div className="relative">
                  <button
                    onClick={() => {
                      console.log(`🎯 Tab clicked: ${tab.label} (${tab.id})`);
                      setActiveTab(tab.id);
                      setHasUserSelectedTab(true); // Mark that user has made explicit selection
                    }}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } ${
                      tab.isSelectedOlder 
                        ? 'pr-8' 
                        : ''
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                  {/* Close button for selected older month tabs */}
                  {tab.isSelectedOlder && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOlderMonth(null);
                        setActiveTab('all');
                        setHasUserSelectedTab(true); // Mark that user has made explicit selection
                      }}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 w-4 h-4 flex items-center justify-center z-10"
                      title="Remove this month tab"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 📊 PROJECT DATA TABLE */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="p-4">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <table className="w-full min-w-[600px]">
          {renderTableHeader()}
          <tbody>
            {displayedProjects.length > 0 
              ? displayedProjects.map(renderTableRow)
              : renderEmptyState()
            }
          </tbody>
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

              {/* Client Assignment Section */}
              {renderMobileClientSection(project)}

              {/* Project Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 block">Due Date:</label>
                  <span className="text-sm">{project.due_date || "N/A"}</span>
                </div>
                {/* Hide Cost for Estimators - Role-based visibility */}
                {user?.role !== "Estimator" && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 block">Cost:</label>
                    <span className="text-sm font-semibold">${project.total || "0"}</span>
                  </div>
                )}
              </div>

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
                  Posted: {project.posting_date || "N/A"}
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
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 📅 OLDER MONTHS DROPDOWN MENU - Matches JobBoard Exactly */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showOlderDropdown && (
        <div 
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-200 min-w-[200px] max-h-[400px] overflow-y-auto pointer-events-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {tabData.find(tab => tab.isDropdown)?.dropdownOptions?.map((option, index) => (
            <div
              key={option.id}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedOlderMonth(option.id);
                setActiveTab(option.id);
                setShowOlderDropdown(false);
                setHasUserSelectedTab(true); // Mark that user has made explicit selection
              }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between transition-colors pointer-events-auto cursor-pointer ${
                selectedOlderMonth === option.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              } ${index === 0 ? 'rounded-t-lg' : ''} ${index === tabData.find(tab => tab.isDropdown)?.dropdownOptions?.length - 1 ? 'rounded-b-lg' : ''}`}
              style={{ zIndex: 99999, position: 'relative' }}
            >
              <span className="font-medium">{option.label}</span>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                selectedOlderMonth === option.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {option.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}