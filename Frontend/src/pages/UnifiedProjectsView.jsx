// UnifiedProjectsView.jsx - Universal Projects View for All Roles
// DRY principle implementation with role-based column visibility and data filtering
// Supports Admin, User, and Estimator roles with appropriate security restrictions

import React, { useState, useEffect, useCallback, useMemo, useContext } from "react";
import { message } from "antd";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "@/shared/IconSet.jsx";
import AssignClient from "../components/AssignClient";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import ProjectTable from "../components/ProjectTable";
import { projectStatuses } from "@/shared/projectStatuses";
import { AuthContext } from "../auth/AuthProvider";
import { subscribeToProjectDataUpdates, notifyProjectDataUpdate } from "@/utils/ProjectDataSync";
import "../styles/cls-fix.css";

const UnifiedProjectsView = () => {
  // Get user context for role-based functionality
  const { user } = useContext(AuthContext);
  const userRole = user?.role || "User";
  
  const [projects, setProjects] = useState([]); // Holds all projects
  const [users, setUsers] = useState([]); // Holds users for assignment (Admin only)
  const [clients, setClients] = useState([]); // Holds clients for assignment (Admin only)
  const [userData, setUserData] = useState({}); // Holds user details (avatars & names)
  const [search, setSearch] = useState(""); // Search query
  const [activeButton, setActiveButton] = useState("All Projects"); // Filter state
  const navigate = useNavigate(); // Navigate function
  const [isModalVisible, setIsModalVisible] = useState(false); // Modal visibility state
  const [selectedProject, setSelectedProject] = useState(null); // Selected project for modal
  const [isClientModalVisible, setIsClientModalVisible] = useState(false); // ClientModal visibility state
  const [selectedClientProject, setSelectedClientProject] = useState(null); // Selected Client Project for modal
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState(null); // Error state

  const axiosSecure = useAxiosSecure();

  // Sorting and filtering states
  const [filteredProjects, setFilteredProjects] = useState([]); // Stores filtered projects
  const [sortColumn, setSortColumn] = useState(null); // Stores active sort column
  const [sortOrder, setSortOrder] = useState("asc"); // Stores sorting order
  const [filters, setFilters] = useState({}); // Stores applied filters

  // Memoized open project statuses
  const openProjectStatuses = useMemo(() => [
    "New Lead",
    "Estimate Requested", 
    "Estimate Completed",
    "Quote Sent",
    "Approved",
    "Project Active"
  ], []);

  // Role-based column configuration
  const columnConfig = useMemo(() => {
    const baseColumns = {
      projectName: true,
      location: true,
      dueDate: true,
      cost: userRole !== "Estimator", // Hide cost from Estimators
      status: true,
      postingDate: true
    };

    const adminColumns = {
      ...baseColumns,
      assignUser: true,
      assignClient: true,
      deleteProject: true
    };

    const estimatorColumns = {
      ...baseColumns,
      assignUser: false,
      assignClient: true, // Show client column for context, but ProjectTable handles click protection
      deleteProject: false
    };

    const userColumns = {
      ...baseColumns,
      assignUser: false,
      assignClient: false,
      deleteProject: false,
      cost: false // Users also don't see cost
    };

    switch (userRole) {
      case "Admin":
        return adminColumns;
      case "Estimator":
        return estimatorColumns;
      case "User":
        return userColumns;
      default:
        return userColumns;
    }
  }, [userRole]);

  // Role-based project fetching
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let endpoint;
      switch (userRole) {
        case "Admin":
          endpoint = "/projects/get-projects"; // All projects
          break;
        case "Estimator":
          endpoint = "/projects/get-projects"; // Same as Admin, filter client-side
          break;
        case "User":
          endpoint = "/projects/get-client-projects"; // Client-based projects
          break;
        default:
          endpoint = "/projects/get-client-projects";
      }
      
      const response = await axiosSecure.get(endpoint);
      
      if (response.data.success) {
        let projectsData = response.data.data || [];
        
        // Apply role-based filtering for Estimators (same logic as JobBoard)
        if (userRole === 'Estimator' && user?._id) {
          const originalCount = projectsData.length;
          projectsData = projectsData.filter(project => {
            const linkedEstimators = project.linkedEstimators || [];
            const isAssignedToUser = linkedEstimators.includes(user._id);
            const isUnassigned = !linkedEstimators.length; // Show unassigned projects too
            
            return isUnassigned || isAssignedToUser;
          });
          
          console.log("🔍 Estimator Filtering Applied:");
          console.log("- Original projects:", originalCount);
          console.log("- Filtered projects:", projectsData.length);
          console.log("- Estimator ID:", user._id);
          console.log("- Estimator Name:", user?.firstName);
        }
        
        setProjects(projectsData);
        console.log(`✅ Fetched ${response.data.data?.length || 0} projects for ${userRole}`);
      } else {
        throw new Error(response.data.message || "Failed to fetch projects");
      }
    } catch (error) {
      console.error("❌ Error fetching projects:", error);
      setError(error.message || "Failed to load projects");
      message.error("Failed to load projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [axiosSecure, userRole, user]);

  // Fetch clients with error handling (Admin for editing, Estimator for viewing)
  const fetchClients = useCallback(async () => {
    // Only skip for regular Users, allow Admin and Estimator to fetch clients
    if (userRole === "User") return;
    
    try {
      const response = await axiosSecure.get("/clients");
      // Backend returns clients directly as array (not wrapped in success/data structure)
      setClients(Array.isArray(response.data) ? response.data : []);
      console.log(`✅ Fetched ${Array.isArray(response.data) ? response.data.length : 0} clients for ${userRole}`);
    } catch (error) {
      console.error("❌ Error fetching clients:", error);
      setClients([]);
    }
  }, [axiosSecure, userRole]);

  // Fetch users with error handling (Admin only)
  const fetchUsers = useCallback(async () => {
    if (userRole !== "Admin") return;
    
    try {
      const response = await axiosSecure.get("/users/get-users");
      if (response.data.success) {
        setUsers(response.data.data || []);
        console.log(`✅ Fetched ${response.data.data?.length || 0} users`);
      } else {
        console.warn("Failed to fetch users:", response.data.message);
      }
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      setUsers([]);
    }
  }, [axiosSecure, userRole]);

  // Fetch projects - DISABLED: ProjectTable now handles its own data via usePaginatedProjects
  useEffect(() => {
    // Only fetch clients and users for modals, ProjectTable handles project data
    // fetchProjects(); // Commented out - ProjectTable uses server-side pagination
    
    // Remove polling since ProjectTable handles its own data refresh
    // const pollInterval = setInterval(() => {
    //   console.log("🔄 Refreshing UnifiedProjects data to sync with JobBoard...");
    //   fetchProjects();
    // }, 30000);
    
    // return () => {
    //   clearInterval(pollInterval);
    // };
  }, []);
  
  // Fetch clients for both Admin (editing) and Estimator (viewing)
  useEffect(() => {
    if (userRole === "Admin" || userRole === "Estimator") {
      fetchClients();
    }
  }, [fetchClients, userRole]);

  // Fetch users for assignment (Admin only)
  useEffect(() => {
    if (userRole === "Admin") {
      fetchUsers();
    }
  }, [fetchUsers, userRole]);

  // 🔄 Project data updates - Listen for updates from other components
  useEffect(() => {
    const unsubscribe = subscribeToProjectDataUpdates((updateEvent) => {
      console.log('🔄 UnifiedProjectsView received data update notification:', updateEvent);
      
      // Update local state with the changes
      if (updateEvent.projectId && updateEvent.changes) {
        setProjects(prevProjects => 
          prevProjects.map(project => 
            project._id === updateEvent.projectId 
              ? { ...project, ...updateEvent.changes }
              : project
          )
        );
      }
    });
    
    return unsubscribe;
  }, []);

  // Fetch user details based on linked users with optimized error handling
  const fetchUserDetails = useCallback(async () => {
    if (projects.length === 0) return;
    
    try {
      // Extract unique user IDs from all projects
      const allUserIds = new Set();
      projects.forEach(project => {
        if (project.linkedUsers && Array.isArray(project.linkedUsers)) {
          project.linkedUsers.forEach(userId => {
            if (userId && typeof userId === 'string') {
              allUserIds.add(userId);
            }
          });
        }
      });

      if (allUserIds.size === 0) return;

      // Fetch user details for all unique user IDs
      const userDetailsPromises = Array.from(allUserIds).map(async (userId) => {
        try {
          const response = await axiosSecure.get(`/users/users/${userId}`);
          if (response.data.success) {
            return { [userId]: response.data.data };
          }
          return null;
        } catch (error) {
          console.warn(`Failed to fetch user details for ${userId}:`, error.message);
          return null;
        }
      });

      const userDetailsResults = await Promise.all(userDetailsPromises);
      
      // Combine all user details into a single object
      const newUserData = {};
      userDetailsResults.forEach(result => {
        if (result) {
          Object.assign(newUserData, result);
        }
      });

      setUserData(newUserData);
      console.log(`✅ Fetched details for ${Object.keys(newUserData).length} users`);
      
    } catch (error) {
      console.error("❌ Error fetching user details:", error);
    }
  }, [projects, axiosSecure]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  // Helper function to safely get location string - memoized
  const getLocationString = useCallback((project) => {
    if (!project) return "";
    
    if (typeof project.location === "string") {
      return project.location.toLowerCase();
    }
    
    if (project.location && typeof project.location === "object") {
      const fullAddress = project.location.full_address || "";
      const city = project.location.city || "";
      const state = project.location.state || "";
      return `${fullAddress} ${city} ${state}`.toLowerCase();
    }
    
    return "";
  }, []);

  // Helper function to check if project is open - memoized
  const isProjectOpen = useCallback((status) => {
    return openProjectStatuses.includes(status);
  }, [openProjectStatuses]);

  // Helper function to format dates for search - memoized
  const formatDateForSearch = useCallback((dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString().toLowerCase();
    } catch {
      return "";
    }
  }, []);

  // Memoized search function
  const searchProjects = useCallback((projectList, searchTerm) => {
    if (!searchTerm.trim()) return projectList;
    
    const term = searchTerm.toLowerCase();
    
    return projectList.filter(project => {
      // Search in project name
      if (project.name && project.name.toLowerCase().includes(term)) return true;
      
      // Search in project number
      if (project.projectNumber && project.projectNumber.toLowerCase().includes(term)) return true;
      
      // Search in location
      if (getLocationString(project).includes(term)) return true;
      
      // Search in status
      if (project.status && project.status.toLowerCase().includes(term)) return true;
      
      // Search in dates
      if (formatDateForSearch(project.posting_date).includes(term)) return true;
      if (formatDateForSearch(project.due_date).includes(term)) return true;
      
      // Search in client names (Admin only)
      if (userRole === "Admin" && project.linkedClients && clients.length > 0) {
        const projectClientNames = project.linkedClients
          .map(clientId => {
            const client = clients.find(c => c._id === clientId);
            return client ? client.name.toLowerCase() : "";
          })
          .join(" ");
        if (projectClientNames.includes(term)) return true;
      }
      
      // Search in assigned user names
      if (project.linkedUsers && userData) {
        const assignedUserNames = project.linkedUsers
          .map(userId => {
            const user = userData[userId];
            return user ? `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase() : "";
          })
          .join(" ");
        if (assignedUserNames.includes(term)) return true;
      }
      
      return false;
    });
  }, [getLocationString, formatDateForSearch, clients, userData, userRole]);

  // Optimized filter projects with memoization
  const applyFilters = useCallback((projectList) => {
    let filtered = [...projectList];

    // Apply button filter
    if (activeButton !== "All Projects") {
      if (activeButton === "Open Projects") {
        filtered = filtered.filter(project => isProjectOpen(project.status));
      }
      // Add more filter types as needed
    }

    // Apply column filters
    Object.entries(filters).forEach(([column, value]) => {
      if (value && value.trim()) {
        filtered = filtered.filter(project => {
          const projectValue = project[column];
          if (typeof projectValue === 'string') {
            return projectValue.toLowerCase().includes(value.toLowerCase());
          }
          return false;
        });
      }
    });

    // Apply search
    filtered = searchProjects(filtered, search);

    return filtered;
  }, [activeButton, filters, search, isProjectOpen, searchProjects]);

  // Update filtered projects when dependencies change
  useEffect(() => {
    const filtered = applyFilters(projects);
    setFilteredProjects(filtered);
  }, [projects, applyFilters]);

  // Callback function to update project users - optimized
  const updateProjectUsers = useCallback((projectId, linkedUsers) => {
    setProjects(prevProjects => 
      prevProjects.map(project => 
        project._id === projectId 
          ? { ...project, linkedUsers }
          : project
      )
    );
  }, []);

  // Callback to update project.linkedClients in state - optimized
  const updateProjectClients = useCallback((projectId, linkedClients) => {
    setProjects(prevProjects => 
      prevProjects.map(project => 
        project._id === projectId 
          ? { ...project, linkedClients }
          : project
      )
    );
    
    // Notify other components about the update
    notifyProjectDataUpdate(projectId, { linkedClients }, 'UnifiedProjectsView');
    console.log('✅ Client assignment updated and synced:', projectId, linkedClients);
  }, []);

  // Sort projects with optimized performance
  const handleSort = useCallback((column) => {
    let newSortOrder = "asc";
    if (sortColumn === column && sortOrder === "asc") {
      newSortOrder = "desc";
    }

    const sortedProjects = [...projects].sort((a, b) => {
      let aValue = a[column];
      let bValue = b[column];

      // Handle special cases
      if (column === "name") {
        aValue = aValue || "";
        bValue = bValue || "";
      } else if (column === "due_date" || column === "posting_date") {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      } else if (column === "total") {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      if (aValue < bValue) return newSortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return newSortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setProjects(sortedProjects);
    setSortColumn(column);
    setSortOrder(newSortOrder);
  }, [projects, sortColumn, sortOrder]);

  const handleFilterChange = useCallback((column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
  }, []);

  const handleStatusChange = useCallback(async (projectId, newStatus) => {
    try {
      console.log('UnifiedProjectsView: Updating project status:', { projectId, newStatus });
      const response = await axiosSecure.patch(`/projects/update/${projectId}`, {
        status: newStatus
      });

      if (response.data.success) {
        setProjects(prevProjects =>
          prevProjects.map(project =>
            project._id === projectId ? { ...project, status: newStatus } : project
          )
        );
        message.success("Project status updated successfully");
      } else {
        throw new Error(response.data.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating project status:", error);
      message.error("Failed to update project status");
    }
  }, [axiosSecure]);

  // Optimized modal handlers
  const openAssignUserModal = useCallback((project) => {
    setSelectedProject(project);
    setIsModalVisible(true);
  }, []);

  const closeAssignUserModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedProject(null);
  }, []);

  const openAssignClientModal = useCallback((project) => {
    setSelectedClientProject(project);
    setIsClientModalVisible(true);
  }, []);

  const closeAssignClientModal = useCallback(() => {
    setIsClientModalVisible(false);
    setSelectedClientProject(null);
  }, []);

  // Role-based page title
  const getPageTitle = useCallback(() => {
    switch (userRole) {
      case "Admin":
        return "All Projects";
      case "Estimator":
        return "My Assigned Projects";
      case "User":
        return "My Projects";
      default:
        return "Projects";
    }
  }, [userRole]);

  // Role-based filter buttons - simplified to only show filter options
  const getFilterButtons = useCallback(() => {
    return [
      { 
        label: "All Projects", 
        key: "All Projects",
        tooltip: "Shows all projects regardless of status"
      },
      { 
        label: "Open Projects", 
        key: "Open Projects",
        tooltip: "Shows projects with status: New Lead, Estimate Requested, Estimate Completed, Quote Sent, Approved, Project Active. Excludes: Cancelled, Completed, On Hold, etc."
      }
    ];
  }, []);

  return (
    <div className="min-h-screen">
      {/* Search & Filter Section */}
      <div className="w-full mx-auto my-6 flex flex-col md:flex-row md:justify-between items-center gap-4">
        <div className="relative flex-1 max-w-[450px] w-full">
          <IconSearch className="absolute top-[11px] left-2" />
          <input
            type="text"
            placeholder={`Search by name, address, client, project ID, dates, status, or user...`}
            className="pl-10 h-9 rounded-md placeholder:text-medium w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {/* Filter Buttons and Create New Project Button */}
        <div className="flex items-center gap-4">
          {/* Filter Buttons Selector */}
          <div className="flex gap-4 py-1 px-1 text-medium text-textGray rounded-full bg-white">
            {getFilterButtons().map((button) => (
              <button
                key={button.key}
                title={button.tooltip}
                className={`px-4 py-1 rounded-full transition-colors duration-300 ${
                  activeButton === button.key ? "bg-secondary text-white" : "bg-transparent text-textGray"
                }`}
                onClick={() => setActiveButton(button.key)}
              >
                {button.label}
              </button>
            ))}
          </div>
          
          {/* Standalone Create New Project Button - Only for Admin */}
          {/* TODO: Future enhancement - Make available to all roles, not just Admin */}
          {userRole === "Admin" && (
            <button
              className="px-4 py-1 bg-primary text-white rounded-2xl hover:bg-primary-dark transition-colors duration-300 flex items-center gap-2"
              onClick={() => navigate("/addNewProject")}
              title="Create a new project"
            >
              <span className="text-lg">+</span>
              <span className="text-sm">Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Project Table - Server-Side Pagination Mode */}
      <ProjectTable
        userData={userData}
        clients={clients}
        openAssignUser={openAssignUserModal}
        openAssignClient={openAssignClientModal}
        onStatusChange={handleStatusChange}
        userRole={userRole}
        columnConfig={columnConfig}
        isUserView={userRole === "User"}
        searchTerm={search}
      />

      {/* Assign Client Modal - Match AllProjects structure */}
      {isClientModalVisible && selectedClientProject && (
        <AssignClient
          clients={clients}
          projectId={selectedClientProject._id}
          project={selectedClientProject}
          closeModal={closeAssignClientModal}
          updateProjectClients={updateProjectClients}
        />
      )}
    </div>
  );
};

export default UnifiedProjectsView;
