// src/pages/MyProjects.jsx (User View)
import React, { useState, useEffect, useContext } from "react";
import { Button, Spin } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { IconSearch } from "../shared/IconSet.jsx";
import { IconDown } from "../shared/IconSet.jsx";
import { IconPending } from "../shared/IconSet.jsx";
import { IconComplete } from "../shared/IconSet.jsx";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import ProjectTable from "../components/ProjectTable";
import { projectStatuses } from "../shared/projectStatuses";
import { AuthContext } from "../auth/AuthProvider";  // ← pull user info

const UserProjectTable = () => {
  const [projects, setProjects] = useState([]); // Holds all projects
  const [userData, setUserData] = useState({}); // Holds user details (avatars & names)
  const [search, setSearch] = useState(""); // Search query
  const [activeButton, setActiveButton] = useState("All Projects"); // Filter state
  const navigate = useNavigate(); // Get navigate function
  const axiosSecure = useAxiosSecure();
  const [loading, setLoading] = useState(true);

  // Sorting and filtering states
  const [filteredProjects, setFilteredProjects] = useState([]); // Stores filtered projects
  const [sortColumn, setSortColumn] = useState(null); // Stores active sort column
  const [sortOrder, setSortOrder] = useState("asc"); // Stores sorting order
  const [filters, setFilters] = useState({}); // Stores applied filters

  // Fetch projects for *all* companies this user is linked to
const { user } = useContext(AuthContext);

useEffect(() => {
  if (!user?._id) return;

  const loadMyProjects = async () => {
    setLoading(true);
    try {
      // 1) fetch all clients
      const clientsRes = await axiosSecure.get("/clients");
      const allClients = Array.isArray(clientsRes.data)
        ? clientsRes.data
        : clientsRes.data.client || [];

      // 2) filter to the clients you belong to
      const myClients = allClients.filter((c) =>
        Array.isArray(c.linkedUsers) &&
        c.linkedUsers.some((uid) => uid.toString() === user._id)
      );

      // 3) gather every linkedProjects ID, dedupe
      const allProjectIds = [
        ...new Set(myClients.flatMap((c) => c.linkedProjects || [])),
      ];

      // 4) fetch each project via the user-safe endpoint
      const projectPromises = allProjectIds.map((pid) =>
        axiosSecure
          .get(`/projects/get-project/${pid}`)
          .then((res) => res.data.data || res.data)
      );
      const fetched = await Promise.all(projectPromises);

      setProjects(fetched);
    } catch (err) {
      console.error("Error loading MyProjects:", err);
    } finally {
      setLoading(false);
    }
  };

  loadMyProjects();
}, [user?._id, axiosSecure]);



  // Fetch user details based on linked users
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!projects.length) return;
  
      const userIds = projects.flatMap((p) => p.linkedUsers || []);
      const uniqueUserIds = [...new Set(userIds)].filter(Boolean); // 👈 removes null/undefined/empty
  
      try {
        const responses = await Promise.all(
          uniqueUserIds.map((userId) => {
            if (!userId) return null; // extra guard
            return axiosSecure.get(`/users/get-user/${userId}`);
          })
        );
  
        const userMap = responses.reduce((acc, response) => {
          if (response && response.data?.success) {
            acc[response.data.data._id] = response.data.data;
          }
          return acc;
        }, {});
  
        setUserData(userMap);
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };
  
    fetchUserDetails();
  }, [projects]);
  

  // Helper function to safely get location string
  const getLocationString = (project) => {
    if (typeof project.location === "string") {
      return project.location;
    }
    return project.location?.full_address || "";
  };

  // Filter projects based on search query and active filters
  useEffect(() => {
    let filtered = [...projects];

    // Apply Tab Filters (All Projects / Open Projects)
    if (activeButton === "Open Projects") {
      filtered = filtered.filter((project) => isProjectOpen(project.status));
    }

    // Apply Column Filters (Ignore "All")
    Object.keys(filters).forEach((column) => {
      if (filters[column] && filters[column].length > 0) {
        if (!filters[column].includes("All")) {
          filtered = filtered.filter((project) => filters[column].includes(project[column]));
        }
      }
    });

    // Apply Search Filter
    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter((project) => {
        const locationString = getLocationString(project);
        
        // Helper function to safely format and search dates
        const formatDateForSearch = (dateString) => {
          if (!dateString) return "";
          try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + " " + date.toDateString();
          } catch {
            return dateString.toString();
          }
        };

        // Get linked client names - Note: MyProjects doesn't have clients state, but keeping for consistency
        const linkedClientNames = Array.isArray(project.linkedClients) 
          ? project.linkedClients
              .map(clientId => {
                // For MyProjects, we might not have full client data, so just use the ID
                return clientId || "";
              })
              .join(" ")
              .toLowerCase()
          : "";

        return (
          // Project name
          (project.name && project.name.toLowerCase().includes(lowerSearch)) ||
          // Address/Location
          (locationString && locationString.toLowerCase().includes(lowerSearch)) ||
          // Project number/ID
          (project.projectNumber && project.projectNumber.toLowerCase().includes(lowerSearch)) ||
          // Project _id
          (project._id && project._id.toLowerCase().includes(lowerSearch)) ||
          // Linked users
          (Array.isArray(project.linkedUsers) &&
            project.linkedUsers.some((userId) => {
              const user = userData[userId];
              return user && user.name && user.name.toLowerCase().includes(lowerSearch);
            })) ||
          // Status
          (project.status && project.status.toLowerCase().includes(lowerSearch)) ||
          // Linked clients
          (linkedClientNames && linkedClientNames.includes(lowerSearch)) ||
          // Created date
          (project.createdAt && formatDateForSearch(project.createdAt).toLowerCase().includes(lowerSearch)) ||
          // Updated date
          (project.updatedAt && formatDateForSearch(project.updatedAt).toLowerCase().includes(lowerSearch)) ||
          // Due date (if exists)
          (project.dueDate && formatDateForSearch(project.dueDate).toLowerCase().includes(lowerSearch)) ||
          // Project start date (if exists)
          (project.startDate && formatDateForSearch(project.startDate).toLowerCase().includes(lowerSearch)) ||
          // Project completion date (if exists)
          (project.completionDate && formatDateForSearch(project.completionDate).toLowerCase().includes(lowerSearch))
        );
      });
    }

    setFilteredProjects(filtered);
  }, [projects, activeButton, filters, search, userData]); // Added userData dependency

  // Sort projects based on a specific field
  const handleSort = (column) => {
    const newSortOrder = sortColumn === column && sortOrder === "asc" ? "desc" : "asc";
    setSortColumn(column);
    setSortOrder(newSortOrder);

    // First, sort the full projects list
    const sortedProjects = [...projects].sort((a, b) => {
      if (a[column] < b[column]) return newSortOrder === "asc" ? -1 : 1;
      if (a[column] > b[column]) return newSortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setProjects(sortedProjects); // Update the full list
    setFilteredProjects(sortedProjects); // Ensure displayed projects are sorted
  };

  const handleFilterChange = (column, value) => {
    setFilters((prevFilters) => {
      const updatedFilters = { ...prevFilters };

      if (value === "All") {
        delete updatedFilters[column]; // Remove filter completely
      } else {
        updatedFilters[column] = [value]; // Store selected value
      }

      return { ...updatedFilters }; // Force state update
    });

    // Ensure `useEffect` detects the filter change
    setFilteredProjects([...projects]); // Refresh filteredProjects immediately
  };

  const isProjectOpen = (status) => {
    const openStatuses = [
      "New Lead",
      "Estimate Requested",
      "Estimate Completed",
      "Quote Sent",
      "Approved",
      "Project Active",
    ];
    return openStatuses.includes(status);
  };

  // Handle main filtering of projects including search (legacy function - keeping for compatibility)
  const filterProjects = (label, searchTerm = "") => {
    let filtered = [...projects];

    // Apply Tab Filters (All Projects / Open Projects)
    if (label === "Open Projects") {
      filtered = filtered.filter((project) => isProjectOpen(project.status));
    }

    // Ensure searchTerm is always a string to prevent trim() errors
    if (typeof searchTerm !== "string") {
      searchTerm = "";
    }

    // Apply Search Filter
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((project) => {
        const locationString = getLocationString(project);
        
        // Helper function to safely format and search dates
        const formatDateForSearch = (dateString) => {
          if (!dateString) return "";
          try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + " " + date.toDateString();
          } catch {
            return dateString.toString();
          }
        };

        // Get linked client names - Note: MyProjects doesn't have clients state, but keeping for consistency
        const linkedClientNames = Array.isArray(project.linkedClients) 
          ? project.linkedClients
              .map(clientId => {
                // For MyProjects, we might not have full client data, so just use the ID
                return clientId || "";
              })
              .join(" ")
              .toLowerCase()
          : "";

        return (
          // Project name
          (project.name && project.name.toLowerCase().includes(lowerSearch)) ||
          // Address/Location
          (locationString && locationString.toLowerCase().includes(lowerSearch)) ||
          // Project number/ID
          (project.projectNumber && project.projectNumber.toLowerCase().includes(lowerSearch)) ||
          // Project _id
          (project._id && project._id.toLowerCase().includes(lowerSearch)) ||
          // Linked users
          (Array.isArray(project.linkedUsers) &&
            project.linkedUsers.some((userId) => {
              const user = userData[userId];
              return user && user.name && user.name.toLowerCase().includes(lowerSearch);
            })) ||
          // Status
          (project.status && project.status.toLowerCase().includes(lowerSearch)) ||
          // Linked clients
          (linkedClientNames && linkedClientNames.includes(lowerSearch)) ||
          // Created date
          (project.createdAt && formatDateForSearch(project.createdAt).toLowerCase().includes(lowerSearch)) ||
          // Updated date
          (project.updatedAt && formatDateForSearch(project.updatedAt).toLowerCase().includes(lowerSearch)) ||
          // Due date (if exists)
          (project.dueDate && formatDateForSearch(project.dueDate).toLowerCase().includes(lowerSearch)) ||
          // Project start date (if exists)
          (project.startDate && formatDateForSearch(project.startDate).toLowerCase().includes(lowerSearch)) ||
          // Project completion date (if exists)
          (project.completionDate && formatDateForSearch(project.completionDate).toLowerCase().includes(lowerSearch))
        );
      });
    }

    setFilteredProjects(filtered);
  };

  const handleSearchChange = (e) => {
    const newSearch = e.target.value || "";
    setSearch(newSearch);
    // The useEffect will handle the actual filtering
  };

  const handleProjectTabClick = (label) => {
    if (label === "Create New") {
      navigate("/addNewProject");
      return;
    }
  
    if (activeButton === label) {
      // Clear filters
      setFilters({});
      setSearch("");
      setSortColumn(null);
      setSortOrder(null);
      setActiveButton("All Projects");
    } else {
      setActiveButton(label);
    }
  };
  

  // MyProjects.jsx Return
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
          onChange={handleSearchChange}
        />
      </div>
      {/* Filter Buttons */}
      <div className="flex gap-4 py-1 px-1 text-medium text-textGray rounded-full bg-white">
        {["All Projects", "Open Projects", "Create New"].map((label) => (
          <button
            key={label}
            className={`px-4 py-1 rounded-full transition-colors duration-300 ${
              activeButton === label
                ? "bg-secondary text-white"
                : "bg-transparent text-textGray"
            }`}
            onClick={() => handleProjectTabClick(label)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>

    {/* Loading Spinner or Table */}
    {loading ? (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    ) : (
      <ProjectTable
        projects={filteredProjects || []}
        setProjects={setProjects}
        userData={userData}
        handleSort={handleSort}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        handleFilterChange={handleFilterChange}
        filters={filters}
        isUserView={true}
      />
    )}
  </div>
);
};

export default UserProjectTable;
