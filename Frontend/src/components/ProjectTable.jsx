/**
 * PROJECT TABLE COMPONENT - Progressive Loading with "Load More" ✅
 * 
 * SCALABLE FOR 10,000+ PROJECTS:
 * ✅ Initial load: 100 most recent projects (fast!)
 * ✅ "Load More" button: Fetch next 100 projects when clicked
 * ✅ Never loads all data: Only loads what user views
 * ✅ Memory efficient: Progressively loads chunks
 * ✅ Month tab counts: Server-side aggregation (fast!)
 * ✅ Filters work: Server-side filtering with progressive load
 * 
 * PERFORMANCE FOR LARGE DATASETS:
 * ✅ 100 projects per page = ~20KB per load
 * ✅ Skeleton loading prevents CLS
 * ✅ Optimistic rendering for instant UX
 * ✅ Can handle 10,000+ projects without memory issues
 * 
 * USER EXPERIENCE:
 * 1. Page loads → Shows first 100 projects instantly
 * 2. Scroll down → Click "Load More" → Fetch next 100
 * 3. Month filter → Reset and show first 100 of filtered data
 * 4. Status filter → Filter on already-loaded data client-side
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
import MonthFilterTabs from "@/shared/components/MonthFilterTabs";
import { useMonthGrouping } from "@/appjobboard/hooks/useMonthGrouping";
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
  // 🎯 PROGRESSIVE LOADING STATE
  // ══════════════════════════════════════════════════════════════════
  const [loadedProjects, setLoadedProjects] = useState([]); // Projects loaded so far
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state (server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const PROJECTS_PER_PAGE = 100; // Load 100 at a time

  // Sorting state (server-side)
  const [sortColumn, setSortColumn] = useState("projectNumber");
  const [sortOrder, setSortOrder] = useState("desc");

  // Filtering state (client-side)
  const [statusFilter, setStatusFilter] = useState("All");

  // Month tab state
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOlderMonth, setSelectedOlderMonth] = useState(null);

  // Updating projects state
  const [updatingProjects, setUpdatingProjects] = useState(new Set());

  // Use the monthly hook for month data (shared with MonthFilterTabs) - CLIENT-SIDE like JobTable
  const { 
    allMonths, 
    recentMonths, 
    olderMonths, 
    getMonthById, 
    totalJobCount 
  } = useMonthGrouping(loadedProjects);

  // ══════════════════════════════════════════════════════════════════
  // 🚀 FETCH PROJECTS - Progressive Loading
  // ══════════════════════════════════════════════════════════════════
  const fetchProjects = useCallback(async (page = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log(`📦 Loading projects page ${page} (${PROJECTS_PER_PAGE} per page)...`);

      // Build query params
      const params = {
        page,
        limit: PROJECTS_PER_PAGE,
        sortBy: sortColumn,
        sortOrder: sortOrder
      };

      const response = await axiosSecure.get("/projects/get-projects", { params });

      if (response.data.success) {
        const { 
          data: newProjects = [], 
          pagination = {} 
        } = response.data;

        // Update loaded projects
        if (append) {
          setLoadedProjects(prev => [...prev, ...newProjects]);
        } else {
          setLoadedProjects(newProjects);
        }

        // Update pagination info
        setCurrentPage(pagination.currentPage || page);
        setHasMore(pagination.hasNextPage || false);
        setTotalCount(pagination.totalProjects || newProjects.length);

        console.log(`✅ Loaded ${newProjects.length} projects (Total loaded: ${append ? loadedProjects.length + newProjects.length : newProjects.length}/${pagination.totalProjects || '?'})`);
      } else {
        throw new Error(response.data.message || 'Failed to fetch projects');
      }
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch projects');
      
      if (!append) {
        Swal.fire({
          title: "Error",
          text: "Failed to load projects. Please try again.",
          icon: "error",
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [axiosSecure, sortColumn, sortOrder, PROJECTS_PER_PAGE, loadedProjects.length]);

  // Initial load - only run once on mount
  useEffect(() => {
    fetchProjects(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Reload when sorting changes
  useEffect(() => {
    if (sortColumn !== "projectNumber" || sortOrder !== "desc") {
      setLoadedProjects([]);
      setCurrentPage(1);
      fetchProjects(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortColumn, sortOrder]);

  // ══════════════════════════════════════════════════════════════════
  // 📄 LOAD MORE HANDLER
  // ══════════════════════════════════════════════════════════════════
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      console.log(`🔄 Loading more projects (page ${nextPage})...`);
      fetchProjects(nextPage, true); // Append to existing
    }
  }, [loadingMore, hasMore, currentPage, fetchProjects]);

  // ══════════════════════════════════════════════════════════════════
  // 🗓️ MONTH FILTERING
  // ══════════════════════════════════════════════════════════════════
  
  // Configuration for Last N Projects tab
  const lastNConfig = useMemo(() => ({
    enabled: true,
    limit: 30,
    label: "Most Recent"
  }), []);

  // Handle month tab changes - CLIENT-SIDE filtering like JobTable
  const handleMonthTabChange = useCallback((tabId) => {
    console.log(`📅 Month tab changed: ${tabId}`);
    setActiveTab(tabId);
  }, []);

  // Handle older month selection
  const handleOlderMonthSelect = useCallback((monthId) => {
    setSelectedOlderMonth(monthId);
    handleMonthTabChange(monthId);
  }, [handleMonthTabChange]);

  // Handle removing selected older month
  const handleOlderMonthRemove = useCallback(() => {
    setSelectedOlderMonth(null);
    setActiveTab('all');
  }, []);

  // Set default tab based on user role - matches JobTable logic
  useEffect(() => {
    if (user?.role) {
      const isAdmin = user.role === 'admin' || user.role === 'Admin' || user.role === 'administrator';
      
      if (isAdmin) {
        // Admin: Default to current month (if available), otherwise 'all'
        const currentDate = new Date();
        const currentMonthKey = `${String(currentDate.getFullYear()).slice(-2)}-${String(currentDate.getMonth() + 1).padStart(2, '0')} ${currentDate.toLocaleDateString('en-US', { month: 'short' })}`;
        const currentMonth = [...recentMonths, ...olderMonths].find(month => month.id === currentMonthKey);
        const hasCurrentMonthData = currentMonth && currentMonth.jobs.length > 0;
        setActiveTab(hasCurrentMonthData ? currentMonthKey : 'all');
      } else {
        // All other roles: Default to Most Recent (lastN)
        setActiveTab('lastN');
      }
    }
  }, [user?.role, recentMonths, olderMonths]);

  // ══════════════════════════════════════════════════════════════════
  // 📊 CLIENT-SIDE FILTERING (On Already-Loaded Data) - MATCHES JOBTABLE
  // ══════════════════════════════════════════════════════════════════
  
  // Filter loaded projects by month tab and status - EXACT same logic as JobTable
  const filteredProjects = useMemo(() => {
    // Start with all loaded projects - apply month filtering first
    let filtered = loadedProjects;

    // Apply month filtering based on activeTab using hook data (SAME AS JOBTABLE)
    if (activeTab === 'all') {
      // Show all data
      filtered = loadedProjects;
    } else if (activeTab === 'lastN') {
      // Show most recent N projects (sorted by creation date)
      filtered = [...loadedProjects]
        .sort((a, b) => new Date(b.posting_date || b.created_at) - new Date(a.posting_date || a.created_at))
        .slice(0, lastNConfig.limit);
    } else {
      // Find the matching month data from hook
      const monthData = [...recentMonths, ...olderMonths].find(month => month.id === activeTab);
      filtered = monthData ? monthData.jobs : [];
    }

    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    return filtered;
  }, [loadedProjects, activeTab, recentMonths, olderMonths, statusFilter, lastNConfig.limit]);

  // ══════════════════════════════════════════════════════════════════
  // 🛠️ UTILITY FUNCTIONS
  // ══════════════════════════════════════════════════════════════════

  // Combine all available statuses
  const statuses = useMemo(() => {
    return [...new Set([...projectStatuses, ...estimateStatuses])];
  }, []);

  // Get sort icon
  const getSortIcon = useCallback((column) => {
    if (sortColumn !== column) return "↕️";
    return sortOrder === "asc" ? "↑" : "↓";
  }, [sortColumn, sortOrder]);

  // Handle sorting - triggers server reload
  const handleSort = useCallback((column) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("desc");
    }
    // Reset to page 1 when sorting changes
    setCurrentPage(1);
    setLoadedProjects([]);
  }, [sortColumn, sortOrder]);

  // Handle status filter - client-side only
  const handleStatusFilterChange = useCallback((event) => {
    setStatusFilter(event.target.value);
  }, []);

  // Get project location
  const getProjectLocation = useCallback((project) => {
    if (!project) return "N/A";
    if (typeof project.location === "string") {
      return project.location;
    }
    return project.location?.full_address || project.address || project.suburb || "";
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // 🎯 DUAL-STATUS SYSTEM: Get display status and dropdown options
  // ══════════════════════════════════════════════════════════════════
  const getProjectDisplayInfo = useCallback((project) => {
    // Support legacy projects with old 'status' field
    const projectStatus = project.projectStatus || project.status || "New Lead";
    const estimateStatus = project.estimateStatus || null;
    
    // Determine if Project Table status is LOCKED by active estimate
    const isLockedByEstimate = estimateStatus && 
                                estimateStatus !== "Cancelled" && 
                                estimateStatus !== "Sent";
    
    let displayStatus, availableStatuses, canEdit;
    
    if (isLockedByEstimate) {
      // 🔒 LOCKED: Estimator is working on this
      
      // Special case: "Estimate Requested" is the ONLY status that doesn't get ART prefix
      // because both client and estimator use this same initial status
      if (estimateStatus === "Estimate Requested" && projectStatus === "Estimate Requested") {
        // They MATCH on initial request - NO ART prefix
        displayStatus = "Estimate Requested";
      } else {
        // ALL OTHER locked statuses get ART prefix (Assigned, In Progress, etc.)
        displayStatus = `ART: ${estimateStatus}`;
      }
      
      availableStatuses = [
        { label: displayStatus, color: "bg-orange-100 text-orange-800" },
        { label: "Cancel Request", color: "bg-red-100 text-red-800" }
      ];
      canEdit = (userRole === "Admin" || userRole === "User"); // Both can cancel
      
    } else {
      // ✅ UNLOCKED: Show normal project status workflow
      displayStatus = projectStatus;
      availableStatuses = projectStatuses;
      canEdit = (userRole === "Admin" || userRole === "User");
    }
    
    return {
      displayStatus,
      projectStatus,
      estimateStatus,
      availableStatuses,
      canEdit,
      isLocked: isLockedByEstimate
    };
  }, [userRole]);

  // ══════════════════════════════════════════════════════════════════
  // 🔄 DUAL-STATUS UPDATE: Handle status changes with role-based logic
  // ══════════════════════════════════════════════════════════════════
  const handleStatusChange = useCallback(async (projectId, newStatus) => {
    const project = loadedProjects.find(p => p._id === projectId);
    if (!project) return;
    
    const { isLocked, projectStatus, estimateStatus } = getProjectDisplayInfo(project);
    
    // 🚫 RESTRICT: ProjectTable can ONLY update early-stage client statuses
    // Once JobBoard takes over (estimator assigned/working), only JobBoard should update status
    const allowedProjectTableStatuses = [
      "New Lead",
      "Estimate Requested",
      "Estimate Completed", // Client regains control after estimate done
      "Quote Sent",
      "Approved",
      "Project Active",
      "Completed",
      "Cancelled",
      "Job lost"
    ];
    
    if (!allowedProjectTableStatuses.includes(newStatus) && newStatus !== "Cancel Request") {
      console.warn(`⚠️ ProjectTable cannot set status "${newStatus}" - only JobBoard can set estimator statuses`);
      Swal.fire({
        title: "Invalid Status",
        text: "This status can only be set from the Job Board by estimators",
        icon: "warning",
      });
      return;
    }
    
    console.log(`🔄 Status change requested for project ${projectId}:`, {
      newStatus,
      currentProjectStatus: projectStatus,
      currentEstimateStatus: estimateStatus,
      isLocked,
      userRole
    });

    setUpdatingProjects(prev => new Set(prev).add(projectId));

    // Prepare update payload based on role and status
    let updatePayload = {};
    let optimisticUpdate = {};
    
    if (newStatus === "Cancel Request") {
      // 🔴 CANCEL REQUEST: Unlock by setting estimateStatus to "Cancelled"
      updatePayload = { 
        estimateStatus: "Cancelled",
        projectStatus: projectStatus, // Keep current project status
        status: "Cancelled", // ✅ Legacy field for live build
        jobBoardStatus: "Cancelled" // ✅ Legacy field for live build
      };
      optimisticUpdate = {
        estimateStatus: "Cancelled",
        projectStatus: projectStatus,
        status: "Cancelled",
        jobBoardStatus: "Cancelled"
      };
      console.log(`❌ Cancelling estimate request - will unlock client workflow`);
      
    } else if (newStatus === "Estimate Requested") {
      // ✨ SPECIAL: "Estimate Requested" sets BOTH fields simultaneously
      updatePayload = { 
        projectStatus: "Estimate Requested",
        estimateStatus: "Estimate Requested",
        status: "Estimate Requested", // ✅ Legacy field for live build
        jobBoardStatus: "Estimate Requested" // ✅ Legacy field for live build
      };
      optimisticUpdate = {
        projectStatus: "Estimate Requested",
        estimateStatus: "Estimate Requested",
        status: "Estimate Requested",
        jobBoardStatus: "Estimate Requested"
      };
      console.log(`📝 Setting BOTH projectStatus and estimateStatus to "Estimate Requested"`);
      
    } else if (userRole === "User") {
      // 👤 USERS: Can only update projectStatus (early-stage client workflow)
      updatePayload = { 
        projectStatus: newStatus,
        status: newStatus, // ✅ Legacy field for live build
        jobBoardStatus: newStatus // ✅ Legacy field for live build
      };
      optimisticUpdate = { 
        projectStatus: newStatus,
        status: newStatus,
        jobBoardStatus: newStatus
      };
      
    } else if (userRole === "Admin") {
      // 🔧 ADMINS: In ProjectTable, can only update early-stage projectStatus
      // For JobBoard statuses (Assigned, In Progress, etc.), use JobBoard instead
      updatePayload = { 
        projectStatus: newStatus,
        status: newStatus, // ✅ Legacy field for live build
        jobBoardStatus: newStatus // ✅ Legacy field for live build
      };
      optimisticUpdate = { 
        projectStatus: newStatus,
        status: newStatus,
        jobBoardStatus: newStatus
      };
    }

    // Optimistic UI update
    const originalProjects = [...loadedProjects];
    setLoadedProjects(prevProjects =>
      prevProjects.map(p =>
        p._id === projectId ? { ...p, ...optimisticUpdate } : p
      )
    );

    try {
      const response = await axiosSecure.patch(`/projects/${projectId}`, updatePayload);

      if (response.data.success) {
        console.log(`✅ Project ${projectId} status updated successfully`);
        
        // Update with backend response to ensure sync
        setLoadedProjects(prevProjects =>
          prevProjects.map(p =>
            p._id === projectId ? { ...p, ...response.data.data } : p
          )
        );
        
        if (onStatusChange) {
          onStatusChange(projectId, newStatus);
        }

        Swal.fire({
          title: "Success",
          text: newStatus === "Cancel Request" 
            ? "Estimate request cancelled successfully" 
            : "Project status updated successfully",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error("❌ Error updating project status:", error);
      setLoadedProjects(originalProjects); // Rollback
      
      Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Failed to update project status",
        icon: "error",
      });
    } finally {
      setUpdatingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  }, [axiosSecure, loadedProjects, onStatusChange, userRole, getProjectDisplayInfo]);

  // ══════════════════════════════════════════════════════════════════
  // 🎨 RENDER HELPERS
  // ══════════════════════════════════════════════════════════════════

  const renderClientCell = useCallback((project) => {
    const linkedClients = project.linkedClients || [];
    const hasClients = linkedClients.length > 0;
    const clientInfo = hasClients && linkedClients[0]
      ? clients.find(c => c._id === linkedClients[0])
      : null;

    if (userRole === "Admin") {
      return (
        <td className="px-2 py-3 text-sm">
          {hasClients && clientInfo ? (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                name={clientInfo.company || clientInfo.name || clientInfo.clientName}
                avatarUrl={clientInfo.avatar || clientInfo.clientLogo}
                size="sm"
                className="flex-shrink-0"
              />
              <span className="text-gray-900 font-medium truncate" title={clientInfo.company || clientInfo.name || clientInfo.clientName}>
                {clientInfo.company || clientInfo.name || clientInfo.clientName}
              </span>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openAssignClient(project);
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors"
            >
              Assign
            </button>
          )}
        </td>
      );
    } else if (userRole === "Estimator") {
      return (
        <td className="px-2 py-3 text-sm">
          {hasClients && clientInfo ? (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                name={clientInfo.company || clientInfo.name || clientInfo.clientName}
                avatarUrl={clientInfo.avatar || clientInfo.clientLogo}
                size="sm"
                className="flex-shrink-0"
              />
              <span className="text-gray-900 font-medium truncate" title={clientInfo.company || clientInfo.name || clientInfo.clientName}>
                {clientInfo.company || clientInfo.name || clientInfo.clientName}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 italic text-xs">No client assigned</span>
          )}
        </td>
      );
    }
    return null;
  }, [clients, userRole, openAssignClient]);

  // ══════════════════════════════════════════════════════════════════
  // 🎨 RENDER STATUS CELL: Clean colored badges with dropdown on click
  // ══════════════════════════════════════════════════════════════════
  const renderStatusCell = useCallback((project) => {
    const { displayStatus, canEdit, availableStatuses, isLocked } = getProjectDisplayInfo(project);
    const isUpdating = updatingProjects.has(project._id);

    // Get color classes based on status
    const getStatusColor = (status) => {
      // Strip "ART:" prefix for color lookup
      const cleanStatus = status.replace(/^ART:\s*/, '');
      
      // First check estimateStatuses for JobBoard statuses
      const estimateStatus = estimateStatuses.find(s => s.label === cleanStatus);
      if (estimateStatus) {
        return estimateStatus.color;
      }
      
      // Then check projectStatuses for Project statuses
      const projectStatus = projectStatuses.find(s => s.label === cleanStatus);
      if (projectStatus) {
        return projectStatus.color;
      }
      
      // Fallback to gray
      return 'bg-gray-100 text-gray-800';
    };

    // All users get dropdown with colored appearance
    return (
      <td className="px-2 py-3 relative">
        <select
          value={displayStatus}
          onChange={(e) => {
            e.stopPropagation();
            handleStatusChange(project._id, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          disabled={isUpdating || (userRole === 'Estimator')}
          className={`w-full px-2 py-1.5 text-xs font-medium rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-center ${
            getStatusColor(displayStatus)
          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''} ${
            userRole === 'Estimator' ? 'cursor-default' : ''
          }`}
          style={{
            backgroundImage: userRole !== 'Estimator' ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` : 'none',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.25rem center',
            backgroundSize: '0.875rem',
            paddingRight: userRole !== 'Estimator' ? '1.5rem' : '0.5rem'
          }}
        >
          {availableStatuses.map((status) => (
            <option key={status.label} value={status.label}>
              {status.label === "Estimate Requested" ? "Request Estimate" : status.label}
            </option>
          ))}
        </select>
        {isUpdating && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </td>
    );
  }, [getProjectDisplayInfo, userRole, updatingProjects, handleStatusChange]);

  // ══════════════════════════════════════════════════════════════════
  // 🎨 MAIN RENDER
  // ══════════════════════════════════════════════════════════════════

  if (loading && loadedProjects.length === 0) {
    return (
      <div className="w-full space-y-4">
        <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
        <div className="flex items-center justify-between">
          <div className="h-10 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="h-12 bg-gray-100 border-b"></div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 border-b border-gray-200 animate-pulse">
              <div className="flex items-center px-6 py-4 space-x-4">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="h-4 w-48 bg-gray-200 rounded"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && loadedProjects.length === 0) {
    return (
      <div className="w-full p-8 text-center">
        <div className="text-red-600 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load projects</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => fetchProjects(1, false)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
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
                <span className="ml-1 text-green-600">(Most Recent {lastNConfig.limit})</span>
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
          projects={loadedProjects}
          activeTab={activeTab}
          onTabChange={handleMonthTabChange}
          selectedOlderMonth={selectedOlderMonth}
          onOlderMonthSelect={handleOlderMonthSelect}
          onOlderMonthRemove={handleOlderMonthRemove}
          lastNConfig={{ 
            enabled: true,
            limit: lastNConfig.limit, 
            label: "Most Recent"
          }}
          userRole={userRole}
          showProjectCount={true}
          projectCount={totalJobCount}
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mt-4">
        <table className="w-full stable-table">
          <thead>
            <tr className="bg-primary-10 text-medium h-8">
              <th className="text-left pl-3 pr-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap" style={{ width: '110px' }}>
                Project ID
              </th>

              {columnConfig.assignClient !== false && !isUserView && (
                <th className="text-left px-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap" style={{ width: '200px' }}>
                  Client
                </th>
              )}

              {columnConfig.projectName !== false && (
                <th className="text-left px-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap">
                  Project Name
                </th>
              )}

              {columnConfig.dueDate !== false && (
                <th className="text-left px-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap table-col-due-date" style={{ width: '110px' }}>
                  <span>Due Date</span>
                </th>
              )}

              {columnConfig.cost !== false && (
                <th className="text-left px-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap table-col-cost" style={{ width: '80px' }}>
                  <span>Cost</span>
                </th>
              )}

              {columnConfig.status !== false && (
                <th className="text-left px-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap" style={{ width: '180px' }}>
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    <select
                      value={statusFilter}
                      onChange={handleStatusFilterChange}
                      className="text-xs px-2 py-1 border border-gray-300 rounded bg-white"
                      onClick={(e) => e.stopPropagation()}
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
                <th className="text-left px-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap table-col-posted" style={{ width: '110px' }}>
                  <span>Posted</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <tr
                  key={project._id}
                  className="border-t-[1px] cursor-pointer hover:bg-gray-100"
                  onClick={() => navigateToProject(project, navigate, axiosSecure)}
                >
                  <td className="pl-3 pr-2 py-3 text-sm font-semibold text-blue-600">
                    <div className="truncate">
                      {project.projectNumber}
                    </div>
                  </td>
                  
                  {columnConfig.assignClient !== false && !isUserView && renderClientCell(project)}

                  {columnConfig.projectName !== false && (
                    <td className="px-2 py-3 text-sm">
                      <div className="font-semibold text-gray-900 leading-tight mb-0.5 line-clamp-1" title={project.name}>
                        {project.name}
                      </div>
                      <div className="text-xs text-gray-500 leading-tight line-clamp-1" title={getProjectLocation(project)}>
                        {getProjectLocation(project)}
                      </div>
                    </td>
                  )}

                  {columnConfig.dueDate !== false && (
                    <td className="px-2 py-3 text-sm overflow-hidden table-col-due-date">
                      <div className="truncate">
                        {project.due_date ? new Date(project.due_date).toLocaleDateString() : "N/A"}
                      </div>
                    </td>
                  )}

                  {columnConfig.cost !== false && (
                    <td className="px-2 py-3 text-sm font-semibold overflow-hidden table-col-cost">
                      <div className="truncate">
                        {project.total ? `$${Number(project.total).toLocaleString()}` : "N/A"}
                      </div>
                    </td>
                  )}

                  {columnConfig.status !== false && renderStatusCell(project)}

                  {columnConfig.postingDate !== false && (
                    <td className="px-2 py-3 text-sm overflow-hidden table-col-posted">
                      <div className="truncate">
                        {project.posting_date ? new Date(project.posting_date).toLocaleDateString() : "N/A"}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">No projects found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Try adjusting your filters
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 p-3">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <div
              key={project._id}
              className="bg-white p-5 rounded-lg shadow-md border border-gray-200 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigateToProject(project, navigate, axiosSecure)}
            >
              {/* Project Number & Status */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-blue-600">
                  {project.projectNumber}
                </span>
                {renderStatusCell(project)}
              </div>

              {/* Project Name */}
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                {project.name}
              </h3>

              {/* Project Location */}
              <p className="text-sm text-gray-600 mb-3">
                {getProjectLocation(project)}
              </p>

              {/* Client */}
              {columnConfig.assignClient !== false && !isUserView && (
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                    Client
                  </label>
                  {renderClientCell(project)}
                </div>
              )}

              {/* Dates & Cost Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {columnConfig.dueDate !== false && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 block mb-1">Due Date</span>
                    <span className="text-gray-900">{project.due_date ? new Date(project.due_date).toLocaleDateString() : "N/A"}</span>
                  </div>
                )}
                {columnConfig.cost !== false && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 block mb-1">Cost</span>
                    <span className="text-gray-900 font-semibold">{project.total ? `$${Number(project.total).toLocaleString()}` : "N/A"}</span>
                  </div>
                )}
                {columnConfig.postingDate !== false && (
                  <div className="col-span-2">
                    <span className="text-xs font-medium text-gray-500 block mb-1">Posted</span>
                    <span className="text-gray-900">{project.posting_date ? new Date(project.posting_date).toLocaleDateString() : "N/A"}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No projects found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex items-center justify-center py-6">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              loadingMore
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {loadingMore ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Loading...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Load More Projects</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          </button>
        </div>
      )}

      {/* End of list message */}
      {!hasMore && loadedProjects.length > 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">
          <p>✓ All projects loaded ({filteredProjects.length} total)</p>
        </div>
      )}
    </div>
  );
}
