// src/pages/JobBoard.jsx
import React, { useState, useContext, useEffect, useMemo, useCallback } from "react";
import { Navigate } from "react-router-dom";
import JobTable from "@/appjobboard/components/JobTable";
import { getExchangeRate } from "@/shared/jobPricingUtils";
import { AuthContext } from "@/auth/AuthProvider";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import AssignClient from "@/components/AssignClient";
import AssignEstimator from "@/components/AssignEstimator";
import EstimateCompleteModal from "@/modals/emails/jobboard/EstimateCompleteModal";
import { basePlanTypes } from "@/shared/planTypes";
import { useAutoSave } from "@/appjobboard/hooks/useAutoSave";
import { useTablePreferences } from "@/appjobboard/hooks/useTablePreferences";
import { normalizeProjectName } from "@/utils/projectNameNormalizer";

const JobBoard = () => {
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();

  // 2️⃣ State for clients and estimators
  const [clients, setClients] = useState([]);
  const [estimators, setEstimators] = useState([]);

  // 3️⃣ State for jobs 
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // 3a️⃣ Bring in your pricing config for the table
  const [dataConfig] = useState({
    planTypes: basePlanTypes,
  });

  // 4️⃣ Modal & live‐update state
  const [openColumn, setOpenColumn] = useState(null);
  const [isClientModalVisible, setClientModalVisible] = useState(false);
  const [isEstimatorModalVisible, setEstimatorModalVisible] = useState(false);
  const [isEstimateModalVisible, setEstimateModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // 5️⃣ Exchange rate
  const [exchangeRate, setExchangeRate] = useState(7);
  const handleFetchRate = async () => {
    const rate = await getExchangeRate();
    setExchangeRate(rate);
  };

  // 🔄 PHASE 3: ADVANCED FEATURES STATE MANAGEMENT
  
  // Auto-save functionality with project name normalization
  const {
    queueChange,
    saveProject,
    saveAll,
    hasPendingChanges,
    isAutoSaving,
    pendingProjectsCount,
    pendingProjects
  } = useAutoSave(async (projectId, changes) => {
    try {
      // Normalize project name before saving if it exists in changes
      if (changes.name && typeof changes.name === 'string') {
        changes.name = normalizeProjectName(changes.name);
      }
      
      await axiosSecure.patch(`/projects/update/${projectId}`, changes);
      return true;
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  });

  // Update row function for immediate UI updates (no normalization here - keep raw input for editing)
  const updateRow = useCallback((projectId, field, value) => {
    // Update jobs state immediately for responsive UI
    setJobs(prev => prev.map(row => 
      row._id === projectId ? { ...row, [field]: value } : row
    ));
    
    // Queue the change for auto-save (normalization happens during save)
    queueChange(projectId, field, value);
  }, [queueChange]);

  // Custom save all function that updates UI with normalized values
  const saveAllWithNormalization = useCallback(async () => {
    try {
      // Save all pending changes (normalization happens in auto-save function)
      await saveAll();
      
      // Update the UI with normalized project names for any projects that had name changes
      setJobs(prev => prev.map(job => {
        // Check if this job has pending name changes by looking at pendingProjects
        if (pendingProjects.includes(job._id)) {
          // Find the current name from the jobs state and normalize it
          const currentName = job.name;
          if (currentName && typeof currentName === 'string') {
            return {
              ...job,
              name: normalizeProjectName(currentName)
            };
          }
        }
        return job;
      }));
    } catch (error) {
      console.error('Failed to save all changes:', error);
    }
  }, [saveAll, pendingProjects, normalizeProjectName]);

  // Column preferences (sizing, sorting, filters)
  const [prefs, { setColumnSizing, setSorting, setColumnFilters }, prefsLoaded] = useTablePreferences('jobBoard');
  const { columnSizing, sorting, columnFilters } = prefs;

  // 1️⃣ Role guard
  if (!["Admin", "Estimator"].includes(user?.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  // ──────────────────────────────────────────────────────────
  // Fetch clients and estimators
  useEffect(() => {
    axiosSecure
      .get("/clients")
      .then(res => setClients(res.data || []))
      .catch(err => console.error("Failed to fetch clients:", err));
      
    // Fetch users with Estimator or Admin role for assignment options
    axiosSecure
      .get("/users/get-users")
      .then(res => {
        const estimatorUsers = (res.data.data || []).filter(user => 
          user.role === "Estimator" || user.role === "Admin" || user.role === "admin"
        );
        setEstimators(estimatorUsers);
      })
      .catch(err => console.error("Failed to fetch estimators:", err));
  }, [axiosSecure]);

// Fetch jobs and derive months (same as AllProjects)
useEffect(() => {
  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      // use the same relative route as your Admin table
      const response = await axiosSecure.get("/projects/get-projects");
      console.log("Full Job Data Response:", response.data);  // ✅ debug

      // API returns { data: [...] }
      let payload = response.data.data || [];
      
      console.log("📊 JobBoard Data Summary:");
      console.log("- Total projects fetched:", payload.length);
      console.log("- User role:", user?.role);
      console.log("- User first name:", user?.firstName);
      console.log("- User ID:", user?._id);
      
      // Apply role-based filtering at the data source level
      if (user?.role === 'Estimator' && user?._id) {
        const originalCount = payload.length;
        payload = payload.filter(project => {
          const linkedEstimators = project.linkedEstimators || [];
          const isAssignedToUser = linkedEstimators.includes(user._id);
          const isUnassigned = !linkedEstimators.length; // Show unassigned projects too
          
          return isUnassigned || isAssignedToUser;
        });
        
        console.log("🔍 Estimator Filtering Applied:");
        console.log("- Original projects:", originalCount);
        console.log("- Filtered projects:", payload.length);
        console.log("- Estimator ID:", user._id);
        console.log("- Estimator Name:", user?.firstName);
      }
      
      // Set filtered jobs
      setJobs(payload);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  fetchJobs();
}, [axiosSecure, user]);



  // Live‐update callback for AssignClient
  const updateJobClients = (jobId, linkedClients) => {
    setJobs(prev =>
      prev.map(j => (j._id === jobId ? { ...j, linkedClients } : j))
    );
  };

  // Live‐update callback for AssignEstimator
  const updateJobEstimators = (jobId, linkedEstimators) => {
    setJobs(prev =>
      prev.map(j => {
        if (j._id === jobId) {
          // 🎯 Auto-set status to "Assigned" when estimator is assigned
          const hasEstimators = linkedEstimators && linkedEstimators.length > 0;
          const statusUpdate = hasEstimators ? { status: 'Assigned' } : {};
          
          return { 
            ...j, 
            linkedEstimators,
            ...statusUpdate
          };
        }
        return j;
      })
    );
  };

  const openAssignClientModal = job => {
    setSelectedJob(job);
    setClientModalVisible(true);
  };
  const closeAssignClientModal = () => {
    setSelectedJob(null);
    setClientModalVisible(false);
  };

  const openAssignEstimatorModal = job => {
    setSelectedJob(job);
    setEstimatorModalVisible(true);
  };
  const closeAssignEstimatorModal = () => {
    setSelectedJob(null);
    setEstimatorModalVisible(false);
  };

  const openEstimateModal = job => {
    setSelectedJob(job);
    setEstimateModalVisible(true);
  };
  const closeEstimateModal = () => {
    setSelectedJob(null);
    setEstimateModalVisible(false);
  };

  // ──────────────────────────────────────────────────────────
  if (loadingJobs) return <p className="p-4">Loading jobs...</p>;

  // Guard: don't render until preferences are loaded
  if (!prefsLoaded) {
    return <div className="p-4">Loading table preferences...</div>;
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Jobs table - Now self-contained with all features */}
      <div className="flex-1 min-h-0">
        <JobTable
          jobs={jobs} // Pass raw jobs - table handles all filtering internally
          config={dataConfig}
          exchangeRate={exchangeRate}
          clients={clients}
          estimators={estimators}
          openColumn={openColumn}
          setOpenColumn={setOpenColumn}
          openAssignClient={openAssignClientModal}
          openAssignEstimator={openAssignEstimatorModal}
          openEstimateModal={openEstimateModal}
          updateRow={updateRow}
          columnSizing={columnSizing}
          onColumnSizingChange={setColumnSizing}
          sorting={sorting}
          onSortingChange={setSorting}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          // Auto-save integration
          hasPendingChanges={hasPendingChanges}
          isAutoSaving={isAutoSaving}
          pendingProjectsCount={pendingProjectsCount}
          onSaveAll={saveAllWithNormalization}
          // Zoom control (you can add zoom state if needed)
          zoomLevel={100}
          onZoomChange={() => {}}
        />
      </div>

      {/* Assign‐Client modal */}
      {isClientModalVisible && selectedJob && (
        <AssignClient
          clients={clients}
          projectId={selectedJob._id}
          project={selectedJob}
          closeModal={closeAssignClientModal}
          updateProjectClients={updateJobClients}
        />
      )}

      {/* Assign‐Estimator modal */}
      {isEstimatorModalVisible && selectedJob && (
        <AssignEstimator
          estimators={estimators}
          projectId={selectedJob._id}
          project={selectedJob}
          closeModal={closeAssignEstimatorModal}
          updateProjectEstimators={updateJobEstimators}
        />
      )}

      {/* Send Estimate modal */}
      {isEstimateModalVisible && selectedJob && (
        <EstimateCompleteModal
          isVisible={isEstimateModalVisible}
          onClose={closeEstimateModal}
          project={selectedJob}
        />
      )}
    </div>
  );
};

export default JobBoard;
