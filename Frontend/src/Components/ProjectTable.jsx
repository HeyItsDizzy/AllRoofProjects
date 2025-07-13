import React from "react";
import { useNavigate } from "react-router-dom";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";
import { projectStatuses as statuses } from "../shared/projectStatuses";
import Avatar from "../shared/Avatar";

const ProjectTable = ({
  projects = [],
  setProjects,
  userData = {},
  openAssignUser = () => {},
  handleSort = () => {},
  sortColumn,
  sortOrder,
  handleFilterChange = () => {},
  filters = {},
  handleStatusChange = () => {},
  isUserView = false, // 👈 make sure this is here!
}) => {

  const navigate = useNavigate();

  // ✅ Function to handle status changeconst projectsToDisplay =
const projectsToDisplay =
  sortColumn === "projectNumber"
    ? [...projects].sort((a, b) => numericProjectNumberSort(a, b, sortOrder))
    : projects;


  // ✅ Function to update project status in the database & UI
  const updateProjectStatus = async (projectId, newStatus) => {
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


function numericProjectNumberSort(a, b, sortOrder = "desc") {
  const [aYear, aRest] = (a.projectNumber || "0-00000").split("-");
  const [bYear, bRest] = (b.projectNumber || "0-00000").split("-");

  const aYearNum = parseInt(aYear, 10);
  const bYearNum = parseInt(bYear, 10);
  if (aYearNum !== bYearNum)
    return sortOrder === "asc" ? aYearNum - bYearNum : bYearNum - aYearNum;

  const aMonthNum = parseInt(aRest.slice(0, 2), 10);
  const bMonthNum = parseInt(bRest.slice(0, 2), 10);
  if (aMonthNum !== bMonthNum)
    return sortOrder === "asc" ? aMonthNum - bMonthNum : bMonthNum - aMonthNum;

  const aSeqNum = parseInt(aRest.slice(2), 10);
  const bSeqNum = parseInt(bRest.slice(2), 10);
  return sortOrder === "asc" ? aSeqNum - bSeqNum : bSeqNum - aSeqNum;
}






  // ProjectTable.jsx Return Block
  return (
    <div className="overflow-x-auto bg-white p-4 rounded-md">
      {/* ✅ Desktop Table - Only Visible on Larger Screens */}
<div className="hidden md:block overflow-x-auto bg-white p-4 rounded-md">
  <table className="w-full min-w-[600px]">
    {/* ✅ Table Headers */}
    <thead>
      <tr className="text-left h-8 bg-primary-10 text-medium">
<th className="w-[150px] cursor-pointer" onClick={() => handleSort("projectNumber")}>
  Project ID {sortColumn === "projectNumber" ? (sortOrder === "asc" ? "🔼" : "🔽") : ""}
</th>

        {!isUserView && (
  <th className="w-[150px]">Linked User</th>
)}

        <th className="w-[250px] cursor-pointer" onClick={() => handleSort("name")}>
          Project Name / Address {sortColumn === "name" ? (sortOrder === "asc" ? "🔼" : "🔽") : ""}
        </th>
        <th className="w-[150px] cursor-pointer" onClick={() => handleSort("due_date")}>
          Due Date {sortColumn === "due_date" ? (sortOrder === "asc" ? "🔼" : "🔽") : ""}
        </th>
        <th className="w-[100px] cursor-pointer" onClick={() => handleSort("total")}>
          Cost {sortColumn === "total" ? (sortOrder === "asc" ? "🔼" : "🔽") : ""}
        </th>
        <th className="w-[150px] cursor-pointer relative">
          Status
          <div className="inline-block ml-2">
            <select
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="border rounded px-3 py-2 w-full text-sm font-medium"
              value={filters["status"]?.[0] || "All"} 
            >
              <option value="All">All</option>
              {statuses.map((status) => (
                <option key={status.label} value={status.label}>{status.label}</option>
              ))}
            </select>
          </div>
        </th>
        <th className="w-[150px] cursor-pointer" onClick={() => handleSort("posting_date")}>
          Date Posted {sortColumn === "posting_date" ? (sortOrder === "asc" ? "🔼" : "🔽") : ""}
        </th>
      </tr>
    </thead>

    {/* ✅ Table Body */}
   <tbody>
  {projectsToDisplay.length > 0 ? (
    projectsToDisplay.map((project) => {
          const currentStatus = statuses?.find((s) => s.label === project?.status) || { label: "New Lead", color: "bg-gray-300" };

          return (
            <tr 
              key={project._id} 
              className="border-t-[1px] text-semiBold cursor-pointer hover:bg-gray-100"
              onClick={() => navigate(`/project/${project._id}`)}
            >
              {/* ✅ Project ID */}
              <td>{project.projectNumber}</td>

              {/* ✅ Linked Users (Uniform Button Styling) */}
              {!isUserView && (
  <td onClick={(e) => e.stopPropagation()}>
{Array.isArray(project.linkedUsers) && project.linkedUsers.length > 0 ? (
  <div className="flex flex-wrap gap-2">
    {project.linkedUsers.map((userId, index) => {
      const key = userId || `placeholder-${index}`;

      if (!userId || userId === "null" || !userData[userId]) {
        return (
          <span key={key} className="text-sm text-gray-500">
            Loading...
          </span>
        );
      }

      const user = userData[userId];

      return (
        <button
          key={key}
          className="flex items-center gap-2 border rounded-md px-3 h-8 bg-gray-100 hover:bg-gray-200 transition text-sm font-medium shadow"
          onClick={(e) => {
            e.stopPropagation();
            openAssignUser(project);
          }}
        >
          <div className="flex items-center gap-2">
            <Avatar
              name={user.company || user.name}
              avatarUrl={user.avatar}
              size="sm"
            />
            <span className="text-sm text-gray-700 truncate overflow-hidden w-[90px]">
              {user.company || user.name}
            </span>
          </div>
        </button>
      );
    })}
  </div>
) : (
  <button
    className="bg-green-500 text-white px-3 py-2 h-8 rounded-md text-sm font-medium shadow hover:bg-green-600 transition flex items-center justify-center"
    onClick={(e) => {
      e.stopPropagation();
      openAssignUser(project);
    }}
  >
    Assign
  </button>
)}

  </td>
)}


              {/* ✅ Project Name & Address */}
              <td>
                <span className="font-semibold">{project.name}</span>
                <p className="text-gray-500 text-sm">
  {
    typeof project.location === "string"
      ? project.location
      : project.location?.full_address || "No Address Available"
  }
</p>

              </td>

              {/* ✅ Due Date */}
              <td>{project.due_date || "N/A"}</td>

              {/* ✅ Cost */}
              <td>${project.total || "0"}</td>

              {/* ✅ Status Dropdown */}
              <td onClick={(e) => e.stopPropagation()}>
                <select
                  className={`border rounded-md px-3 py-2 cursor-pointer text-sm font-medium ${currentStatus?.color || "bg-gray-300"}`}
                  value={project.status || "New Lead"}
                  onChange={(e) => handleStatusChange(project._id, e.target.value)}
                >
                  {statuses.map((status) => (
                    <option key={status.label} value={status.label}>{status.label}</option>
                  ))}
                </select>
              </td>

              {/* ✅ Date Posted */}
              <td>{project.posting_date || "N/A"}</td>
            </tr>
          );
        })
      ) : (
        <tr>
          <td colSpan="7" className="text-center py-4">No projects found</td>
        </tr>
      )}
    </tbody>
  </table>
</div>


  
      {/* ✅ Mobile View (Fixed Long Username Overflow) */}
<div className="md:hidden space-y-4 px-2">
  {projectsToDisplay.length > 0 ? (
    projectsToDisplay.map((project) => {
      const currentStatus = statuses?.find((s) => s.label === project?.status) || { label: "New Lead", color: "bg-gray-300" };

      return (
        <div 
          key={project._id} 
          className="bg-white p-5 rounded-lg shadow-md border border-gray-300 hover:shadow-lg transition"
        >
          {/* ✅ Project Number at the Top */}
          <div className="text-gray-600 text-sm font-medium text-right mb-2">
            Project #: {project.projectNumber || "N/A"}
          </div>

          {/* ✅ Project Header (Name & Address) */}
          <div>
            <h3 className="text-lg font-semibold leading-tight">{project.name}</h3>
            <p className="text-gray-500 text-xs">
  {
    typeof project.location === "string"
      ? project.location
      : project.location?.full_address || "No Address Available"
  }
</p>

          </div>

          {/* ✅ Status Dropdown */}
          <div className="mt-3">
            <select
              value={project.status || "New Lead"}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleStatusChange(project._id, e.target.value)}
              className={`border rounded px-3 py-2 w-full text-sm font-medium ${currentStatus?.color || "bg-gray-300"}`}
            >
              {statuses.map((status) => (
                <option key={status.label} value={status.label}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* ✅ View Project Button & Assigned Users */}
          <div className="mt-4 flex items-center gap-2">
            {/* ✅ View Project Button (Same Height) */}
            <button 
              onClick={() => navigate(`/project/${project._id}`)} 
              className="bg-blue-500 text-white px-4 py-2 h-8 rounded-md text-sm w-1/3 font-semibold shadow hover:bg-blue-600 transition flex items-center justify-center"
            >
              View
            </button>

            {/* ✅ Assigned Users (Prevent Overflow) */}
            {!isUserView && (
              <div className="w-2/3 flex flex-wrap gap-2 justify-end">
  {Array.isArray(project.linkedUsers) && project.linkedUsers.length > 0 ? (
    project.linkedUsers.map((userId, index) => {
      const key = userId || `placeholder-${index}`;

      if (!userId || userId === "null" || !userData[userId]) {
        return (
          <span key={key} className="text-sm text-gray-500">Loading...</span>
        );
      }

      const user = userData[userId];

      return (
        <button
          key={key}
          className="flex items-center gap-2 border rounded-md px-3 h-8 bg-gray-100 hover:bg-gray-200 transition max-w-[150px] truncate overflow-hidden"
          onClick={(e) => {
            e.stopPropagation();
            openAssignUser(project);
          }}
        >
          <div className="flex items-center gap-2">
            <Avatar
              name={user.company || user.name}
              avatarUrl={user.avatar}
              size="sm"
            />
            <span className="text-sm text-gray-700 truncate overflow-hidden w-[90px]">
              {user.company || user.name}
            </span>
          </div>
        </button>
      );
    })
  ) : (
    <button
      className="bg-green-500 text-white px-4 py-2 h-8 rounded-md text-sm font-semibold shadow hover:bg-green-600 transition flex items-center justify-center"
      onClick={(e) => {
        e.stopPropagation();
        openAssignUser(project);
      }}
    >
      Assign User
    </button>
  )}
</div>

)}

          </div>
        </div>
      );
    })
  ) : (
    <p className="text-center text-gray-500 py-4">No projects found</p>
  )}
</div>






    </div>
  );
  

  
};

export default ProjectTable;
