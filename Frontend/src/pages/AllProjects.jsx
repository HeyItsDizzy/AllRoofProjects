
// AllProjects.jsx (Admin View)
// Optimized for production with proper error handling, loading states, and performance optimizations
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { message } from "antd";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "@/shared/IconSet.jsx";
import AssignClient from "../components/AssignClient";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import ProjectTable from "../components/ProjectTable";

const AllProjects = () => {
  const [projects, setProjects] = useState([]); // Holds all projects
  const [users, setUsers] = useState([]); // Holds users for assignment (future feature)
  const [clients, setClients] = useState([]); // Holds clients for assignment
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

  // Fetch projects with error handling
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosSecure.get("/projects/get-projects");
      setProjects(response.data.data || []);
    } catch (error) {
      setError("Failed to fetch projects");
      message.error("Failed to load projects. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [axiosSecure]);

  // Fetch clients with error handling
  const fetchClients = useCallback(async () => {
    try {
      const res = await axiosSecure.get("/clients");
      setClients(res.data || []);
    } catch (err) {
      message.error("Failed to load clients");
    }
  }, [axiosSecure]);

  // Fetch users with error handling
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axiosSecure.get("/users/get-userData");
      setUsers(response.data.data || []);
    } catch (error) {
      message.error("Failed to load users");
    }
  }, [axiosSecure]);

  // Fetch projects
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);
  
  // Fetch clients for assignment
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Fetch users for assignment
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fetch user details based on linked users with optimized error handling
  const fetchUserDetails = useCallback(async () => {
    if (!projects.length) return;

    const userIds = projects.flatMap((p) => {
      const linkedUsers = Array.isArray(p.linkedUsers)
        ? p.linkedUsers.filter((id) => id && id !== "null")
        : [];
      return linkedUsers;
    });
    
    const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

    if (uniqueUserIds.length === 0) return;

    try {
      const responses = await Promise.allSettled(
        uniqueUserIds.map(async (userId) => {
          if (!userId) return null;
          return await axiosSecure.get(`/users/get-user/${userId}`);
        })
      );

      const userMap = responses.reduce((acc, result) => {
        if (result.status === 'fulfilled' && result.value?.data?.success) {
          acc[result.value.data.data._id] = result.value.data.data;
        }
        return acc;
      }, {});

      setUserData(userMap);
    } catch (error) {
      message.error("Failed to load some user details");
    }
  }, [projects, axiosSecure]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);
  // Helper function to safely get location string - memoized
  const getLocationString = useCallback((project) => {
    if (typeof project.location === "string") {
      return project.location;
    }
    return project.location?.full_address || "";
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
      return date.toLocaleDateString() + " " + date.toDateString();
    } catch {
      return dateString.toString();
    }
  }, []);

  // Memoized search function
  const searchProjects = useCallback((projectList, searchTerm) => {
    if (!searchTerm.trim()) return projectList;
    
    const lowerSearch = searchTerm.toLowerCase();
    
    return projectList.filter((project) => {
      const locationString = getLocationString(project);
      
      // Get linked client names
      const linkedClientNames = Array.isArray(project.linkedClients) 
        ? project.linkedClients
            .map(clientId => {
              const client = clients.find(c => c._id === clientId);
              return client ? client.name || client.companyName || "" : "";
            })
            .join(" ")
            .toLowerCase()
        : "";

      return (
        (project.name && project.name.toLowerCase().includes(lowerSearch)) ||
        (locationString && locationString.toLowerCase().includes(lowerSearch)) ||
        (project.projectNumber && project.projectNumber.toLowerCase().includes(lowerSearch)) ||
        (project._id && project._id.toLowerCase().includes(lowerSearch)) ||
        (Array.isArray(project.linkedUsers) &&
          project.linkedUsers.some((userId) => {
            const user = userData[userId];
            return user && user.name && user.name.toLowerCase().includes(lowerSearch);
          })) ||
        (project.status && project.status.toLowerCase().includes(lowerSearch)) ||
        (linkedClientNames && linkedClientNames.includes(lowerSearch)) ||
        (project.createdAt && formatDateForSearch(project.createdAt).toLowerCase().includes(lowerSearch)) ||
        (project.updatedAt && formatDateForSearch(project.updatedAt).toLowerCase().includes(lowerSearch)) ||
        (project.dueDate && formatDateForSearch(project.dueDate).toLowerCase().includes(lowerSearch)) ||
        (project.startDate && formatDateForSearch(project.startDate).toLowerCase().includes(lowerSearch)) ||
        (project.completionDate && formatDateForSearch(project.completionDate).toLowerCase().includes(lowerSearch))
      );
    });
  }, [getLocationString, formatDateForSearch, clients, userData]);

  // Optimized filter projects with memoization
  const applyFilters = useCallback((projectList) => {
    let filtered = [...projectList];

    // Apply Tab Filters
    if (activeButton === "Open Projects") {
      filtered = filtered.filter((project) => isProjectOpen(project.status));
    }

    // Apply Column Filters
    Object.keys(filters).forEach((column) => {
      if (filters[column] && filters[column].length > 0) {
        if (!filters[column].includes("All")) {
          filtered = filtered.filter((project) => filters[column].includes(project[column]));
        }
      }
    });

    // Apply Search Filter
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
    setProjects((prevProjects) =>
      prevProjects.map((project) =>
        project._id === projectId ? { ...project, linkedUsers } : project
      )
    );
  }, []);

  // Callback to update project.linkedClients in state - optimized
  const updateProjectClients = useCallback((projectId, linkedClients) => {
    setProjects(prev =>
      prev.map(p =>
        p._id === projectId ? { ...p, linkedClients } : p
      )
    );
  }, []);


  // Sort projects with optimized performance
  const handleSort = useCallback((column) => {
    const newSortOrder = sortColumn === column && sortOrder === "asc" ? "desc" : "asc";
    setSortColumn(column);
    setSortOrder(newSortOrder);
  
    const sortedProjects = [...projects].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      
      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return newSortOrder === "asc" ? 1 : -1;
      if (bVal == null) return newSortOrder === "asc" ? -1 : 1;
      
      // Handle dates
      if (column.includes('Date') || column.includes('At')) {
        const dateA = new Date(aVal);
        const dateB = new Date(bVal);
        return newSortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
      
      // Handle strings and numbers
      if (aVal < bVal) return newSortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return newSortOrder === "asc" ? 1 : -1;
      return 0;
    });
  
    setProjects(sortedProjects);
  }, [projects, sortColumn, sortOrder]);

  const handleFilterChange = useCallback((column, value) => {
    setFilters((prevFilters) => {
      const updatedFilters = { ...prevFilters };

      if (value === "All") {
        delete updatedFilters[column];
      } else {
        updatedFilters[column] = [value];
      }

      return updatedFilters;
    });
  }, []);

  const handleStatusChange = useCallback(async (projectId, newStatus) => {
    try {
      const response = await axiosSecure.patch(`/projects/update-status/${projectId}`, { 
        status: newStatus 
      });

      if (response.data.success) {
        setProjects((prevProjects) =>
          prevProjects.map((project) =>
            project._id === projectId ? { ...project, status: newStatus } : project
          )
        );
        message.success("Status updated successfully");
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      message.error("Failed to update status. Please try again.");
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

  // Optimized search and tab handling
  const handleSearchChange = useCallback((e) => {
    const newSearch = e.target.value || "";
    setSearch(newSearch);
  }, []);

  const handleProjectTabClick = useCallback((label) => {
    if (activeButton === label) {
      // Reset all filters if clicking the same active button
      setFilters({});
      setSearch("");
      setSortColumn(null);
      setSortOrder("asc");
      setActiveButton("All Projects");
    } else {
      setActiveButton(label);
      if (label === "Create New") {
        navigate("/addNewProject");
      }
    }
  }, [activeButton, navigate]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchProjects}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // AllProjects.jsx Return
  return (
    <div className="min-h-screen">
      {/* Search & Filter Section */}
      <div className="w-full mx-auto my-6 flex flex-col md:flex-row md:justify-between items-center gap-4">
        <div className="relative flex-1 max-w-[450px] w-full">
          <IconSearch className="absolute top-[11px] left-2" />
          <input
            type="text"
            placeholder="Search by name, address, client, project ID, dates, status, or user..."
            className="pl-10 h-9 rounded-md placeholder:text-medium w-full"
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        {/* Filter Buttons */}
        <div className="flex gap-4 py-1 px-1 text-medium text-textGray rounded-full bg-white">
          {["All Projects", "Open Projects", "Create New"].map((label) => (
            <button
              key={label}
              className={`px-4 py-1 rounded-full transition-colors duration-300 ${
                activeButton === label ? "bg-secondary text-white" : "bg-transparent text-textGray"
              }`}
              onClick={() => handleProjectTabClick(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Project Table */}
      <ProjectTable
        projects={filteredProjects || []}
        setProjects={setProjects}
        userData={userData}
        clients={clients}
        openAssignUser={openAssignUserModal}
        openAssignClient={openAssignClientModal}
        handleSort={handleSort}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        handleFilterChange={handleFilterChange}
        filters={filters}
        handleStatusChange={handleStatusChange}
        loading={loading}
      />

      {/* Assign Client Modal */}
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

export default AllProjects;
