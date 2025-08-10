// src/components/AssignUser.jsx
import { Button, Modal } from "antd";
import React, { useState, useEffect } from "react";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import Avatar from "../shared/Avatar";

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

  const handleAssign = async (user) => {
    console.log("🔍 [AssignUser] assigning these user details:", user);
    const userId = user._id ?? user.id;
    console.log("🕵️ Assigning to client:", {
      url: assignUrl,
      payload: { userId, multiAssign }
    });
    try {
     const res = await axiosSecure.patch(assignUrl, { userId, multiAssign });
      if (!res.data.success) {
        return Swal.fire("Error", res.data.message, "error");
      }
      flashLoading();
      const updated = multiAssign
        ? [...linkedUsers, user._id]
        : [user._id];
      updateClientUsers(clientId, updated);
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
        width={300}
        maskClosable={false}
        forceRender
      >
        <input
          type="text"
          placeholder="Search users..."
          className="w-full p-2 mb-4 border rounded-md"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <div className="max-h-[400px] overflow-y-auto">
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
                className="flex justify-between items-center mb-2"
              >
                <button
                  onClick={() => handleAssign(user)}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-1 border rounded-md w-full text-left"
                >
                  <Avatar name={displayName} avatarUrl={user.avatar} size="sm" />
                  <span className="truncate">{displayName}</span>
                </button>
                {isLinked && (
                  <Button
                    danger
                    size="small"
                    onClick={() => handleUnassign(user._id)}
                  >
                    Unassign
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
};

export default AssignUser;
