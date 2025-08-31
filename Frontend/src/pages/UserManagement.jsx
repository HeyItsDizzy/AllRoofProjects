// src/pages/UserManagement.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from "../auth/AuthProvider";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import Avatar from "../shared/Avatar";
import { 
  IconEdit, 
  IconDelete, 
  IconBlock, 
  IconUnblock, 
  IconPromote, 
  IconDemote,
  IconInvite,
  IconRefresh
} from "../shared/IconSet";
import InviteUserModal from "../components/InviteUserModal";

export default function UserManagement() {
  const { user: currentUser } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosSecure.get("/users/get-users");
      if (response.data.success) {
        setUsers(response.data.data);
        setFilteredUsers(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch users",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (filterRole !== "All") {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    // Status filter
    if (filterStatus !== "All") {
      if (filterStatus === "Active") {
        filtered = filtered.filter(user => !user.isBlock && !user.isDeleted);
      } else if (filterStatus === "Blocked") {
        filtered = filtered.filter(user => user.isBlock);
      } else if (filterStatus === "Deleted") {
        filtered = filtered.filter(user => user.isDeleted);
      }
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [users, searchTerm, filterRole, filterStatus]);

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Helper function to get user name safely
  const getUserName = (user) => {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName} ${lastName}`.trim() || user.email || 'Unknown User';
  };

  // User Actions
  const handlePromoteUser = async (userId, userName) => {
    try {
      const result = await Swal.fire({
        title: `Promote ${userName} to Admin?`,
        text: "This will give them full administrative privileges.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, promote!",
      });

      if (result.isConfirmed) {
        const response = await axiosSecure.patch(`/users/make-admin/${userId}`);
        if (response.data.success) {
          await fetchUsers();
          Swal.fire("Promoted!", `${userName} is now an Admin.`, "success");
        }
      }
    } catch (error) {
      console.error("Error promoting user:", error);
      Swal.fire("Error", "Failed to promote user", "error");
    }
  };

  const handleDemoteUser = async (userId, userName) => {
    try {
      const result = await Swal.fire({
        title: `Demote ${userName} to User?`,
        text: "This will remove their administrative privileges.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, demote!",
      });

      if (result.isConfirmed) {
        const response = await axiosSecure.patch(`/users/remove-admin/${userId}`);
        if (response.data.success) {
          await fetchUsers();
          Swal.fire("Demoted!", `${userName} is now a regular User.`, "success");
        }
      }
    } catch (error) {
      console.error("Error demoting user:", error);
      Swal.fire("Error", "Failed to demote user", "error");
    }
  };

  const handleBlockUser = async (userId, userName) => {
    try {
      const result = await Swal.fire({
        title: `Block ${userName}?`,
        text: "This user will not be able to access the system.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, block!",
      });

      if (result.isConfirmed) {
        const response = await axiosSecure.patch(`/users/block-user/${userId}`);
        if (response.data.success) {
          await fetchUsers();
          Swal.fire("Blocked!", `${userName} has been blocked.`, "success");
        }
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      Swal.fire("Error", "Failed to block user", "error");
    }
  };

  const handleUnblockUser = async (userId, userName) => {
    try {
      const response = await axiosSecure.patch(`/users/unblock-user/${userId}`);
      if (response.data.success) {
        await fetchUsers();
        Swal.fire("Unblocked!", `${userName} has been unblocked.`, "success");
      }
    } catch (error) {
      console.error("Error unblocking user:", error);
      Swal.fire("Error", "Failed to unblock user", "error");
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    try {
      const result = await Swal.fire({
        title: `Delete ${userName}?`,
        text: "This action cannot be undone!",
        icon: "error",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete!",
      });

      if (result.isConfirmed) {
        const response = await axiosSecure.patch(`/users/delete-user/${userId}`);
        if (response.data.success) {
          await fetchUsers();
          Swal.fire("Deleted!", `${userName} has been marked as deleted.`, "success");
        }
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      Swal.fire("Error", "Failed to delete user", "error");
    }
  };

  const getUserStatusBadge = (user) => {
    if (user.isDeleted) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Deleted</span>;
    }
    if (user.isBlock) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Blocked</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>;
  };

  const getRoleBadge = (role) => {
    const roleStr = String(role || 'User');
    const colors = {
      Admin: "bg-purple-100 text-purple-800",
      User: "bg-blue-100 text-blue-800",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[roleStr] || colors.User}`}>
        {roleStr}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bgGray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-textGray">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgGray p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-textBlack">User Management</h1>
            <p className="text-textGray mt-1">Manage users, roles, and permissions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition flex items-center gap-2"
            >
              <IconInvite className="w-6 h-6" />
              Invite User
            </button>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
            >
              <IconRefresh className="w-6 h-6" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-textBlack mb-1">Search</label>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textBlack mb-1">Role</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="User">User</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-textBlack mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Blocked">Blocked</option>
                <option value="Deleted">Deleted</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-textGray">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar
                          name={`${String(user.firstName || '')} ${String(user.lastName || '')}`}
                          avatarUrl={user.avatar}
                          size="lg"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-textBlack">
                            {String(user.firstName || '')} {String(user.lastName || '')}
                          </div>
                          <div className="text-sm text-textGray">{String(user.email || '')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-textBlack">{String(user.phone || 'No phone')}</div>
                      <div className="text-sm text-textGray">{String(user.address || 'No address')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-textBlack">{String(user.company || 'No company')}</div>
                      {Boolean(user.companyAdmin) && (
                        <div className="text-xs text-primary">Company Admin</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getUserStatusBadge(user)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* Role Management */}
                        {String(user.role) === "User" && !user.isDeleted && (
                          <button
                            onClick={() => handlePromoteUser(user._id, getUserName(user))}
                            className="p-1 text-green-600 hover:text-green-800 transition"
                            title="Promote to Admin"
                          >
                            <IconPromote className="w-6 h-6" />
                          </button>
                        )}
                        {String(user.role) === "Admin" && String(user._id) !== String(currentUser._id) && !user.isDeleted && (
                          <button
                            onClick={() => handleDemoteUser(user._id, getUserName(user))}
                            className="p-1 text-orange-600 hover:text-orange-800 transition"
                            title="Demote to User"
                          >
                            <IconDemote className="w-6 h-6" />
                          </button>
                        )}

                        {/* Block/Unblock */}
                        {!user.isDeleted && String(user._id) !== String(currentUser._id) && (
                          <>
                            {user.isBlock ? (
                              <button
                                onClick={() => handleUnblockUser(user._id, getUserName(user))}
                                className="p-1 text-blue-600 hover:text-blue-800 transition"
                                title="Unblock User"
                              >
                                <IconUnblock className="w-6 h-6" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlockUser(user._id, getUserName(user))}
                                className="p-1 text-yellow-600 hover:text-yellow-800 transition"
                                title="Block User"
                              >
                                <IconBlock className="w-6 h-6" />
                              </button>
                            )}
                          </>
                        )}

                        {/* Delete */}
                        {!user.isDeleted && String(user._id) !== String(currentUser._id) && (
                          <button
                            onClick={() => handleDeleteUser(user._id, getUserName(user))}
                            className="p-1 text-red-600 hover:text-red-800 transition"
                            title="Delete User"
                          >
                            <IconDelete className="w-6 h-6" />
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => {/* TODO: Implement edit user modal */}}
                          className="p-1 text-gray-600 hover:text-gray-800 transition"
                          title="Edit User"
                        >
                          <IconEdit className="w-6 h-6" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{indexOfFirstUser + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span> of{' '}
                    <span className="font-medium">{filteredUsers.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {[...Array(totalPages)].map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPage(index + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === index + 1
                            ? 'z-10 bg-primary border-primary text-white'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-textBlack mb-2">No users found</h3>
            <p className="text-textGray mb-4">
              {searchTerm || filterRole !== "All" || filterStatus !== "All"
                ? "Try adjusting your filters"
                : "Start by inviting your first user"}
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
            >
              Invite User
            </button>
          </div>
        )}
      </div>

      {/* TODO: Add Invite User Modal Component */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={fetchUsers}
      />
    </div>
  );
}
