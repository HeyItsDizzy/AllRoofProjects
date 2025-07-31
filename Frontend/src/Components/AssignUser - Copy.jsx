// AssignUser.jsx
import { Button, Modal } from "antd";
import React, { useState, useEffect } from "react";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";
import Avatar from "../shared/Avatar";

const AssignUser = ({ users = [], projectId, project, closeModal, updateProjectUsers }) => {
  console.log("🔍 AssignUser - users received:", users);
  console.log("🔍 AssignUser - projectId received:", projectId);
  console.log("🔍 AssignUser - project received:", project);
  const [loading, setLoading] = useState(false);
  const axiosSecure = useAxiosSecure();
  const url = `/projects/assignUser/${projectId.trim()}`;
  const unassignUrl = `/projects/unassignUser/${projectId.trim()}`; // ✅ Correct unassign endpoint
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [multiAssignMode, setMultiAssignMode] = useState(false);
  const [linkedUsers, setLinkedUsers] = useState(project?.linkedUsers || []);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const showLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 400);
  };

  const handleAssignUser = async (user) => {
    const userId = user._id;
  
    try {
      const res = await axiosSecure.patch(url, { userId, multiAssign: multiAssignMode });
      
      if (res.data.success) {
        showLoading();
  
        /*// ✅ Modify Swal.fire to prevent aria-hidden issues
        Swal.fire({
          title: `Assigned project to ${user.name}`,
          icon: "success",
          allowOutsideClick: false, // Prevents closing on click outside
          allowEscapeKey: false, // Prevents closing with Escape key
          backdrop: false, // Disables background overlay
          didOpen: () => {
            document.getElementById("root")?.removeAttribute("aria-hidden"); // Ensures root is visible
          },
        });*/

        // Update the project users in the parent component
        const updatedLinkedUsers = multiAssignMode ? [...linkedUsers, userId] : [userId];
        updateProjectUsers(projectId, updatedLinkedUsers);
  
        closeModal(); // Close modal
      } else {
        Swal.fire("Error", res.data.message, "error");
      }
    } catch (err) {
      console.error("Error assigning user:", err);
      Swal.fire("Error", "Failed to assign user. Please try again.", "error");
    }
  };

  useEffect(() => {
    const sortedUsers = [...users].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );    
    setFilteredUsers(
      searchTerm ? sortedUsers.filter((user) => user.name.toLowerCase().includes(searchTerm.toLowerCase())) : sortedUsers
    );
  }, [users, searchTerm]);

  const handleUnassignUser = async (userId) => {
    try {
      const res = await axiosSecure.patch(unassignUrl, { userId });
  
      if (res.data.success) {
        showLoading();
        
        /*// ✅ Modify Swal.fire to prevent aria-hidden issues
        Swal.fire({
          title: `User Unassigned Successfully`,
          icon: "success",
          allowOutsideClick: false,
          allowEscapeKey: false,
          backdrop: false,
          didOpen: () => {
            document.getElementById("root")?.removeAttribute("aria-hidden");
          },
        });*/

        // Update the project users in the parent component
        updateProjectUsers(projectId, linkedUsers.filter(id => id !== userId));
  
        closeModal(); // Close modal after unassigning
      } else {
        Swal.fire("Error", res.data.message, "error");
      }
    } catch (err) {
      console.error("Error unassigning user:", err);
      Swal.fire("Error", "Failed to unassign user. Please try again.", "error");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Shift") {
        setMultiAssignMode(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "Shift") {
        setMultiAssignMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  
  return (
    <>
      {/* Display Assigned User or Assign Button */}
      {linkedUsers.length > 0 ? (
        <button 
          className="flex gap-2 items-center cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-md transition" 
          onClick={() => setOpen(true)}
        >
          {Array.isArray(linkedUsers) && linkedUsers.length > 0 ? (
            linkedUsers.map((userId) => {
              const user = users.find(u => u._id === userId) || {}; // ✅ Find user by ID
              return (
                <div key={userId} className="flex items-center gap-2">
                  <div className="flex items-center gap-3">
  <Avatar
    name={user.company || user.name}
    avatarUrl={user.avatar}
    size="md"
  />
  <span className="truncate max-w-[140px] text-sm">
    {user.company || user.name}
  </span>
</div>

                </div>
              );
            })
          ) : (
            <span>No user assigned</span>
          )}
        </button>
      ) : (
        <button 
          onClick={() => setOpen(true)} 
          className="bg-green-500 text-white rounded-md shadow-md px-4 py-2 hover:bg-green-600"
        >
          Assign
        </button>
      )}

      {/* Modal for Assigning Users */}
      <Modal
        footer=""
        open={true}
        onCancel={closeModal}
        width={300}
        maskClosable={false} // Prevents accidental closing
        getContainer={false} // Ensures it doesn't modify #root
        forceRender // Ensures modal content is always available
      >
        <div className="my-4">
          <input 
            type="text" 
            placeholder="Search users..." 
            className="w-full p-2 mb-4 border rounded-md" 
            value={searchTerm} 
            onChange={handleSearchChange} 
          />
          <div className="max-h-[600px] overflow-y-auto">
            {filteredUsers.map((user) => (
              <div key={user._id} className="mt-1 flex justify-between items-center">
                <button
                  onClick={() => handleAssignUser(user)}  
                  className="flex gap-2 items-center bg-white border-secondary text-textBlack rounded-md shadow-none px-4 py-2"
                >
                  {/* ✅ Added Avatar */}
                  <div className="flex items-center gap-3">
  <Avatar
    name={user.company || user.name}
    avatarUrl={user.avatar}
    size="md"
  />
  <span className="truncate max-w-[140px] text-sm">
    {user.company || user.name}
  </span>
</div>

                </button>

                {/* Show Unassign button only for assigned users */}
                {linkedUsers.includes(user._id) && (
                  <button
                    onClick={() => handleUnassignUser(user._id)}
                    className="bg-red-500 text-white rounded-md shadow-none px-4 py-2 hover:bg-red-700"
                  >
                    Unassign
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AssignUser;
