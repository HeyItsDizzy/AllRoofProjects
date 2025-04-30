import React, { useState, useEffect } from "react";
import { Button } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { IconSearch, IconDown, IconPending, IconComplete } from "../shared/IconSet";
import AssignUser from "../components/AssignUser";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import ProjectTable from "../components/ProjectTable";
import { projectStatuses } from "../shared/projectStatuses";

const AdminProjectTable = () => {
  const [projects, setProjects] = useState([]); // Holds all projects
  const [users, setUsers] = useState([]); // Holds users for assignment
  const [userData, setUserData] = useState({}); // Holds user details (avatars & names)
  const [search, setSearch] = useState(""); // Search query
  const [activeButton, setActiveButton] = useState("All Projects"); // Filter state
  const navigate = useNavigate(); // ✅ Get navigate function
  const [isModalVisible, setIsModalVisible] = useState(false); // Modal visibility state
  const [selectedProject, setSelectedProject] = useState(null); // Selected project for modal
  const axiosSecure = useAxiosSecure();

  // Sorting and filtering states
  const [filteredProjects, setFilteredProjects] = useState([]); // Stores filtered projects
  const [sortColumn, setSortColumn] = useState(null); // Stores active sort column
  const [sortOrder, setSortOrder] = useState("asc"); // Stores sorting order
  const [filters, setFilters] = useState({}); // Stores applied filters

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axiosSecure.get("/projects/get-projects");
        console.log("Full Project Data Response:", response.data); // ✅ Debug entire response
        setProjects(response.data.data || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    fetchProjects();
  }, []);
  

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axiosSecure.get("/users/get-userData");
        setUsers(response.data.data || []);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  // Fetch user details based on linked users
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!projects.length) return;
  
      const userIds = projects.flatMap((p) =>
        Array.isArray(p.linkedUsers)
          ? p.linkedUsers.filter((id) => id && id !== "null")
          : []
      );
      
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
  

  // Filter projects based on active button
  useEffect(() => {
    filterProjects(activeButton); // Apply filtering when projects update
  }, [projects, activeButton]);

  // Filter projects based on search query
  useEffect(() => {
    let filtered = [...projects];

    // ✅ Apply Tab Filters (All Projects / Open Projects)
    if (activeButton === "Open Projects") {
      filtered = filtered.filter((project) => isProjectOpen(project.status));
    }

    // ✅ Apply Column Filters (Ignore "All")
    Object.keys(filters).forEach((column) => {
      if (filters[column] && filters[column].length > 0) {
        if (!filters[column].includes("All")) { // ✅ Ensure "All" does not filter anything
          filtered = filtered.filter((project) => filters[column].includes(project[column]));
        }
      }
    });

    // ✅ Apply Search Filter
    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter((project) =>
        (project.name && project.name.toLowerCase().includes(lowerSearch)) ||
        (project.location && project.location.toLowerCase().includes(lowerSearch)) ||
        (Array.isArray(project.linkedUsers) &&
          project.linkedUsers.some((userId) => {
            const user = userData[userId];
            return user && user.name.toLowerCase().includes(lowerSearch);
          })) ||
        (project.status && project.status.toLowerCase().includes(lowerSearch))
      );
    }

    setFilteredProjects(filtered);
  }, [projects, activeButton, filters, search]); // ✅ Ensures filters update correctly

  // Callback function to update project users
  const updateProjectUsers = (projectId, linkedUsers) => {
    setProjects((prevProjects) =>
      prevProjects.map((project) =>
        project._id === projectId ? { ...project, linkedUsers } : project
      )
    );
  };

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
  
    setProjects(sortedProjects); // ✅ Update the full list
    setFilteredProjects(sortedProjects); // ✅ Ensure displayed projects are sorted
  };
  

  const handleFilterChange = (column, value) => {
    setFilters((prevFilters) => {
      const updatedFilters = { ...prevFilters };

      if (value === "All") {
        delete updatedFilters[column]; // ✅ Remove filter completely
      } else {
        updatedFilters[column] = [value]; // ✅ Store selected value
      }

      return { ...updatedFilters }; // ✅ Force state update
    });

    // ✅ Ensure `useEffect` detects the filter change
    setFilteredProjects([...projects]); // ✅ Refresh filteredProjects immediately
  };

  const handleStatusChange = async (projectId, newStatus) => {
    try {
      const axiosSecure = useAxiosSecure();
      const response = await axiosSecure.patch(`/projects/update-status/${projectId}`, { status: newStatus });

      if (response.data.success) {
        setProjects((prevProjects) =>
          prevProjects.map((project) =>
            project._id === projectId ? { ...project, status: newStatus } : project
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
  };

  // Function to open Assign User Modal
  const openAssignUserModal = (project) => {
    setSelectedProject(project);
    setIsModalVisible(true);
  };

  const closeAssignUserModal = () => {
    setIsModalVisible(false);
    setSelectedProject(null);
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

  // Handle main filtering of projects including search
  const filterProjects = (label, searchTerm = "") => {
    let filtered = [...projects]; // ✅ Start with all projects

    // ✅ Apply Tab Filters (All Projects / Open Projects)
    if (label === "Open Projects") {
      filtered = filtered.filter((project) => isProjectOpen(project.status));
    }

    // ✅ Ensure searchTerm is always a string to prevent trim() errors
    if (typeof searchTerm !== "string") {
      searchTerm = "";
    }

    // ✅ Apply Search Filter
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((project) =>
        (project.name && project.name.toLowerCase().includes(lowerSearch)) ||
        (project.location && project.location.toLowerCase().includes(lowerSearch)) ||
        (Array.isArray(project.linkedUsers) &&
          project.linkedUsers.some((userId) => {
            const user = userData[userId];
            return user && user.name.toLowerCase().includes(lowerSearch);
          })) ||
        (project.status && project.status.toLowerCase().includes(lowerSearch))
      );
    }

    setFilteredProjects(filtered); // ✅ Update UI
  };

  const handleSearchChange = (e) => {
    const newSearch = e.target.value || ""; // ✅ Ensure it's always a string
    setSearch(newSearch);
    filterProjects(activeButton, newSearch);
  };

  const handleProjectTabClick = (label) => {
    if (activeButton === label) {
      // ✅ If clicking the same active button, clear all filters
      setFilters({});
      setSearch("");
      setSortColumn(null);
      setSortOrder(null);
      filterProjects("All Projects", ""); // ✅ Reset to show all projects
    } else {
      // ✅ Otherwise, switch tabs normally and retain filters
      setActiveButton(label);
      filterProjects(label, search || ""); // ✅ Keep the search input if switching tabs
    }

    if (label === "Create New") {
      navigate("/addNewProject"); // ✅ Redirect to project creation
    }
  };

  // AdminProjectTable.jsx Return
  return (
    <div className="min-h-screen">
      {/* Search & Filter Section */}
      <div className="w-full mx-auto my-6 flex flex-col md:flex-row md:justify-between items-center gap-4">
        <div className="relative">
          <IconSearch className="absolute top-[11px] left-2" />
          <input
            type="text"
            placeholder="Search projects by name, user, or address..."
            className="pl-10 h-9 rounded-md placeholder:text-medium"
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

{/* ✅ Always render ProjectTable (Both Desktop & Mobile) */}
<ProjectTable
  projects={filteredProjects || []}
  setProjects={setProjects}
  userData={userData}
  openAssignUser={openAssignUserModal}
  handleSort={handleSort}
  sortColumn={sortColumn}
  sortOrder={sortOrder}
  handleFilterChange={handleFilterChange}
  filters={filters}
  handleStatusChange={handleStatusChange}
/>


      {/* Assign User Modal */}
      {isModalVisible && (
        <AssignUser
          users={users}
          projectId={selectedProject?._id}
          project={selectedProject}
          closeModal={closeAssignUserModal}
          updateProjectUsers={updateProjectUsers}
        />
      )}
    </div>
  );
};

export default AdminProjectTable;
