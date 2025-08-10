// src/Components/ProjectTable.jsx
import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import Swal from "@/shared/swalConfig";
import { projectStatuses, estimateStatuses } from "../shared/projectStatuses";
import Avatar from "../shared/Avatar";
import { navigateToProject } from "../utils/projectAliasUtils";

export default function ProjectTable({
  projects = [],
  setProjects,
  userData = {},
  clients = [],
  openAssignClient = () => {},
  isUserView = false,
}) {
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();

  // ─── State Management ──────────────────────────────────────────────────────
  const [sortColumn, setSortColumn] = useState("projectNumber");
  const [sortOrder, setSortOrder] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("All");

  // ─── Computed Values ───────────────────────────────────────────────────────
  const statuses = useMemo(() => {
    const seen = new Set();
    return [...projectStatuses, ...estimateStatuses].filter((status) => {
      if (seen.has(status.label)) return false;
      seen.add(status.label);
      return true;
    });
  }, []);

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const handleSort = useCallback((column) => {
    if (column === sortColumn) {
      setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  }, [sortColumn]);

  const handleStatusFilterChange = useCallback((event) => {
    setStatusFilter(event.target.value);
  }, []);

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

  // ─── Sorting Logic ─────────────────────────────────────────────────────────
  const numericProjectNumberSort = useCallback(
    (projectA, projectB) => {
      const [yearA, restA] = (projectA.projectNumber || "0-00000").split("-");
      const [yearB, restB] = (projectB.projectNumber || "0-00000").split("-");
      
      const yearNumA = parseInt(yearA);
      const yearNumB = parseInt(yearB);
      
      if (yearNumA !== yearNumB) {
        return sortOrder === "asc" 
          ? yearNumA - yearNumB 
          : yearNumB - yearNumA;
      }
      
      const monthA = parseInt(restA.slice(0, 2));
      const monthB = parseInt(restB.slice(0, 2));
      
      if (monthA !== monthB) {
        return sortOrder === "asc" 
          ? monthA - monthB 
          : monthB - monthA;
      }
      
      const sequenceA = parseInt(restA.slice(2));
      const sequenceB = parseInt(restB.slice(2));
      
      return sortOrder === "asc" 
        ? sequenceA - sequenceB 
        : sequenceB - sequenceA;
    },
    [sortOrder]
  );

  // ─── Data Processing ───────────────────────────────────────────────────────
  const displayedProjects = useMemo(() => {
    let filteredProjects = [...projects];

    // Apply status filter
    if (statusFilter !== "All") {
      filteredProjects = filteredProjects.filter(
        (project) => project.status === statusFilter
      );
    }

    // Apply sorting
    if (sortColumn === "projectNumber") {
      filteredProjects.sort(numericProjectNumberSort);
    } else {
      filteredProjects.sort((projectA, projectB) => {
        const valueA = projectA[sortColumn] ?? "";
        const valueB = projectB[sortColumn] ?? "";
        
        if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
        if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filteredProjects;
  }, [projects, statusFilter, sortColumn, sortOrder, numericProjectNumberSort]);

  // ─── Helper Functions ──────────────────────────────────────────────────────
  const getProjectDisplayInfo = useCallback((project) => {
    const isProjectStatus = projectStatuses.find(
      (status) => status.label === project.status
    );
    const isEstimateStatus = estimateStatuses.find(
      (status) => status.label === project.status
    );
    
    const displayLabel = isEstimateStatus && !isProjectStatus
      ? `ART: ${project.status}`
      : project.status;
    
    const displayColor = (isProjectStatus || isEstimateStatus)?.color ?? 
      "bg-gray-300 text-black";
    
    const isClientLocked = !isProjectStatus && 
      project.status !== "Estimate Completed";

    return { displayLabel, displayColor, isClientLocked };
  }, []);

  const getSortIcon = useCallback((column) => {
    if (sortColumn === column) {
      return sortOrder === "asc" ? "🔼" : "🔽";
    }
    return "";
  }, [sortColumn, sortOrder]);

  const getProjectLocation = useCallback((project) => {
    if (typeof project.location === "string") {
      return project.location;
    }
    return project.location?.full_address || "No Address Available";
  }, []);

  // ─── Component Renderers ───────────────────────────────────────────────────
  const renderClientCell = useCallback((project) => {
    if (isUserView) return null;

    const hasLinkedClients = Array.isArray(project.linkedClients) && 
      project.linkedClients.length > 0;

    return (
      <td onClick={(event) => event.stopPropagation()}>
        {hasLinkedClients ? (
          <div className="flex flex-wrap gap-2">
            {project.linkedClients.map((clientId) => {
              const client = clients.find((c) => c._id === clientId) || {};
              return (
                <button
                  key={clientId}
                  className="flex items-center gap-2 border rounded-md px-3 h-8 bg-gray-100 hover:bg-gray-200 transition text-sm font-medium shadow"
                  onClick={(event) => {
                    event.stopPropagation();
                    openAssignClient(project);
                  }}
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
            className="bg-green-500 text-white px-3 py-2 h-8 rounded-md text-sm font-medium shadow hover:bg-green-600 transition"
            onClick={(event) => {
              event.stopPropagation();
              openAssignClient(project);
            }}
          >
            Assign
          </button>
        )}
      </td>
    );
  }, [isUserView, clients, openAssignClient]);

  const renderStatusCell = useCallback((project) => {
    const { displayLabel, displayColor, isClientLocked } = getProjectDisplayInfo(project);
    
    return (
      <td onClick={(event) => event.stopPropagation()}>
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
      </td>
    );
  }, [getProjectDisplayInfo, handleStatusChange]);

  const renderMobileClientSection = useCallback((project) => {
    if (isUserView) return null;

    const hasLinkedClients = Array.isArray(project.linkedClients) && 
      project.linkedClients.length > 0;

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
                  className="flex items-center gap-2 border rounded-md px-3 py-2 bg-gray-100 hover:bg-gray-200 transition text-sm font-medium shadow"
                  onClick={(event) => {
                    event.stopPropagation();
                    openAssignClient(project);
                  }}
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
            className="bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium shadow hover:bg-green-600 transition"
            onClick={(event) => {
              event.stopPropagation();
              openAssignClient(project);
            }}
          >
            Assign Client
          </button>
        )}
      </div>
    );
  }, [isUserView, clients, openAssignClient]);

  const renderTableHeader = useCallback(() => (
    <thead>
      <tr className="text-left h-8 bg-primary-10 text-medium">
        <th
          className="w-[150px] cursor-pointer"
          onClick={() => handleSort("projectNumber")}
        >
          Project ID {getSortIcon("projectNumber")}
        </th>

        {!isUserView && <th className="w-[150px]">Linked Client</th>}

        <th
          className="w-[250px] cursor-pointer"
          onClick={() => handleSort("name")}
        >
          Project Name / Address {getSortIcon("name")}
        </th>

        <th
          className="w-[150px] cursor-pointer"
          onClick={() => handleSort("due_date")}
        >
          Due Date {getSortIcon("due_date")}
        </th>

        <th
          className="w-[100px] cursor-pointer"
          onClick={() => handleSort("total")}
        >
          Cost {getSortIcon("total")}
        </th>

        <th className="w-[150px] cursor-pointer relative">
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

        <th
          className="w-[150px] cursor-pointer"
          onClick={() => handleSort("posting_date")}
        >
          Date Posted {getSortIcon("posting_date")}
        </th>
      </tr>
    </thead>
  ), [handleSort, getSortIcon, isUserView, statusFilter, handleStatusFilterChange, statuses]);

  const renderTableRow = useCallback((project) => (
    <tr
      key={project._id}
      className="border-t-[1px] text-semiBold cursor-pointer hover:bg-gray-100"
      onClick={() => navigateToProject(project, navigate, axiosSecure)}
    >
      <td>{project.projectNumber}</td>
      
      {renderClientCell(project)}

      <td>
        <span className="font-semibold line-clamp-1">{project.name}</span>
        <p className="text-gray-500 text-sm line-clamp-2">
          {getProjectLocation(project)}
        </p>
      </td>

      <td>{project.due_date || "N/A"}</td>
      <td>${project.total || "0"}</td>
      
      {renderStatusCell(project)}

      <td>{project.posting_date || "N/A"}</td>
    </tr>
  ), [navigate, renderClientCell, getProjectLocation, renderStatusCell, axiosSecure]);

  const renderEmptyState = useCallback(() => (
    <tr>
      <td colSpan={isUserView ? 6 : 7} className="text-center py-4">
        No projects found
      </td>
    </tr>
  ), [isUserView]);

  // ─── Main Render ───────────────────────────────────────────────────────────
  return (
    <div className="overflow-x-auto bg-white p-4 rounded-md">
      {/* Desktop Table */}
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

      {/* Mobile View */}
      <div className="md:hidden space-y-4 px-2">
        {displayedProjects.map((project) => {
          const { displayLabel, displayColor, isClientLocked } = getProjectDisplayInfo(project);

          return (
            <div
              key={project._id}
              className="bg-white p-5 rounded-lg shadow-md border border-gray-300 hover:shadow-lg transition cursor-pointer"
              onClick={() => navigateToProject(project, navigate, axiosSecure)}
            >
              {/* Project ID and Name */}
              <div className="mb-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-600">Project ID:</span>
                  <span className="text-sm font-semibold">{project.projectNumber}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
                <p className="text-sm text-gray-600">{getProjectLocation(project)}</p>
              </div>

              {/* Client Section */}
              {renderMobileClientSection(project)}

              {/* Project Details */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 block">Due Date:</label>
                  <span className="text-sm">{project.due_date || "N/A"}</span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block">Cost:</label>
                  <span className="text-sm font-semibold">${project.total || "0"}</span>
                </div>
              </div>

              {/* Status */}
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-600 mb-1 block">Status:</label>
                <div onClick={(event) => event.stopPropagation()}>
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
                </div>
              </div>

              {/* Date Posted */}
              <div className="text-right">
                <span className="text-xs text-gray-500">
                  Posted: {project.posting_date || "N/A"}
                </span>
              </div>
            </div>
          );
        })}
        
        {displayedProjects.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            No projects found
          </p>
        )}
      </div>
    </div>
  );
}