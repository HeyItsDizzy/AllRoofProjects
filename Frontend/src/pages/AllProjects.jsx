
// AllProjects.jsx (Admin View) - Pagination Optimized ✅
// Now uses server-side pagination for performance optimization
import React, { useState, useEffect, useCallback } from "react";
import { message } from "antd";
import { useNavigate } from "react-router-dom";
import AssignClient from "../components/AssignClient";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import ProjectTable from "../components/ProjectTable";

const AllProjects = () => {
  const [users, setUsers] = useState([]); // Holds users for assignment (future feature)
  const [clients, setClients] = useState([]); // Holds clients for assignment
  const [userData, setUserData] = useState({}); // Holds user details (avatars & names)
  const navigate = useNavigate(); // Navigate function
  const [isClientModalVisible, setIsClientModalVisible] = useState(false); // ClientModal visibility state
  const [selectedClientProject, setSelectedClientProject] = useState(null); // Selected Client Project for modal

  const axiosSecure = useAxiosSecure();

  // Fetch supporting data (clients, users)
  const fetchClients = useCallback(async () => {
    try {
      const response = await axiosSecure.get("/clients");
      setClients(response.data || []);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      message.error("Failed to load clients");
    }
  }, [axiosSecure]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axiosSecure.get("/users");
      setUsers(response.data || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }, [axiosSecure]);

  const fetchUserData = useCallback(async () => {
    try {
      const response = await axiosSecure.get("/users/all-user-data");
      setUserData(response.data || {});
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  }, [axiosSecure]);

  // Initialize data on component mount
  useEffect(() => {
    fetchClients();
    fetchUsers();
    fetchUserData();
  }, [fetchClients, fetchUsers, fetchUserData]);

  // ══════════════════════════════════════════════════════════════════
  // 🎛️ MODAL HANDLERS
  // ══════════════════════════════════════════════════════════════════

  // Open assign client modal
  const openAssignClientModal = useCallback((project) => {
    setSelectedClientProject(project);
    setIsClientModalVisible(true);
  }, []);

  // Close assign client modal
  const closeAssignClientModal = useCallback(() => {
    setIsClientModalVisible(false);
    setSelectedClientProject(null);
  }, []);

  // Update project clients (callback for modal)
  const updateProjectClients = useCallback((projectId, newClients) => {
    // Note: With pagination, this will trigger a refresh automatically
    // The ProjectTable component handles its own state management
    console.log(`Updated clients for project ${projectId}:`, newClients);
    message.success("Client assignment updated successfully!");
  }, []);

  // Handle status changes (callback for ProjectTable)
  const handleStatusChange = useCallback((projectId, newStatus) => {
    console.log(`Status changed for project ${projectId}: ${newStatus}`);
    // ProjectTable handles optimistic updates internally
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ══════════════════════════════════════════════════════════════════

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">All Projects</h1>
        <p className="text-gray-600">
          Manage and view all projects with server-side pagination for optimal performance.
        </p>
      </div>

      {/* Paginated Project Table */}
      <ProjectTable
        userData={userData}
        clients={clients}
        openAssignClient={openAssignClientModal}
        onStatusChange={handleStatusChange}
        userRole="Admin"
        columnConfig={{
          assignClient: true,
          projectName: true,
          dueDate: true,
          cost: true,
          status: true,
          postingDate: true
        }}
        isUserView={false}
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
