//AssignClient.jsx
import { Button, Modal, Grid } from "antd";
import React, { useState, useEffect, useRef } from "react";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import Avatar from "@/shared/Avatar";
const { useBreakpoint } = Grid;

const AssignClient = ({ clients = [], projectId, project, closeModal, updateProjectClients }) => {
  /*console.log("🔍 AssignClient - clients received:", clients);
  console.log("🔍 AssignClient - projectId received:", projectId);
  console.log("🔍 AssignClient - project received:", project);*/
  
  // Early return if projectId is not provided
  if (!projectId) {
    console.error("AssignClient: projectId is required but not provided");
    return null;
  }
  
  const screens = useBreakpoint();
    // if screen is xs (i.e. mobile), use 80%, otherwise fixed 600px
  const modalWidth = screens.xs ? "80%" : 500;



  const [loading, setLoading] = useState(false);
  const axiosSecure = useAxiosSecure();
  const url = `/projects/assignClient/${projectId?.trim() || ''}`;
  const unassignUrl = `/projects/unassignClient/${projectId?.trim() || ''}`;
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [multiAssignMode, setMultiAssignMode] = useState(false);
  const [linkedClients, setLinkedClients] = useState(project?.linkedClients || []);
  const searchInputRef = useRef(null);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const showLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 400);
  };

  const handleAssignClient = async (client) => {
    const clientId = client._id;
    try {
      const res = await axiosSecure.patch(url, { clientId, multiAssign: multiAssignMode });
      if (res.data.success) {
        showLoading();
        const updatedLinkedClients = multiAssignMode ? [...linkedClients, clientId] : [clientId];
        updateProjectClients(projectId, updatedLinkedClients);
        closeModal();
      } else {
        Swal.fire("Error", res.data.message, "error");
      }
    } catch (err) {
      console.error("Error assigning client:", err);
      Swal.fire("Error", "Failed to assign client. Please try again.", "error");
    }
  };

  useEffect(() => {
    const sortedClients = [...clients].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
    setFilteredClients(
      searchTerm
        ? sortedClients.filter((client) => {
            const searchLower = searchTerm.toLowerCase();
            const name = (client.name || "").toLowerCase();
            const tags = (client.tags || []).map(tag => tag.toLowerCase());
            
            // Search in client name or any of their tags
            return name.includes(searchLower) || 
                   tags.some(tag => tag.includes(searchLower));
          })
        : sortedClients
    );
  }, [clients, searchTerm]);

  const handleUnassignClient = async (clientId) => {
    try {
      const res = await axiosSecure.patch(unassignUrl, { clientId });
      if (res.data.success) {
        showLoading();
        updateProjectClients(
          projectId,
          linkedClients.filter((id) => id !== clientId)
        );
        closeModal();
      } else {
        Swal.fire("Error", res.data.message, "error");
      }
    } catch (err) {
      console.error("Error unassigning client:", err);
      Swal.fire("Error", "Failed to unassign client. Please try again.", "error");
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

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (searchInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, []);


  //AssignClient.jsx - Return Block
  return (
    <>
      {linkedClients.length > 0 ? (
        <button
          className="flex gap-2 items-center cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-md transition"
          onClick={() => setOpen(true)}
        >
          {Array.isArray(linkedClients) && linkedClients.length > 0 ? (
            linkedClients.map((clientId) => {
              const client = clients.find((c) => c._id === clientId) || {};
              return (
                <div key={clientId} className="flex items-center gap-2">
                  <Avatar
                    name={client.company || client.name}
                    avatarUrl={client.avatar}
                    size="md"
                  />
                  <span className="truncate max-w-[140px] text-sm">
                    {client.company || client.name}
                  </span>
                </div>
              );
            })
          ) : (
            <span>No client assigned</span>
          )}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-green-500 text-white rounded-md shadow-md px-4 py-2 hover:bg-green-600"
        >
          Assign Client
        </button>
      )}

      <Modal
        footer=""
        open={true}
        onCancel={closeModal}
        width={modalWidth} 
        maskClosable={false}
        getContainer={false}
        forceRender
      >
        <div className="my-4">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search clients..."
            className="w-full p-2 mb-4 border rounded-md"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <div className="max-h-[600px] overflow-y-auto">
            {filteredClients.map((client) => (
              <div key={client._id} className="mt-1 flex justify-between items-center">
                <button
                  onClick={() => handleAssignClient(client)}
                  className="flex gap-2 items-center bg-white border-secondary text-textBlack rounded-md shadow-none px-4 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={client.company || client.name}
                      avatarUrl={client.avatar}
                      size="md"
                    />
                    <span className="truncate max-w-[140px] text-sm">
                      {client.company || client.name}
                    </span>
                  </div>
                </button>
                {linkedClients.includes(client._id) && (
                  <button
                    onClick={() => handleUnassignClient(client._id)}
                    className="bg-red-500 text-white rounded-md shadow-none px-4 py-2 mr-5 hover:bg-red-700"
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

export default AssignClient;
