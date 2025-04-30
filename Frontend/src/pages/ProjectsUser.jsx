import React, { useState, useEffect } from "react";
import { Button } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { IconSearch } from "../shared/IconSet";
import { IconDown } from "../shared/IconSet";
import { IconPending } from "../shared/IconSet";
import { IconComplete } from "../shared/IconSet";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import ProjectTable from "../Components/ProjectTable";
import { projectStatuses } from "../shared/projectStatuses";

const UserProjectTable = () => {
  const [projects, setProjects] = useState([]); // Holds all projects
  const [userData, setUserData] = useState({}); // Holds user details (avatars & names)
  const [search, setSearch] = useState(""); // Search query
  const [activeButton, setActiveButton] = useState("All Projects"); // Filter state
  const navigate = useNavigate(); // Get navigate function
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
        const response = await axiosSecure.get("/projects/get-user-projects");
        console.log("User Project Data Response:", response.data); // Debug entire response
        setProjects(response.data.data || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    fetchProjects();
  }, []);

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
  

  // Filter projects based on active button
  useEffect(() => {
    filterProjects(activeButton); // Apply filtering when projects update
  }, [projects, activeButton]);

  // Filter projects based on search query
  useEffect(() => {
    let filtered = [...projects];

    // Apply Tab Filters (All Projects / Open Projects)
    if (activeButton === "Open Projects") {
      filtered = filtered.filter((project) => isProjectOpen(project.status));
    }

    // Apply Column Filters (Ignore "All")
    Object.keys(filters).forEach((column) => {
      if (filters[column] && filters[column].length > 0) {
        if (!filters[column].includes("All")) { // Ensure "All" does not filter anything
          filtered = filtered.filter((project) => filters[column].includes(project[column]));
        }
      }
    });

    // Apply Search Filter
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
  }, [projects, activeButton, filters, search]); // Ensures filters update correctly

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

  // Handle main filtering of projects including search
  const filterProjects = (label, searchTerm = "") => {
    let filtered = [...projects]; // Start with all projects

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

    setFilteredProjects(filtered); // Update UI
  };

  const handleSearchChange = (e) => {
    const newSearch = e.target.value || ""; // Ensure it's always a string
    setSearch(newSearch);
    filterProjects(activeButton, newSearch);
  };

  const handleProjectTabClick = (label) => {
    if (label === "Create New") {
      navigate("/addNewProject"); // 👈 Go to Add Project Page
      return;
    }
  
    if (activeButton === label) {
      // Clear filters
      setFilters({});
      setSearch("");
      setSortColumn(null);
      setSortOrder(null);
      filterProjects("All Projects", "");
    } else {
      setActiveButton(label);
      filterProjects(label, search || "");
    }
  };
  

  // ProjectsUser.jsx Return
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

      {/* Always render ProjectTable (Both Desktop & Mobile) */}
      <ProjectTable
        projects={filteredProjects || []}
        setProjects={setProjects}
        userData={userData}
        handleSort={handleSort}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        handleFilterChange={handleFilterChange}
        filters={filters}
        isUserView={true} // 👈 Add this to inform table renderer
      />

    </div>
  );
};

export default UserProjectTable;
