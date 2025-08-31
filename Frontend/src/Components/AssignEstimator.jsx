//AssignEstimator.jsx
import { Button, Modal, Grid } from "antd";
import React, { useState, useEffect } from "react";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import Avatar from "@/shared/Avatar";
const { useBreakpoint } = Grid;

const AssignEstimator = ({ estimators = [], projectId, project, closeModal, updateProjectEstimators }) => {
  const screens = useBreakpoint();
  // if screen is xs (i.e. mobile), use 80%, otherwise fixed 600px
  const modalWidth = screens.xs ? "80%" : 500;

  const [loading, setLoading] = useState(false);
  const axiosSecure = useAxiosSecure();
  const url = `/projects/assignEstimator/${projectId.trim()}`;
  const unassignUrl = `/projects/unassignEstimator/${projectId.trim()}`;
  const [filteredEstimators, setFilteredEstimators] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [multiAssignMode, setMultiAssignMode] = useState(false);
  const [linkedEstimators, setLinkedEstimators] = useState(project?.linkedEstimators || []);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const showLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 400);
  };

  const handleAssignEstimator = async (estimator) => {
    const estimatorId = estimator._id;
    try {
      const res = await axiosSecure.patch(url, { estimatorId, multiAssign: multiAssignMode });
      if (res.data.success) {
        showLoading();
        const updatedLinkedEstimators = multiAssignMode ? [...linkedEstimators, estimatorId] : [estimatorId];
        updateProjectEstimators(projectId, updatedLinkedEstimators);
        
        // 🎯 Auto-set status to "Assigned" when estimator is assigned via modal
        // We need to also update the project status in the parent component
        // This will be handled by the parent's updateProjectEstimators callback
        
        closeModal();
        
        // Show success message with status update info
        Swal.fire({
          title: 'Estimator Assigned!',
          text: `${estimator.firstName} ${estimator.lastName} has been assigned and status updated to "Assigned".`,
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });
      } else {
        Swal.fire("Error", res.data.message, "error");
      }
    } catch (err) {
      console.error("Error assigning estimator:", err);
      Swal.fire("Error", "Failed to assign estimator. Please try again.", "error");
    }
  };

  useEffect(() => {
    const sortedEstimators = [...estimators].sort((a, b) =>
      (a.firstName || "").localeCompare(b.firstName || "") || 
      (a.lastName || "").localeCompare(b.lastName || "")
    );
    setFilteredEstimators(
      searchTerm
        ? sortedEstimators.filter((estimator) =>
            `${estimator.firstName} ${estimator.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            estimator.email.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : sortedEstimators
    );
  }, [estimators, searchTerm]);

  const handleUnassignEstimator = async (estimatorId) => {
    try {
      const res = await axiosSecure.patch(unassignUrl, { estimatorId });
      if (res.data.success) {
        showLoading();
        updateProjectEstimators(
          projectId,
          linkedEstimators.filter((id) => id !== estimatorId)
        );
        closeModal();
      } else {
        Swal.fire("Error", res.data.message, "error");
      }
    } catch (err) {
      console.error("Error unassigning estimator:", err);
      Swal.fire("Error", "Failed to unassign estimator. Please try again.", "error");
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
      {linkedEstimators.length > 0 ? (
        <button
          className="flex gap-2 items-center cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-md transition"
          onClick={() => closeModal()}
        >
          {Array.isArray(linkedEstimators) && linkedEstimators.length > 0 ? (
            linkedEstimators.map((estimatorId) => {
              const estimator = estimators.find((e) => e._id === estimatorId) || {};
              return (
                <div key={estimatorId} className="flex items-center gap-2">
                  <Avatar
                    name={`${estimator.firstName || ''} ${estimator.lastName || ''}`}
                    avatarUrl={estimator.avatar}
                    size="md"
                  />
                  <span className="truncate max-w-[140px] text-sm">
                    {`${estimator.firstName || ''} ${estimator.lastName || ''}`.trim() || estimator.email}
                  </span>
                </div>
              );
            })
          ) : (
            <span>No estimator assigned</span>
          )}
        </button>
      ) : (
        <button
          onClick={() => closeModal()}
          className="bg-blue-500 text-white rounded-md shadow-md px-4 py-2 hover:bg-blue-600"
        >
          Assign Estimator
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
            type="text"
            placeholder="Search estimators..."
            className="w-full p-2 mb-4 border rounded-md"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <div className="max-h-[600px] overflow-y-auto">
            {filteredEstimators.map((estimator) => (
              <div key={estimator._id} className="mt-1 flex justify-between items-center">
                <button
                  onClick={() => handleAssignEstimator(estimator)}
                  className="flex gap-2 items-center bg-white border-secondary text-textBlack rounded-md shadow-none px-4 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={`${estimator.firstName || ''} ${estimator.lastName || ''}`}
                      avatarUrl={estimator.avatar}
                      size="md"
                    />
                    <div className="text-left">
                      <span className="block truncate max-w-[140px] text-sm font-medium">
                        {`${estimator.firstName || ''} ${estimator.lastName || ''}`.trim() || 'Unknown'}
                      </span>
                      <span className="block truncate max-w-[140px] text-xs text-gray-500">
                        {estimator.email}
                      </span>
                    </div>
                  </div>
                </button>
                {linkedEstimators.includes(estimator._id) && (
                  <button
                    onClick={() => handleUnassignEstimator(estimator._id)}
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

export default AssignEstimator;
