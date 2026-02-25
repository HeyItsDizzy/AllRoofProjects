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

  // 3️⃣ State for jobs with server-side pagination
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filteredJobs, setFilteredJobs] = useState([]); // Track filtered jobs for admin analytics
  
  // Pagination state (server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const PROJECTS_PER_PAGE = 50; // Load 50 at a time
  
  // Index state - lightweight project numbers for accurate month counting
  const [projectIndex, setProjectIndex] = useState([]); // Array of { projectNumber, _id }
  const [indexLoaded, setIndexLoaded] = useState(false);

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
      console.log(`📋 Changes.estimateStatus:`, changes.estimateStatus);
      console.log(`📋 Type of changes.jobBoardStatus:`, typeof changes.jobBoardStatus);
      console.log(`📋 Type of changes.estimateStatus:`, typeof changes.estimateStatus);
      console.log(`📋 Has jobBoardStatus property:`, changes.hasOwnProperty('jobBoardStatus'));
      console.log(`📋 Has estimateStatus property:`, changes.hasOwnProperty('estimateStatus'));
      console.log(`📋 All change keys:`, Object.keys(changes));
      
      // Normalize project name before saving if it exists in changes
      if (changes.name && typeof changes.name === 'string') {
        changes.name = normalizeProjectName(changes.name);
      }
      
      // Handle JobBoard status updates separately (Feature #31 - Dual Status System)
      if (changes.jobBoardStatus || changes.estimateStatus) {
        const jobBoardStatus = changes.jobBoardStatus || changes.estimateStatus;
        console.log(`📊 ✅ ENTERING JobBoard status branch: "${jobBoardStatus}"`);
        
        // 🔄 Special Status Mapping: JobBoard → ProjectTable
        // - JobBoard "Sent" → ProjectTable "Estimate Completed" 
        // - JobBoard "Estimate Completed" → ProjectTable "Estimate Completed"
        // - JobBoard "Awaiting Review" (Estimator auto-change) → ProjectTable "Estimate Completed"
        // - All other statuses remain the same
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
        
        // 🎯 DRY SOLUTION: "Sent" status uses same /send-estimate endpoint as modal
        if (jobBoardStatus === 'Sent') {
          console.log(`📡 🎯 SENDING TO ESTIMATE ENDPOINT: /projects/send-estimate/${projectId}`);
          console.log(`📡 Using unified /send-estimate for pricing snapshot + locking`);
          
          // Call the unified /send-estimate endpoint (same as modal)
          // This ensures pricing snapshots are created and locked properly
          const response = await axiosSecure.post(`/projects/send-estimate/${projectId}`, {
            // Minimal required fields for estimate sending without actual email
            clientEmail: '', // Empty - we're just triggering the status update and snapshot
            clientName: 'Status Update',
            projectAddress: '', 
            estimateDescription: 'Status Updated to Sent',
            optionalBody: '',
            textColor: '#374151',
            attachments: [],
            skipEmailSending: true // Flag to skip actual email sending, just update status + snapshot
          });
          
          console.log(`✅ Estimate endpoint response:`, response.data);
        } else {
          console.log(`📡 🎯 SENDING TO REGULAR ENDPOINT: /projects/update/${projectId}`);
          
          // For all other status changes, use regular update
          const response = await axiosSecure.patch(`/projects/update/${projectId}`, {
            estimateStatus: jobBoardStatus,
            projectStatus: projectTableStatus,
            status: projectTableStatus  // Legacy field mapping
          });
          
          console.log(`✅ Regular update response:`, response.data);
        }
        
        // Remove jobBoardStatus and estimateStatus from regular changes to avoid duplicate updates
        const { jobBoardStatus: removedJobBoardStatus, estimateStatus: removedEstimateStatus, ...otherChanges } = changes;
        
        // If there are other changes, save them with the regular endpoint
        if (Object.keys(otherChanges).length > 0) {
          console.log(`📡 Sending additional updates for other fields:`, otherChanges);
          await axiosSecure.patch(`/projects/update/${projectId}`, otherChanges);
        }
      } else {
        console.log(`📋 ❌ ENTERING regular update branch (no status changes):`, changes);
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

// 🗂️ FETCH PROJECT INDEX - Lightweight for month counting
const fetchProjectIndex = useCallback(async () => {
  try {
    console.log('📇 Fetching project index (optimized)...');
    
    // ✅ Single lightweight request instead of paginated loop
    const response = await axiosSecure.get("/projects/get-project-index");

    if (response.data.success) {
      const projectData = response.data.data || [];
      
      // Apply role-based filtering if needed (backend may have already filtered)
      let filteredIndex = projectData;
      if (user?.role === 'Estimator' && user?._id) {
        filteredIndex = projectData.filter(project => {
          const linkedEstimators = project.linkedEstimators || [];
          const isAssignedToUser = linkedEstimators.includes(user._id);
          const isUnassigned = !linkedEstimators.length;
          return isUnassigned || isAssignedToUser;
        });
      }
      
      setProjectIndex(filteredIndex);
      setTotalCount(filteredIndex.length);
      setIndexLoaded(true);
      console.log(`✅ Project index loaded: ${filteredIndex.length} projects (${projectData.length - filteredIndex.length} filtered out)`);
    }
  } catch (error) {
    console.error('❌ Error fetching project index:', error);
    setIndexLoaded(true);
  }
}, [axiosSecure, user]);

// 🚀 FETCH JOBS - Progressive Loading (same as ProjectTable)
const fetchJobs = useCallback(async (page = 1, append = false, filters = {}) => {
  try {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoadingJobs(true);
    }

    console.log(`� Fetching jobs: page=${page}, append=${append}`);
    
    // Build query params  
    const params = {
      page,
      limit: PROJECTS_PER_PAGE,
      sortBy: 'projectNumber',
      sortOrder: 'desc',
      ...filters // Include any filter parameters
    };

    // ✅ ON INITIAL LOAD: Fetch ALL projects for client-side filtering
    // This ensures month filters and search work without backend calls
    if (page === 1 && !append) {
      params.limit = 10000; // Get all projects (504 total)
      console.log('📦 Initial load: Fetching ALL projects for client-side filtering...');
    }

    const response = await axiosSecure.get("/projects/get-projects", { params });
    console.log("Full Job Data Response:", response.data);  // ✅ debug

    if (response.data.success) {
      const { 
        data: newProjects = [], 
        pagination = {} 
      } = response.data;

      // 🔍 DEBUG: Log status fields for first 3 projects
      if (newProjects.length > 0 && !append) {
        console.log("🔍 JobBoard received projects - sample status fields:", newProjects.slice(0, 3).map(p => ({
          projectNumber: p.projectNumber,
          estimateStatus: p.estimateStatus,
          jobBoardStatus: p.jobBoardStatus,
          status: p.status,
          linkedEstimators: p.linkedEstimators
        })));
      }
      
      // ✅ Trust backend filtering - no redundant frontend filter needed
      const filteredProjects = newProjects;

      // Update loaded projects
      if (append) {
        setJobs(prev => [...prev, ...filteredProjects]);
        setHasMore(pagination.hasNextPage || false);
        setTotalCount(pagination.totalProjects || filteredProjects.length);
      } else {
        setJobs(filteredProjects);
        // ✅ On initial load with all projects, disable "Load More"
        if (params.limit === 10000) {
          setHasMore(false);
          setTotalCount(filteredProjects.length);
          console.log(`✅ Loaded ALL ${filteredProjects.length} jobs (client-side filtering enabled)`);
        } else {
          setHasMore(pagination.hasNextPage || false);
          setTotalCount(pagination.totalProjects || filteredProjects.length);
        }
      }

      // Update pagination info
      setCurrentPage(pagination.currentPage || page);

      console.log(`✅ Loaded ${filteredProjects.length} jobs (Total loaded: ${append ? jobs.length + filteredProjects.length : filteredProjects.length}/${totalCount || '?'})`);
    } else {
      throw new Error(response.data.message || 'Failed to fetch jobs');
    }
  } catch (error) {
    console.error("❌ Error fetching jobs:", error);
    setJobs([]);
  } finally {
    setLoadingJobs(false);
    setLoadingMore(false);
  }
}, [axiosSecure, PROJECTS_PER_PAGE, jobs.length, user, totalCount]);

// Initial load - fetch index first, then first page of jobs
useEffect(() => {
  const initializeData = async () => {
    await fetchProjectIndex(); // Load index for accurate counts
    await fetchJobs(1, false); // Load first page of actual data
  };
  
  initializeData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Only on mount

// 📄 LOAD MORE HANDLER
const handleLoadMore = useCallback(() => {
  if (!loadingMore && hasMore) {
    const nextPage = currentPage + 1;
    console.log(`🔄 Loading more jobs (page ${nextPage})...`);
    fetchJobs(nextPage, true); // Append to existing
  }
}, [loadingMore, hasMore, currentPage, fetchJobs]);

// � MONTH FILTER HANDLER - CLIENT-SIDE ONLY (no backend fetching)
// JobTable handles all filtering internally from the jobs array
const handleMonthFilterChange = useCallback((monthId) => {
  console.log(`📅 Month filter changed to: ${monthId} (client-side filtering only)`);
  // ✅ NO BACKEND CALL - JobTable filters the already-loaded jobs array
}, []);





  // Live‐update callback for AssignClient
  const updateJobClients = (jobId, linkedClients) => {
    // Update local state for responsive UI
    setJobs(prev =>
      prev.map(j => (j._id === jobId ? { ...j, linkedClients } : j))
    );
    
    // 🔥 BACKEND UPDATE: Queue change for auto-save to persist to backend
    queueChange(jobId, 'linkedClients', linkedClients);
  };

  // Live‐update callback for AssignEstimator
  const updateJobEstimators = (jobId, linkedEstimators) => {
    // Update local state for responsive UI
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
    
    // 🔥 BACKEND UPDATE: Queue changes for auto-save to persist to backend
    const hasEstimators = linkedEstimators && linkedEstimators.length > 0;
    
    // Save linkedEstimators change
    queueChange(jobId, 'linkedEstimators', linkedEstimators);
    
    // If estimators are assigned, also update the status
    if (hasEstimators) {
      queueChange(jobId, 'estimateStatus', 'Assigned');
      queueChange(jobId, 'jobBoardStatus', 'Assigned'); // Legacy field
      queueChange(jobId, 'status', 'Assigned'); // Legacy field
    }
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

  const handleSelectMessageType = async (messageType, project) => {
    console.log('[JobBoard] Selected message type:', messageType, 'for project:', project || selectedJob);
    
    // Close the send message modal first
    closeSendMessageModal();
    
    const targetProject = project || selectedJob;
    
    // Handle different message types
    if (messageType.id === 'estimate-complete' || messageType.id === 'job-complete') {
      try {
        // 💾 AUTO-SAVE: Save any pending project changes before opening the modal
        await autoSaveProjectChanges(targetProject);
        
        // Open the EstimateCompleteModal for both estimate complete and job complete messages
        console.log('[JobBoard] Opening EstimateCompleteModal');
        setSelectedJob(targetProject);
        setEstimateModalVisible(true);
      } catch (error) {
        console.log('[JobBoard] Modal opening cancelled or auto-save failed:', error.message);
        // Don't open the modal if auto-save failed or user cancelled
      }
    } else if (messageType.id === 'job-delayed') {
      // Open the JobDelayedModal for delay notifications
      console.log('[JobBoard] Opening JobDelayedModal');
      setSelectedJob(targetProject);
      setJobDelayedModalVisible(true);
    } else {
      // For other message types, we can add handlers here later
      console.log('[JobBoard] Message type not yet implemented:', messageType.id);
    }
  };

  // Auto-save function to persist any unsaved project changes before opening modals
  const autoSaveProjectChanges = async (project) => {
    if (!project?._id) return;
    
    console.log('[JobBoard] Auto-saving project changes before opening modal...');
    
    // 💾 AUTOMATIC SAVE: Save any pending changes before opening the modal
    if (hasPendingChanges) {
      console.log('[JobBoard] Found pending changes, saving automatically...');
      try {
        await saveAllWithNormalization();
        console.log('[JobBoard] ✅ Auto-save completed successfully');
      } catch (error) {
        console.error('[JobBoard] ❌ Auto-save failed:', error);
        // Still proceed to open the modal - the backend uses current saved data for pricing snapshot
      }
    } else {
      console.log('[JobBoard] No pending changes to save');
    }
    
    // Optional: Add auto-save implementation here later
    try {
      // TODO: Implement proper auto-save based on your project editing interface
      // Check if there are unsaved changes and save them
      
      console.log('ℹ️ Proceeding with modal - ensure project data is saved');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      throw error; // Will prevent modal from opening
    }
  };

  // ──────────────────────────────────────────────────────────
  if (loadingJobs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        {/* Spinner */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          {/* Inner spinner for extra effect */}
          <div className="absolute top-2 left-2 w-12 h-12 border-4 border-gray-100 border-t-green-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
        </div>
        
        {/* Loading text */}
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-gray-700">Loading Job Board...</p>
          <p className="text-sm text-gray-500">
            {!indexLoaded ? 'Fetching project index...' : 'Loading projects...'}
          </p>
        </div>
        
        {/* Progress indicator if index is loading */}
        {!indexLoaded && (
          <div className="w-64 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        )}
      </div>
    );
  }

  // Guard: don't render until preferences are loaded
  if (!prefsLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        {/* Spinner */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute top-2 left-2 w-12 h-12 border-4 border-gray-100 border-t-green-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Loading preferences...</p>
          <p className="text-sm text-gray-500">Setting up your workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-8">
      {/* Jobs table - Now self-contained with all features */}
      <div className="mt-8">
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
          // Month filter callback
          onMonthFilterChange={handleMonthFilterChange}
          // Admin analytics
          onFilteredRowsChange={handleFilteredRowsChange}
          // Project index for accurate counts
          projectIndex={indexLoaded ? projectIndex : null}
        />
      </div>

      {/* Load More Button - Only show if there are more jobs to load */}
      {hasMore && !loadingJobs && (
        <div className="flex justify-center my-8">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {loadingMore ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <span>Load More Projects</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

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
          onSuccess={() => {
            // Refresh JobBoard to show updated Status
            fetchJobs(1, false);
          }}
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
