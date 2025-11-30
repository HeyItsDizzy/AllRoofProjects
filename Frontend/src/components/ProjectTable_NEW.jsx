/**
 * PROJECT TABLE COMPONENT - Client-Side Pagination (Like UserManagement) ✅
 * 
 * CORE FUNCTIONALITY:
 * ✅ Client-side paginated project listing (20 per page)
 * ✅ Month-based filtering with MonthFilterTabs (with counts!)
 * ✅ Status filtering dropdown
 * ✅ Role-based filtering (Admin sees all, Estimator sees assigned)
 * ✅ Client assignment and management
 * ✅ Responsive design (desktop table + mobile cards)
 * ✅ Simple pagination like UserManagement (Page 1: 1-20, Page 2: 21-40)
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
  // 🎯 CORE STATE MANAGEMENT - Fetch ALL Projects
  // ══════════════════════════════════════════════════════════════════
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sorting state
  const [sortColumn, setSortColumn] = useState("projectNumber");
  const [sortOrder, setSortOrder] = useState("desc");

  // Status filter state
  const [statusFilter, setStatusFilter] = useState("All");

  // Month filtering state
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOlderMonth, setSelectedOlderMonth] = useState(null);

  // Pagination state (like UserManagement)
  const [currentPage, setCurrentPage] = useState(1);
  const [projectsPerPage] = useState(20);

  // Updating projects state (for loading indicators)
  const [updatingProjects, setUpdatingProjects] = useState(new Set());

  // ══════════════════════════════════════════════════════════════════
  // 🔄 FETCH ALL PROJECTS (Client-Side Approach)
  // ══════════════════════════════════════════════════════════════════
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching ALL projects for client-side filtering...');

      const response = await axiosSecure.get("/projects/get-projects");

      if (response.data.success) {
        const projectsData = response.data.projects || response.data.data || [];
        setAllProjects(projectsData);
        console.log(`✅ Loaded ${projectsData.length} projects successfully`);
      } else {
        throw new Error(response.data.message || 'Failed to fetch projects');
      }
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch projects');
      Swal.fire({
        title: "Error",
        text: "Failed to load projects. Please try again.",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [axiosSecure]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ══════════════════════════════════════════════════════════════════
  // 🗓️ MONTH FILTERING WITH useMonthGrouping HOOK
  // ══════════════════════════════════════════════════════════════════
  const { 
    allMonths, 
    recentMonths, 
    olderMonths, 
    getMonthById 
  } = useMonthGrouping(allProjects);

  // Configuration for Last N Projects tab
  const lastNConfig = useMemo(() => ({
    enabled: true,
    limit: 30,
    label: "Most Recent"
  }), []);

  // Handle month tab changes
  const handleMonthTabChange = useCallback((tabId) => {
    console.log(`📅 Month tab changed: ${tabId}`);
    setActiveTab(tabId);
    setCurrentPage(1); // Reset to first page when changing tabs
  }, []);

  // Handle older month selection from dropdown
  const handleOlderMonthSelect = useCallback((monthId) => {
    setSelectedOlderMonth(monthId);
  }, []);

  // Handle removing selected older month tab
  const handleOlderMonthRemove = useCallback(() => {
    setSelectedOlderMonth(null);
    setActiveTab('all');
  }, []);

  // Set default tab based on user role
  useEffect(() => {
    if (user?.role === 'Estimator' || user?.role === 'estimator') {
      if (recentMonths.length > 0) {
        handleMonthTabChange(recentMonths[0].id);
      }
    } else if (user?.role === 'Admin' || user?.role === 'admin') {
      handleMonthTabChange('lastN');
    }
  }, [user?.role, recentMonths, handleMonthTabChange]);

  // ══════════════════════════════════════════════════════════════════
  // 📊 DATA FILTERING PIPELINE
  // ══════════════════════════════════════════════════════════════════

  // Step 1: Filter by month tab
  const monthFilteredProjects = useMemo(() => {
    if (activeTab === 'all') {
      return allProjects;
    } else if (activeTab === 'lastN') {
      // Show most recent N projects
      return [...allProjects]
        .sort((a, b) => {
          const [yearA, restA] = (a.projectNumber || "0-00000").split("-");
          const [yearB, restB] = (b.projectNumber || "0-00000").split("-");
          const yearNumA = parseInt(yearA);
          const yearNumB = parseInt(yearB);
          if (yearNumA !== yearNumB) return yearNumB - yearNumA;
          const monthA = parseInt(restA.slice(0, 2));
          const monthB = parseInt(restB.slice(0, 2));
          if (monthA !== monthB) return monthB - monthA;
          const sequenceA = parseInt(restA.slice(2));
          const sequenceB = parseInt(restB.slice(2));
          return sequenceB - sequenceA;
        })
        .slice(0, lastNConfig.limit);
    } else {
      // Find the matching month data
      const monthData = [...recentMonths, ...olderMonths].find(month => month.id === activeTab);
      return monthData ? monthData.jobs : [];
    }
  }, [allProjects, activeTab, recentMonths, olderMonths, lastNConfig.limit]);

  // Step 2: Filter by status
  const statusFilteredProjects = useMemo(() => {
    if (statusFilter === 'All') {
      return monthFilteredProjects;
    }
    return monthFilteredProjects.filter(project => project.status === statusFilter);
  }, [monthFilteredProjects, statusFilter]);

  // Step 3: Sort projects
  const sortedProjects = useMemo(() => {
    const projectsToSort = [...statusFilteredProjects];

    if (sortColumn === "projectNumber") {
      projectsToSort.sort((a, b) => {
        const [yearA, restA] = (a.projectNumber || "0-00000").split("-");
        const [yearB, restB] = (b.projectNumber || "0-00000").split("-");
        
        const yearNumA = parseInt(yearA);
        const yearNumB = parseInt(yearB);
        
        if (yearNumA !== yearNumB) {
          return sortOrder === "asc" ? yearNumA - yearNumB : yearNumB - yearNumA;
        }
        
        const monthA = parseInt(restA.slice(0, 2));
        const monthB = parseInt(restB.slice(0, 2));
        
        if (monthA !== monthB) {
          return sortOrder === "asc" ? monthA - monthB : monthB - monthA;
        }
        
        const sequenceA = parseInt(restA.slice(2));
        const sequenceB = parseInt(restB.slice(2));
        
        return sortOrder === "asc" ? sequenceA - sequenceB : sequenceB - sequenceA;
      });
    } else if (sortColumn === "dueDate") {
      projectsToSort.sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate) : new Date(0);
        const dateB = b.dueDate ? new Date(b.dueDate) : new Date(0);
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
    } else if (sortColumn === "postingDate") {
      projectsToSort.sort((a, b) => {
        const dateA = a.posting_date ? new Date(a.posting_date) : new Date(0);
        const dateB = b.posting_date ? new Date(b.posting_date) : new Date(0);
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
    } else if (sortColumn === "status") {
      projectsToSort.sort((a, b) => {
        const statusA = a.status || '';
        const statusB = b.status || '';
        return sortOrder === "asc" 
          ? statusA.localeCompare(statusB) 
          : statusB.localeCompare(statusA);
      });
    }

    return projectsToSort;
  }, [statusFilteredProjects, sortColumn, sortOrder]);

  // ══════════════════════════════════════════════════════════════════
  // 📄 CLIENT-SIDE PAGINATION (Like UserManagement)
  // ══════════════════════════════════════════════════════════════════
  const indexOfLastProject = currentPage * projectsPerPage;
  const indexOfFirstProject = indexOfLastProject - projectsPerPage;
  const currentProjects = sortedProjects.slice(indexOfFirstProject, indexOfLastProject);
  const totalPages = Math.ceil(sortedProjects.length / projectsPerPage);

  // ══════════════════════════════════════════════════════════════════
  // 🛠️ UTILITY FUNCTIONS
  // ══════════════════════════════════════════════════════════════════

  // Combine all available statuses for filtering dropdown
  const statuses = useMemo(() => {
    return [...new Set([
      ...projectStatuses,
      ...estimateStatuses
    ])];
  }, []);

  // Get sort icon for table headers
  const getSortIcon = useCallback((column) => {
    if (sortColumn !== column) return "↕️";
    return sortOrder === "asc" ? "↑" : "↓";
  }, [sortColumn, sortOrder]);

  // Handle table column sorting
  const handleSort = useCallback((column) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("desc");
    }
  }, [sortColumn, sortOrder]);

  // Handle status filter changes
  const handleStatusFilterChange = useCallback((event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  // Get project location string
  const getProjectLocation = useCallback((project) => {
    if (!project) return "N/A";
    const address = project.project_name || project.projectName || "Unknown Address";
    return address;
  }, []);

  // Determine project display properties based on status and role
  const getProjectDisplayInfo = useCallback((project) => {
    const status = project.status || "";
    const isEstimateStatus = estimateStatuses.includes(status);
    
    // Admins can always edit
    if (userRole === "Admin") {
      return {
        canEdit: true,
        availableStatuses: isEstimateStatus ? estimateStatuses : projectStatuses
      };
    }
    
    // Estimators can only view
    return {
      canEdit: false,
      availableStatuses: isEstimateStatus ? estimateStatuses : projectStatuses
    };
  }, [userRole]);

  // Handle project status updates
  const handleStatusChange = useCallback(async (projectId, newStatus) => {
    console.log(`🔄 Updating project ${projectId} status to: ${newStatus}`);

    // Add to updating set
    setUpdatingProjects(prev => new Set(prev).add(projectId));

    // Optimistic update
    const originalProjects = [...allProjects];
    setAllProjects(prevProjects =>
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
        
        // Call parent callback
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
      
      // Revert optimistic update
      setAllProjects(originalProjects);
      
      Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Failed to update project status",
        icon: "error",
      });
    } finally {
      // Remove from updating set
      setUpdatingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  }, [axiosSecure, allProjects, onStatusChange]);

  // ══════════════════════════════════════════════════════════════════
  // 🎨 RENDER COMPONENTS
  // ══════════════════════════════════════════════════════════════════

  // Render client assignment cell
  const renderClientCell = useCallback((project) => {
    const linkedClients = project.linkedClients || [];
    const hasClients = linkedClients.length > 0;

    // Find client info
    const clientInfo = hasClients && linkedClients[0]
      ? clients.find(c => c._id === linkedClients[0])
      : null;

    // Role-based rendering
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

  // Render status cell
  const renderStatusCell = useCallback((project) => {
    const { canEdit, availableStatuses } = getProjectDisplayInfo(project);
    const isUpdating = updatingProjects.has(project._id);

    if (!canEdit || userRole === "Estimator") {
      // Read-only badge for estimators
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

    // Editable dropdown for admins
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

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
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
          onClick={fetchProjects}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Month Filter Tabs */}
      <MonthFilterTabs
        projects={allProjects}
        activeTab={activeTab}
        onTabChange={handleMonthTabChange}
        selectedOlderMonth={selectedOlderMonth}
        onOlderMonthSelect={handleOlderMonthSelect}
        onOlderMonthRemove={handleOlderMonthRemove}
        lastNConfig={lastNConfig}
        userRole={userRole}
        showProjectCount={false}
        serverSideMode={false}
      />

      {/* Status Filter Dropdown */}
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
          Showing {indexOfFirstProject + 1} to {Math.min(indexOfLastProject, sortedProjects.length)} of {sortedProjects.length} projects
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
            {currentProjects.length > 0 ? (
              currentProjects.map((project) => (
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
                      Try adjusting your filters or create a new project
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls (Like UserManagement) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 rounded-lg shadow-sm">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstProject + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastProject, sortedProjects.length)}</span> of{' '}
                <span className="font-medium">{sortedProjects.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1;
                  // Show first page, last page, current page, and pages around current
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNumber
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    (pageNumber === currentPage - 2 && pageNumber > 1) ||
                    (pageNumber === currentPage + 2 && pageNumber < totalPages)
                  ) {
                    return (
                      <span
                        key={pageNumber}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
