// src/pages/JobBoard.jsx
import React, { useState, useContext, useEffect, useMemo, useCallback } from "react";
import { Navigate } from "react-router-dom";
import JobTable from "@/appjobboard/components/JobTable";
import AdminAnalyticsPanel from "@/appjobboard/components/AdminAnalyticsPanel";
import EstimatorAnalyticsPanel from "@/appjobboard/components/EstimatorAnalyticsPanel";
import { getExchangeRate } from "@/shared/jobPricingUtils";
import { AuthContext } from "@/auth/AuthProvider";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import AssignClient from "@/components/AssignClient";
import AssignEstimator from "@/components/AssignEstimator";
import { EstimateCompleteModal, SendMessageModal } from "@/features/emails";
import JobDelayedModal from "@/features/emails/modals/jobboard/JobDelayedModal";
import { basePlanTypes } from "@/shared/planTypes";
import { useAutoSave } from "@/appjobboard/hooks/useAutoSave";
import { useTablePreferences } from "@/appjobboard/hooks/useTablePreferences";
import { normalizeProjectName } from "@/utils/projectNameNormalizer";
import { notifyProjectDataUpdate } from "@/utils/ProjectDataSync";

const JobBoard = () => {
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();

  // 2️⃣ State for clients and estimators
  const [clients, setClients] = useState([]);
  const [estimators, setEstimators] = useState([]);

  // 3️⃣ State for jobs 
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [filteredJobs, setFilteredJobs] = useState([]); // Track filtered jobs for admin analytics

  // Callback to receive filtered rows from JobTable
  const handleFilteredRowsChange = useCallback((filteredData) => {
    setFilteredJobs(filteredData);
  }, []);

  // 3a️⃣ Bring in your pricing config for the table
  const [dataConfig] = useState({
    planTypes: basePlanTypes,
  });

  // 4️⃣ Modal & live‐update state
  const [openColumn, setOpenColumn] = useState(null);
  const [isClientModalVisible, setClientModalVisible] = useState(false);
  const [isEstimatorModalVisible, setEstimatorModalVisible] = useState(false);
  const [isEstimateModalVisible, setEstimateModalVisible] = useState(false);
  const [isSendMessageModalVisible, setSendMessageModalVisible] = useState(false);
  const [isJobDelayedModalVisible, setJobDelayedModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // 5️⃣ Exchange rates (live from API)
  const [exchangeRates, setExchangeRates] = useState({ NOK: 6.5, USD: 0.65, EUR: 0.60 });
  const handleFetchRate = async () => {
    const rates = await getExchangeRate();
    setExchangeRates(rates);
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
      console.log(`🚀 JobBoard auto-save triggered for project ${projectId}`);
      console.log(`👤 Current user role: ${user?.role}`);
      console.log(`📋 Changes object:`, changes);
      console.log(`� Changes.jobBoardStatus:`, changes.jobBoardStatus);
      console.log(`📋 Type of changes.jobBoardStatus:`, typeof changes.jobBoardStatus);
      console.log(`📋 Has jobBoardStatus property:`, changes.hasOwnProperty('jobBoardStatus'));
      console.log(`📋 All change keys:`, Object.keys(changes));
      
      // Normalize project name before saving if it exists in changes
      if (changes.name && typeof changes.name === 'string') {
        changes.name = normalizeProjectName(changes.name);
      }
      
      // Handle JobBoard status updates separately (Feature #31 - Dual Status System)
      if (changes.jobBoardStatus) {
        console.log(`📊 ✅ ENTERING JobBoard status branch: "${changes.jobBoardStatus}"`);
        
        // 🔄 Special Status Mapping: JobBoard → ProjectTable
        // - JobBoard "Sent" → ProjectTable "Estimate Completed" 
        // - JobBoard "Estimate Completed" → ProjectTable "Estimate Completed"
        // - JobBoard "Awaiting Review" (Estimator auto-change) → ProjectTable "Estimate Completed"
        // - All other statuses remain the same
        const jobBoardStatus = changes.jobBoardStatus;
        let projectTableStatus = jobBoardStatus;
        
        if (jobBoardStatus === 'Sent') {
          projectTableStatus = 'Estimate Completed';
          console.log('🔄 Status mapping: JobBoard "Sent" → ProjectTable "Estimate Completed"');
        } else if (jobBoardStatus === 'Awaiting Review') {
          projectTableStatus = 'Estimate Completed';
          console.log('🔄 Status mapping: JobBoard "Awaiting Review" → ProjectTable "Estimate Completed"');
        } else if (jobBoardStatus === 'Estimate Completed') {
          projectTableStatus = 'Estimate Completed';
          console.log('🔄 Status mapping: JobBoard "Estimate Completed" → ProjectTable "Estimate Completed"');
        }
        
        console.log(`📡 🎯 SENDING TO SPECIAL ENDPOINT: /projects/update-jobboard-status/${projectId}`);
        console.log(`📡 Request payload:`, {
          jobBoardStatus: jobBoardStatus,
          status: projectTableStatus
        });
        
        // Update both jobBoardStatus and regular status with mapping
        const response = await axiosSecure.patch(`/projects/update-jobboard-status/${projectId}`, {
          jobBoardStatus: jobBoardStatus,
          status: projectTableStatus  // Also update regular status with mapped value
        });
        
        console.log(`✅ API response:`, response.data);
        
        // Remove jobBoardStatus from regular changes to avoid duplicate updates
        const { jobBoardStatus: removedJobBoardStatus, ...otherChanges } = changes;
        
        // If there are other changes, save them with the regular endpoint
        if (Object.keys(otherChanges).length > 0) {
          console.log(`📡 Sending additional updates for other fields:`, otherChanges);
          await axiosSecure.patch(`/projects/update/${projectId}`, otherChanges);
        }
      } else {
        console.log(`� ❌ ENTERING regular update branch (no jobBoardStatus):`, changes);
        console.log(`📡 🎯 SENDING TO REGULAR ENDPOINT: /projects/update/${projectId}`);
        // Regular update for non-JobBoard status fields
        await axiosSecure.patch(`/projects/update/${projectId}`, changes);
      }
      
      console.log(`✅ JobBoard auto-save completed successfully for project ${projectId}`);
      return true;
    } catch (error) {
      console.error(`❌ JobBoard auto-save failed for project ${projectId}:`, error);
      console.error(`❌ Error details:`, error.response?.data || error.message);
      throw error;
    }
  }, (projectId, changes) => {
    // 🔄 After-save callback: Notify other components about the update
    console.log('🔄 JobBoard auto-save completed, notifying other components:', {
      projectId,
      changes,
      source: 'JobBoard'
    });
    notifyProjectDataUpdate(projectId, changes, 'JobBoard');
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

  // CTRL+S save functionality
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for Ctrl+S (or Cmd+S on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault(); // Prevent browser's default save dialog
        
        if (hasPendingChanges) {
          saveAllWithNormalization();
        }
      }
    };

    // Add event listener to the document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveAllWithNormalization, hasPendingChanges]);

  // Column preferences (sizing, sorting, filters) + zoom level
  const [prefs, { setColumnSizing, setSorting, setColumnFilters, setZoomLevel }, prefsLoaded] = useTablePreferences('jobBoard');
  const { columnSizing, sorting, columnFilters, zoomLevel } = prefs;

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

// Fetch exchange rates on mount
useEffect(() => {
  handleFetchRate();
}, []);

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
      
      // 🔍 DEBUG: Log status fields for first 3 projects
      if (payload.length > 0) {
        console.log("🔍 JobBoard received projects - sample status fields:", payload.slice(0, 3).map(p => ({
          projectNumber: p.projectNumber,
          estimateStatus: p.estimateStatus,
          jobBoardStatus: p.jobBoardStatus,
          status: p.status,
          linkedEstimators: p.linkedEstimators
        })));
      }
      
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
          const statusUpdate = hasEstimators ? { 
            estimateStatus: 'Assigned',
            jobBoardStatus: 'Assigned', // Legacy field
            status: 'Assigned' // Legacy field
          } : {};
          
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

  const openSendMessageModal = job => {
    console.log('[JobBoard] Opening SendMessageModal for project:', job);
    setSelectedJob(job);
    setSendMessageModalVisible(true);
  };
  const closeSendMessageModal = () => {
    setSelectedJob(null);
    setSendMessageModalVisible(false);
  };

  const openJobDelayedModal = job => {
    console.log('[JobBoard] Opening JobDelayedModal for project:', job);
    setSelectedJob(job);
    setJobDelayedModalVisible(true);
  };
  
  const closeJobDelayedModal = () => {
    setSelectedJob(null);
    setJobDelayedModalVisible(false);
  };

  const handleSelectMessageType = (messageType, project) => {
    console.log('[JobBoard] Selected message type:', messageType, 'for project:', project || selectedJob);
    
    // Close the send message modal first
    closeSendMessageModal();
    
    // Handle different message types
    if (messageType.id === 'estimate-complete' || messageType.id === 'job-complete') {
      // Open the EstimateCompleteModal for both estimate complete and job complete messages
      console.log('[JobBoard] Opening EstimateCompleteModal');
      setSelectedJob(project || selectedJob);
      setEstimateModalVisible(true);
    } else if (messageType.id === 'job-delayed') {
      // Open the JobDelayedModal for delay notifications
      console.log('[JobBoard] Opening JobDelayedModal');
      setSelectedJob(project || selectedJob);
      setJobDelayedModalVisible(true);
    } else {
      // For other message types, we can add handlers here later
      console.log('[JobBoard] Message type not yet implemented:', messageType.id);
    }
  };

  // ──────────────────────────────────────────────────────────
  if (loadingJobs) return <p className="p-4">Loading jobs...</p>;

  // Guard: don't render until preferences are loaded
  if (!prefsLoaded) {
    return <div className="p-4">Loading table preferences...</div>;
  }

  return (
    <div className="flex flex-col pb-8">
      {/* Jobs table - Now self-contained with all features */}
      <div className="mt-8" style={{ height: 'calc((100vh - 160px) / var(--app-zoom))' }}>
        <JobTable
          jobs={jobs} // Pass raw jobs - table handles all filtering internally
          config={dataConfig}
          exchangeRate={exchangeRates.NOK}
          clients={clients}
          estimators={estimators}
          openColumn={openColumn}
          setOpenColumn={setOpenColumn}
          openAssignClient={openAssignClientModal}
          openAssignEstimator={openAssignEstimatorModal}
          openEstimateModal={openEstimateModal}
          openSendModal={openSendMessageModal}
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
          // Zoom control with persistence
          zoomLevel={zoomLevel || 100}
          onZoomChange={setZoomLevel}
          // Admin analytics
          onFilteredRowsChange={handleFilteredRowsChange}
        />
      </div>

      {/* Admin Analytics Panel - Only visible to Admin users */}
      {user?.role === 'Admin' && (
        <AdminAnalyticsPanel 
          filteredJobs={filteredJobs}
          exchangeRates={exchangeRates}
        />
      )}

      {/* Estimator Analytics Panel - Only visible to Estimator users */}
      {user?.role === 'Estimator' && (
        <EstimatorAnalyticsPanel 
          filteredJobs={filteredJobs}
        />
      )}

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

      {/* Send Message modal */}
      {isSendMessageModalVisible && selectedJob && (
        <SendMessageModal
          isOpen={isSendMessageModalVisible}
          onClose={closeSendMessageModal}
          project={selectedJob}
          onSelectMessageType={handleSelectMessageType}
        />
      )}

      {/* Job Delayed modal */}
      {isJobDelayedModalVisible && selectedJob && (
        <JobDelayedModal
          isVisible={isJobDelayedModalVisible}
          onClose={closeJobDelayedModal}
          project={selectedJob}
        />
      )}
    </div>
  );
};

export default JobBoard;
