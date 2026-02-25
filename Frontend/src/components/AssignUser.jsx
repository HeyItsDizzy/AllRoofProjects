// src/components/AssignUser.jsx
import { Button, Modal, Dropdown } from "antd";
import React, { useState, useEffect } from "react";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import Avatar from "@/shared/Avatar";

const AssignUser = ({
  users = [],
  clientId,
  client = {},
  closeModal,
  updateClientUsers
}) => {
  const [loading, setLoading]           = useState(false);
  const [filteredUsers, setFiltered]    = useState([]);
  const [searchTerm, setSearchTerm]     = useState("");
  const [multiAssign, setMultiAssign]   = useState(false);
  const [linkedUsers, setLinkedUsers]   = useState(client.linkedUsers || []);
  const axiosSecure                     = useAxiosSecure();

  const assignUrl   = `/clients/assignUser/${clientId.trim()}`;
  const unassignUrl = `/clients/unassignUser/${clientId.trim()}`;

  // Debounce search + sort
  useEffect(() => {
    const sorted = [...users].sort((a, b) => {
      const nameA = a.name || (a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : '') || a.firstName || a.lastName || "";
      const nameB = b.name || (b.firstName && b.lastName ? `${b.firstName} ${b.lastName}` : '') || b.firstName || b.lastName || "";
      return nameA.localeCompare(nameB);
    });
    setFiltered(
      searchTerm
        ? sorted.filter(u => {
            const searchText = (u.name || u.firstName || u.lastName || u.email || "").toLowerCase();
            return searchText.includes(searchTerm.toLowerCase());
          })
        : sorted
    );
  }, [users, searchTerm]);

  // Shift-key toggles multi-assign mode
  useEffect(() => {
    const down = e => e.key === "Shift" && setMultiAssign(true);
    const up   = e => e.key === "Shift" && setMultiAssign(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const flashLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 400);
  };

    const handleAssign = async (user, isAdmin = false) => {
    try {
      setLoading(true);
      const res = await axiosSecure.patch(assignUrl, { 
        userId: user._id,
        isCompanyAdmin: isAdmin
      });
      if (!res.data.success) {
        return Swal.fire("Error", res.data.message, "error");
      }
      flashLoading();
      updateClientUsers(clientId, [...linkedUsers, user._id]);
      closeModal();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to assign user.", "error");
    }
  };

  const handleUnassign = async userId => {
    try {
      const res = await axiosSecure.patch(unassignUrl, { userId });
      if (!res.data.success) {
        return Swal.fire("Error", res.data.message, "error");
      }
      flashLoading();
      updateClientUsers(
        clientId,
        linkedUsers.filter(id => id !== userId)
      );
      closeModal();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to unassign user.", "error");
    }
  };

  return (
    <>
      {/* Trigger button */}
      {linkedUsers.length > 0 ? (
        <button
          className="flex gap-2 items-center hover:bg-gray-100 px-2 py-1 rounded-md"
          onClick={() => {} /* parent opens modal */}
        >
          {linkedUsers.map(uid => {
            const u = users.find(x => x._id === uid) || {};
            const label = u.name || 
                         (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : '') ||
                         u.firstName || 
                         u.lastName || 
                         u.email || 
                         u._id || 
                         "";
            return (
              <div key={uid} className="flex items-center gap-2">
                <Avatar name={label} avatarUrl={u.avatar} size="md" />
                <span className="truncate max-w-[140px] text-sm">{label}</span>
              </div>
            );
          })}
        </button>
      ) : (
        <Button
          onClick={() => {} /* parent opens modal */}
          type="primary"
        >
          Assign User
        </Button>
      )}

      {/* Modal */}
      <Modal
        open={true}
        footer={null}
        onCancel={closeModal}
        width={600}
        maskClosable={false}
        forceRender
        title={
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Manage Company Users</h2>
              <p className="text-sm text-gray-500">{client.name || 'Company'}</p>
            </div>
          </div>
        }
      >
        <div className="pt-4">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto">
            <div className="space-y-3">
              {filteredUsers.map(user => {
                // Construct name from firstName + lastName, fallback to other fields
                const displayName = user.name || 
                                   (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '') ||
                                   user.firstName || 
                                   user.lastName || 
                                   user.email || 
                                   user._id || 
                                   "";
                const isLinked = linkedUsers.includes(user._id);
                return (
                  <div
                    key={user._id}
                    className={`flex justify-between items-center p-4 border rounded-lg transition-all hover:shadow-md ${
                      isLinked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <button
                      onClick={() => handleAssign(user)}
                      disabled={loading}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <Avatar name={displayName} avatarUrl={user.avatar} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{displayName}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        <p className="text-xs text-gray-400">{user.role || 'User'}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 ml-4">
                      {isLinked && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Linked
                        </span>
                      )}
                      {isLinked ? (
                        <Button
                          danger
                          size="small"
                          onClick={() => handleUnassign(user._id)}
                          className="shadow-sm"
                        >
                          Unassign
                        </Button>
                      ) : (
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: 'user',
                                label: (
                                  <div className="flex items-center gap-3 px-3 py-2">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="font-medium">User</span>
                                  </div>
                                ),
                                onClick: () => handleAssign(user, false)
                              },
                              {
                                key: 'admin',
                                label: (
                                  <div className="flex items-center gap-3 px-3 py-2">
                                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <span className="font-medium">Admin</span>
                                  </div>
                                ),
                                onClick: () => handleAssign(user, true)
                              }
                            ]
                          }}
                          trigger={['click']}
                          placement="bottomRight"
                        >
                          <button
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-w-[100px]"
                          >
                            Assign as
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </Dropdown>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm">No users found</p>
                  <p className="text-xs text-gray-400">Try adjusting your search criteria</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AssignUser;
