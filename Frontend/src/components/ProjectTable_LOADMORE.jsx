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

  // Filtering state
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeMonthFilter, setActiveMonthFilter] = useState(null); // Server-side month filter

  // Month tab state
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOlderMonth, setSelectedOlderMonth] = useState(null);
  
  // Month counts (from server)
  const [monthCounts, setMonthCounts] = useState({
    allMonths: [],
    recentMonths: [],
    olderMonths: [],
    totalCount: 0
  });

  // Updating projects state
  const [updatingProjects, setUpdatingProjects] = useState(new Set());

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

      // Add month filter if active
      if (activeMonthFilter) {
        params.month = activeMonthFilter;
      }

      // Add status filter (optional - can be client-side)
      if (statusFilter !== 'All') {
        params.status = statusFilter;
      }

      const response = await axiosSecure.get("/projects/get-projects", { params });

      if (response.data.success) {
        const { 
          data: newProjects = [], 
          pagination = {}, 
          monthCounts: serverMonthCounts = null 
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

        // Update month counts if provided by server
        if (serverMonthCounts) {
          setMonthCounts(serverMonthCounts);
        }

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
  }, [axiosSecure, sortColumn, sortOrder, activeMonthFilter, statusFilter, PROJECTS_PER_PAGE, loadedProjects.length]);

  // Initial load
  useEffect(() => {
    fetchProjects(1, false);
  }, [activeMonthFilter, sortColumn, sortOrder]); // Reload when filters change

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

  // Handle month tab changes - triggers server-side filter
  const handleMonthTabChange = useCallback((tabId) => {
    console.log(`📅 Month tab changed: ${tabId}`);
    setActiveTab(tabId);
    
    // Convert tab ID to month filter for backend
    if (tabId === 'all') {
      setActiveMonthFilter(null); // Clear filter
    } else if (tabId === 'lastN') {
      setActiveMonthFilter('recent-30'); // Special case for last N
    } else {
      // Extract year-month from tab ID (format: "25-11 Nov")
      const monthMatch = tabId.match(/(\d{2})-(\d{2})/);
      if (monthMatch) {
        const [_, year, month] = monthMatch;
        setActiveMonthFilter(`20${year}-${month}`); // Convert to "2025-11"
      } else {
        setActiveMonthFilter(tabId); // Use as-is
      }
    }
    
    // Reset pagination when filter changes
    setCurrentPage(1);
    setLoadedProjects([]);
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
    setActiveMonthFilter(null);
  }, []);

  // Set default tab based on user role
  useEffect(() => {
    if (monthCounts.recentMonths?.length > 0) {
      if (user?.role === 'Estimator' || user?.role === 'estimator') {
        handleMonthTabChange(monthCounts.recentMonths[0].id);
      } else if (user?.role === 'Admin' || user?.role === 'admin') {
        handleMonthTabChange('lastN');
      }
    }
  }, [user?.role, monthCounts.recentMonths, handleMonthTabChange]);

  // ══════════════════════════════════════════════════════════════════
  // 📊 CLIENT-SIDE FILTERING (On Already-Loaded Data)
  // ══════════════════════════════════════════════════════════════════
  
  // Filter loaded projects by status (client-side)
  const filteredProjects = useMemo(() => {
    if (statusFilter === 'All') {
      return loadedProjects;
    }
    return loadedProjects.filter(project => project.status === statusFilter);
  }, [loadedProjects, statusFilter]);

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
    return project.project_name || project.projectName || "Unknown Address";
  }, []);

  // Get project display info
  const getProjectDisplayInfo = useCallback((project) => {
    const status = project.status || "";
    const isEstimateStatus = estimateStatuses.includes(status);
    
    if (userRole === "Admin") {
      return {
        canEdit: true,
        availableStatuses: isEstimateStatus ? estimateStatuses : projectStatuses
      };
    }
    
    return {
      canEdit: false,
      availableStatuses: isEstimateStatus ? estimateStatuses : projectStatuses
    };
  }, [userRole]);

  // Handle status updates
  const handleStatusChange = useCallback(async (projectId, newStatus) => {
    console.log(`🔄 Updating project ${projectId} status to: ${newStatus}`);

    setUpdatingProjects(prev => new Set(prev).add(projectId));

    // Optimistic update
    const originalProjects = [...loadedProjects];
    setLoadedProjects(prevProjects =>
      prevProjects.map(project =>
        project._id === projectId ? { ...project, status: newStatus } : project
      )
    );

    try {
      const response = await axiosSecure.patch(`/projects/${projectId}`, {
        status: newStatus,
      });

      if (response.data.success) {
        console.log(`✅ Project ${projectId} status updated successfully`);
        
        if (onStatusChange) {
          onStatusChange(projectId, newStatus);
        }

        Swal.fire({
          title: "Success",
          text: "Project status updated successfully",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error("❌ Error updating project status:", error);
      setLoadedProjects(originalProjects);
      
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
  }, [axiosSecure, loadedProjects, onStatusChange]);

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
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          {hasClients && clientInfo ? (
            <div className="flex items-center gap-2">
              <Avatar
                name={clientInfo.clientName}
                imageUrl={clientInfo.clientLogo}
                size="xs"
              />
              <span className="text-gray-900 font-medium">
                {clientInfo.clientName}
              </span>
            </div>
          ) : (
            <button
              onClick={() => openAssignClient(project)}
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Assign Client
            </button>
          )}
        </td>
      );
    } else if (userRole === "Estimator") {
      return (
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          {hasClients && clientInfo ? (
            <div className="flex items-center gap-2">
              <Avatar
                name={clientInfo.clientName}
                imageUrl={clientInfo.clientLogo}
                size="xs"
              />
              <span className="text-gray-900 font-medium">
                {clientInfo.clientName}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 italic">No client assigned</span>
          )}
        </td>
      );
    }
    return null;
  }, [clients, userRole, openAssignClient]);

  const renderStatusCell = useCallback((project) => {
    const { canEdit, availableStatuses } = getProjectDisplayInfo(project);
    const isUpdating = updatingProjects.has(project._id);

    if (!canEdit || userRole === "Estimator") {
      return (
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            project.status === 'New Lead' ? 'bg-blue-100 text-blue-800' :
            project.status === 'Estimate Requested' ? 'bg-yellow-100 text-yellow-800' :
            project.status === 'Estimate Completed' ? 'bg-green-100 text-green-800' :
            project.status === 'Quote Sent' ? 'bg-purple-100 text-purple-800' :
            project.status === 'Approved' ? 'bg-teal-100 text-teal-800' :
            project.status === 'Project Active' ? 'bg-indigo-100 text-indigo-800' :
            project.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
            project.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {project.status || 'N/A'}
          </span>
        </td>
      );
    }

    return (
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={project.status || ""}
          onChange={(e) => handleStatusChange(project._id, e.target.value)}
          disabled={isUpdating}
          className={`w-full px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isUpdating ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {availableStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {isUpdating && (
          <div className="absolute inset-0 flex items-center justify-center">
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
      {/* Month Filter Tabs - Pass server counts */}
      <MonthFilterTabs
        projects={[]} // Don't pass loaded projects - use server counts instead
        activeTab={activeTab}
        onTabChange={handleMonthTabChange}
        selectedOlderMonth={selectedOlderMonth}
        onOlderMonthSelect={handleOlderMonthSelect}
        onOlderMonthRemove={handleOlderMonthRemove}
        lastNConfig={lastNConfig}
        userRole={userRole}
        showProjectCount={true}
        projectCount={totalCount}
        serverSideMode={true}
      />

      {/* Status Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">
            Status:
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-600">
          Loaded {filteredProjects.length} of {totalCount} projects
          {hasMore && <span className="ml-2 text-blue-600">(More available)</span>}
        </div>
      </div>

      {/* Projects Table */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("projectNumber")}
              >
                Project ID {getSortIcon("projectNumber")}
              </th>
              {columnConfig.assignClient && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Linked Client
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project Name / Address
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("dueDate")}
              >
                Due Date {getSortIcon("dueDate")}
              </th>
              {columnConfig.cost && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
              )}
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("status")}
              >
                Status {getSortIcon("status")}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("postingDate")}
              >
                Date Posted {getSortIcon("postingDate")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <tr key={project._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    <button
                      onClick={() => navigateToProject(navigate, project)}
                      className="hover:underline"
                    >
                      {project.projectNumber || 'N/A'}
                    </button>
                  </td>
                  {columnConfig.assignClient && renderClientCell(project)}
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {getProjectLocation(project)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {project.dueDate
                      ? new Date(project.dueDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  {columnConfig.cost && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {project.cost ? `$${project.cost}` : 'N/A'}
                    </td>
                  )}
                  {renderStatusCell(project)}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {project.posting_date
                      ? new Date(project.posting_date).toLocaleDateString()
                      : "N/A"}
                  </td>
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
