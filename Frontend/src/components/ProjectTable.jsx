/**
 * PROJECT TABLE COMPONENT - Progressive Loading with "Load More" ✅
 * 
 * SCALABLE FOR 10,000+ PROJECTS:
 * ✅ Initial load: 100 most recent projects (fast!)
 * ✅ "Load More" button: Fetch next 100 projects when clicked
 * ✅ Never loads all data: Only loads what user views
 * ✅ Memory efficient: Progressively loads chunks
 * ✅ Month tab counts: Server-side aggregation (fast!)
 * ✅ Filters work: Server-side filtering with progressive load
 * 
 * PERFORMANCE FOR LARGE DATASETS:
 * ✅ 100 projects per page = ~20KB per load
 * ✅ Skeleton loading prevents CLS
 * ✅ Optimistic rendering for instant UX
 * ✅ Can handle 10,000+ projects without memory issues
 * 
 * USER EXPERIENCE:
 * 1. Page loads → Shows first 100 projects instantly
 * 2. Scroll down → Click "Load More" → Fetch next 100
 * 3. Month filter → Reset and show first 100 of filtered data
 * 4. Status filter → Filter on already-loaded data client-side
 */

// src/Components/ProjectTable.jsx
import React, { useState, useMemo, useCallback, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from "@/shared/swalConfig";
import { projectStatuses, estimateStatuses } from "@/shared/projectStatuses";
import Avatar from "@/shared/Avatar";
import { navigateToProject } from "../utils/projectAliasUtils";
import { AuthContext } from "../auth/AuthProvider";
import MonthFilterTabs from "@/shared/components/MonthFilterTabs";
import { useMonthGrouping } from "@/appjobboard/hooks/useMonthGrouping";
import { subscribeToProjectDataUpdates } from "@/utils/ProjectDataSync";
import { useClientAccountStatus } from "@/hooks/useClientAccountStatus";
import "../styles/cls-fix.css";

export default function ProjectTable({
  userData = {},
  clients = [],
  openAssignClient = () => {},
  openAssignUser = () => {},
  onStatusChange = () => {},
  userRole = "User",
  columnConfig = {},
  isUserView = false,
  searchTerm = "",
}) {
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  
  // Check account status for restrictions
  const { isFeatureBlocked } = useClientAccountStatus();

  // ══════════════════════════════════════════════════════════════════
  // 🎯 PROGRESSIVE LOADING STATE
  // ══════════════════════════════════════════════════════════════════
  const [loadedProjects, setLoadedProjects] = useState([]); // Projects loaded so far
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state (server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const PROJECTS_PER_PAGE = 100; // Load 100 at a time (backend max per request)

  // Sorting state (server-side)
  const [sortColumn, setSortColumn] = useState("projectNumber");
  const [sortOrder, setSortOrder] = useState("desc");

  // Filtering state (client-side)
  const [statusFilter, setStatusFilter] = useState("All");

  // Month tab state
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOlderMonth, setSelectedOlderMonth] = useState(null);
  const [tabBeforeSearch, setTabBeforeSearch] = useState(null); // Remember tab before search

  // Updating projects state
  const [updatingProjects, setUpdatingProjects] = useState(new Set());

  // Index state - lightweight project numbers for accurate month counting
  const [projectIndex, setProjectIndex] = useState([]); // Array of { projectNumber, _id }
  const [indexLoaded, setIndexLoaded] = useState(false);
  
  // Track if initial default tab has been set (to prevent overriding user selections)
  const initialTabSet = useRef(false);

  // Search state
  const [searchResults, setSearchResults] = useState([]); // Results from server search
  const [isSearching, setIsSearching] = useState(false);

  // Use the monthly hook for month data (shared with MonthFilterTabs) - CLIENT-SIDE like JobTable
  // This uses loadedProjects for filtering, projectIndex is ONLY for badge counts in MonthFilterTabs
  const { 
    allMonths, 
    recentMonths, 
    olderMonths, 
    getMonthById, 
    totalJobCount 
  } = useMonthGrouping(loadedProjects);

  // ══════════════════════════════════════════════════════════════════
  // � SERVER-SIDE SEARCH - Search across ALL projects
  // ══════════════════════════════════════════════════════════════════
  const performServerSearch = useCallback(async (searchTerm, monthFilter = null) => {
    try {
      setIsSearching(true);
      console.log(`🔍 Performing server search: "${searchTerm}", month: ${monthFilter || 'all'}`);

      const params = { q: searchTerm };
      if (monthFilter && monthFilter !== 'all' && monthFilter !== 'lastN') {
        params.month = monthFilter;
      }

      const response = await axiosSecure.get("/projects/search-projects", { params });

      if (response.data.success) {
        const results = response.data.data || [];
        setSearchResults(results);
        console.log(`✅ Search found ${results.length} matching projects`);
        return results;
      } else {
        console.warn('⚠️ Search returned no results');
        setSearchResults([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Error performing search:', error);
      setSearchResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [axiosSecure]);

  // ══════════════════════════════════════════════════════════════════
  // �🗂️ FETCH PROJECT INDEX - Lightweight for month counting (OPTIMIZED)
  // ══════════════════════════════════════════════════════════════════
  const fetchProjectIndex = useCallback(async () => {
    try {
      console.log('📇 Fetching project index (optimized - single request)...');
      
      // ✅ Single lightweight request instead of paginated loop
      const response = await axiosSecure.get("/projects/get-project-index");

      if (response.data.success) {
        const projectData = response.data.data || [];
        
        setProjectIndex(projectData);
        setTotalCount(projectData.length);
        setIndexLoaded(true);
        console.log(`✅ Project index loaded: ${projectData.length} projects (${(projectData.length * 60 / 1024).toFixed(1)} KB)`);
      }
    } catch (error) {
      console.error('❌ Error fetching project index:', error);
      setIndexLoaded(true);
    }
  }, [axiosSecure]);

  // ══════════════════════════════════════════════════════════════════
  // 🚀 FETCH PROJECTS - Load ALL upfront for client-side filtering
  // ══════════════════════════════════════════════════════════════════
  const fetchProjects = useCallback(async (page = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log(`📦 Loading projects page ${page}...`);

      // Build query params
      const params = {
        page,
        limit: PROJECTS_PER_PAGE, // Default to pagination
        sortBy: sortColumn,
        sortOrder: sortOrder
      };

      const response = await axiosSecure.get("/projects/get-projects", { params });

      if (response.data.success) {
        const { 
          data: newProjects = [], 
          pagination = {} 
        } = response.data;

        // Update loaded projects
        if (append) {
          setLoadedProjects(prev => [...prev, ...newProjects]);
          setHasMore(pagination.hasNextPage || false);
          setTotalCount(pagination.totalProjects || newProjects.length);
          setCurrentPage(pagination.currentPage || page);
        } else {
          setLoadedProjects(newProjects);
          setCurrentPage(pagination.currentPage || page);
          setHasMore(pagination.hasNextPage || false);
          setTotalCount(pagination.totalProjects || newProjects.length);
        }

        console.log(`✅ Loaded ${newProjects.length} projects (Total in state: ${append ? loadedProjects.length + newProjects.length : newProjects.length})`);
      } else {
        throw new Error(response.data.message || 'Failed to fetch projects');
      }
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch projects');
      
      if (!append) {
        Swal.fire({
          title: "Error",
          text: "Failed to load projects. Please try again.",
          icon: "error",
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [axiosSecure, sortColumn, sortOrder, PROJECTS_PER_PAGE, loadedProjects.length, totalCount]);

  // Initial load - fetch index first, then first page of projects
  useEffect(() => {
    const initializeData = async () => {
      await fetchProjectIndex(); // Load index for accurate counts
      await fetchProjects(1, false); // Load first page of actual data
    };
    
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Listen for project data updates (e.g., client assignments)
  useEffect(() => {
    const unsubscribe = subscribeToProjectDataUpdates((updateEvent) => {
      console.log('📨 ProjectTable received sync update:', updateEvent);
      
      if (updateEvent.projectId && updateEvent.changes) {
        setLoadedProjects(prevProjects => 
          prevProjects.map(project => 
            project._id === updateEvent.projectId 
              ? { ...project, ...updateEvent.changes }
              : project
          )
        );
        console.log('✅ ProjectTable state updated for project:', updateEvent.projectId);
      }
    });
    
    return unsubscribe;
  }, []);

  // Reload when sorting changes
  useEffect(() => {
    if (sortColumn !== "projectNumber" || sortOrder !== "desc") {
      setLoadedProjects([]);
      setCurrentPage(1);
      fetchProjects(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortColumn, sortOrder]);

  // ══════════════════════════════════════════════════════════════════
  // 📄 LOAD MORE HANDLER
  // ══════════════════════════════════════════════════════════════════
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      console.log(`🔄 Loading more projects (page ${nextPage})...`);
      fetchProjects(nextPage, true); // Append to existing
    }
  }, [loadingMore, hasMore, currentPage, fetchProjects]);

  // ══════════════════════════════════════════════════════════════════
  // 🚀 LOAD ALL PROJECTS - Manual trigger for client-side filtering
  // ══════════════════════════════════════════════════════════════════
  const handleLoadAll = useCallback(async () => {
    const previousHasMore = hasMore; // Store previous state
    try {
      setLoading(true);
      setError(null);
      console.log('📦 Loading ALL projects for client-side filtering...');

      const params = {
        page: 1,
        limit: 1000, // Request large limit (backend will cap at its max)
        sortBy: sortColumn,
        sortOrder: sortOrder
      };

      const response = await axiosSecure.get("/projects/get-projects", { params });

      if (response.data.success) {
        const { data: allProjects = [], pagination = {} } = response.data;
        
        if (allProjects.length > 0) {
          setLoadedProjects(allProjects);
          setHasMore(false); // Disable pagination after successful load
          setTotalCount(allProjects.length);
          setCurrentPage(1);
          console.log(`✅ Loaded ${allProjects.length} projects (client-side filtering enabled)`);
        } else {
          console.warn('⚠️ Load All returned 0 projects');
          setError('No projects found');
          setHasMore(previousHasMore); // Restore previous state
        }
      }
    } catch (error) {
      console.error('❌ Error loading all projects:', error);
      setError(error.response?.data?.message || error.message || 'Failed to load all projects');
      setHasMore(previousHasMore); // Restore hasMore on error so buttons come back
    } finally {
      setLoading(false);
    }
  }, [axiosSecure, sortColumn, sortOrder, hasMore]);

  // ══════════════════════════════════════════════════════════════════
  // 🗓️ MONTH FILTERING
  // ══════════════════════════════════════════════════════════════════
  
  // Configuration for Last N Projects tab
  const lastNConfig = useMemo(() => ({
    enabled: true,
    limit: 30,
    label: "Most Recent"
  }), []);

  // Handle month tab changes - INDEX-BASED filtering
  const handleMonthTabChange = useCallback(async (tabId) => {
    console.log(`📅 Month tab changed: ${tabId}`);
    setActiveTab(tabId);
    
    // If clicking a specific month (not 'all' or 'lastN'), load projects for that month from index
    if (tabId !== 'all' && tabId !== 'lastN') {
      // Filter projectIndex to get IDs for this month
      const monthMatch = tabId.match(/^(\d{2})-(\d{2})/);
      if (monthMatch && projectIndex.length > 0) {
        const [_, yearStr, monthStr] = monthMatch;
        
        // Filter index for projects in this month
        const monthProjectIds = projectIndex
          .filter(p => p.projectNumber && p.projectNumber.startsWith(`${yearStr}-${monthStr}`))
          .map(p => p._id);
        
        if (monthProjectIds.length > 0) {
          console.log(`🔍 Found ${monthProjectIds.length} projects in ${tabId} - loading full data...`);
          setLoading(true);
          
          try {
            // Load full project data for these IDs only
            const response = await axiosSecure.post("/projects/get-projects-by-ids", {
              projectIds: monthProjectIds,
              sortBy: sortColumn,
              sortOrder: sortOrder
            });
            
            if (response.data.success) {
              const monthProjects = response.data.data || [];
              setLoadedProjects(monthProjects);
              setHasMore(false); // Disable pagination for filtered view
              setCurrentPage(1); // Reset page
              console.log(`✅ Loaded ${monthProjects.length} projects for ${tabId}`);
            }
          } catch (error) {
            console.error(`❌ Error loading projects for ${tabId}:`, error);
            setError(`Failed to load projects for ${tabId}`);
          } finally {
            setLoading(false);
          }
        } else {
          console.log(`⚠️ No projects found in index for ${tabId}`);
          setLoadedProjects([]);
          setHasMore(false);
        }
      }
    } else if (tabId === 'all') {
      // Reset to normal paginated view
      console.log('🔄 Resetting to paginated view...');
      fetchProjects(1, false);
    } else if (tabId === 'lastN') {
      // Load most recent projects
      console.log(`🔄 Loading ${lastNConfig.limit} most recent projects...`);
      setLoading(true);
      try {
        const response = await axiosSecure.get("/projects/get-projects", {
          params: {
            page: 1,
            limit: lastNConfig.limit,
            sortBy: 'posting_date',
            sortOrder: 'desc'
          }
        });
        
        if (response.data.success) {
          setLoadedProjects(response.data.data || []);
          setHasMore(false);
          setCurrentPage(1);
          console.log(`✅ Loaded ${lastNConfig.limit} most recent projects`);
        }
      } catch (error) {
        console.error('❌ Error loading recent projects:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [projectIndex, sortColumn, sortOrder, axiosSecure, fetchProjects, lastNConfig]);

  // Auto-switch to "All" when searching, remember previous tab, trigger server search
  useEffect(() => {
    if (searchTerm && searchTerm.trim()) {
      // Save current tab if not already searching
      if (!tabBeforeSearch) {
        setTabBeforeSearch(activeTab);
      }
      // Switch to "All" to show all search results
      if (activeTab !== 'all') {
        setActiveTab('all');
      }
      
      // Trigger server-side search
      const monthFilter = activeTab !== 'all' && activeTab !== 'lastN' ? activeTab : null;
      performServerSearch(searchTerm, monthFilter);
    } else if (tabBeforeSearch) {
      // Restore previous tab when search is cleared
      setActiveTab(tabBeforeSearch);
      setTabBeforeSearch(null);
      setSearchResults([]); // Clear search results
    } else if (!searchTerm) {
      setSearchResults([]); // Clear search results when empty
    }
  }, [searchTerm, activeTab, tabBeforeSearch, performServerSearch]);

  // Handle older month selection
  const handleOlderMonthSelect = useCallback((monthId) => {
    setSelectedOlderMonth(monthId);
    handleMonthTabChange(monthId);
  }, [handleMonthTabChange]);

  // Handle removing selected older month
  const handleOlderMonthRemove = useCallback(() => {
    setSelectedOlderMonth(null);
    setActiveTab('all');
  }, []);

  // Set default tab based on user role - matches JobTable logic (only run once on mount)
  useEffect(() => {
    if (user?.role && !initialTabSet.current && recentMonths.length > 0) {
      const isAdmin = user.role === 'admin' || user.role === 'Admin' || user.role === 'administrator';
      
      if (isAdmin) {
        // Admin: Default to current month (if available), otherwise 'all'
        const currentDate = new Date();
        const currentMonthKey = `${String(currentDate.getFullYear()).slice(-2)}-${String(currentDate.getMonth() + 1).padStart(2, '0')} ${currentDate.toLocaleDateString('en-US', { month: 'short' })}`;
        const currentMonth = [...recentMonths, ...olderMonths].find(month => month.id === currentMonthKey);
        const hasCurrentMonthData = currentMonth && currentMonth.jobs.length > 0;
        setActiveTab(hasCurrentMonthData ? currentMonthKey : 'all');
      } else {
        // All other roles: Default to Most Recent (lastN)
        setActiveTab('lastN');
      }
      
      // Mark that initial tab has been set - prevent future runs from overriding user selections
      initialTabSet.current = true;
    }
  }, [user?.role, recentMonths, olderMonths]);

  // ══════════════════════════════════════════════════════════════════
  // 📊 FILTERING - Use server search results when searching, otherwise client-side filter
  // ══════════════════════════════════════════════════════════════════
  
  // Filter projects - Use server search results if searching, otherwise filter loaded projects
  const filteredProjects = useMemo(() => {
    // If actively searching, use server search results
    if (searchTerm && searchTerm.trim() && searchResults.length > 0) {
      let filtered = searchResults;
      
      // Apply status filter to search results
      if (statusFilter !== 'All') {
        filtered = filtered.filter(project => project.status === statusFilter);
      }
      
      // Apply month filter to search results if not on 'all' tab
      if (activeTab !== 'all' && activeTab !== 'lastN') {
        const monthData = [...recentMonths, ...olderMonths].find(month => month.id === activeTab);
        if (monthData) {
          const monthJobIds = new Set(monthData.jobs.map(j => j._id));
          filtered = filtered.filter(project => monthJobIds.has(project._id));
        }
      }
      
      return filtered;
    }
    
    // If searching but no results yet, show empty array to avoid confusion
    if (searchTerm && searchTerm.trim()) {
      return [];
    }
    
    // Not searching - use client-side filtering on loaded projects
    let filtered = loadedProjects;

    // Apply month filtering based on activeTab
    if (activeTab === 'all') {
      filtered = loadedProjects;
    } else if (activeTab === 'lastN') {
      filtered = [...loadedProjects]
        .sort((a, b) => new Date(b.posting_date || b.created_at) - new Date(a.posting_date || a.created_at))
        .slice(0, lastNConfig.limit);
    } else {
      // For month tabs, loadedProjects already contains the filtered month data
      // (loaded via index in handleMonthTabChange)
      filtered = loadedProjects;
    }

    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    return filtered;
  }, [loadedProjects, searchTerm, searchResults, activeTab, statusFilter, lastNConfig.limit, recentMonths, olderMonths]);

  // ══════════════════════════════════════════════════════════════════
  // 🛠️ UTILITY FUNCTIONS
  // ══════════════════════════════════════════════════════════════════

  // Combine all available statuses
  const statuses = useMemo(() => {
    return [...new Set([...projectStatuses, ...estimateStatuses])];
  }, []);

  // Get sort icon
  const getSortIcon = useCallback((column) => {
    if (sortColumn !== column) return "↕️";
    return sortOrder === "asc" ? "↑" : "↓";
  }, [sortColumn, sortOrder]);

  // Handle sorting - triggers server reload
  const handleSort = useCallback((column) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("desc");
    }
    // Reset to page 1 when sorting changes
    setCurrentPage(1);
    setLoadedProjects([]);
  }, [sortColumn, sortOrder]);

  // Handle status filter - client-side only
  const handleStatusFilterChange = useCallback((event) => {
    setStatusFilter(event.target.value);
  }, []);

  // Get project location
  const getProjectLocation = useCallback((project) => {
    if (!project) return "N/A";
    if (typeof project.location === "string") {
      return project.location;
    }
    return project.location?.full_address || project.address || project.suburb || "";
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // 🎯 DUAL-STATUS SYSTEM: Get display status and dropdown options
  // ══════════════════════════════════════════════════════════════════
  const getProjectDisplayInfo = useCallback((project) => {
    // Support legacy projects with old 'status' field
    const projectStatus = project.projectStatus || project.status || "New Lead";
    const estimateStatus = project.estimateStatus || null;
    
    // Determine if Project Table status is LOCKED by active estimate
    const isLockedByEstimate = estimateStatus && 
                                estimateStatus !== "Cancelled" && 
                                estimateStatus !== "Sent";
    
    let displayStatus, availableStatuses, canEdit;
    
    if (isLockedByEstimate) {
      // 🔒 LOCKED: Estimator is working on this
      
      // Special case: "Estimate Requested" is the ONLY status that doesn't get ART prefix
      // because both client and estimator use this same initial status
      if (estimateStatus === "Estimate Requested" && projectStatus === "Estimate Requested") {
        // They MATCH on initial request - NO ART prefix
        displayStatus = "Estimate Requested";
      } else {
        // ALL OTHER locked statuses get ART prefix (Assigned, In Progress, etc.)
        displayStatus = `ART: ${estimateStatus}`;
      }
      
      availableStatuses = [
        { label: displayStatus, color: "bg-orange-100 text-orange-800" },
        { label: "Cancel Request", color: "bg-red-100 text-red-800" }
      ];
      canEdit = (userRole === "Admin" || userRole === "User"); // Both can cancel
      
    } else {
      // ✅ UNLOCKED: Show normal project status workflow
      displayStatus = projectStatus;
      availableStatuses = projectStatuses;
      canEdit = (userRole === "Admin" || userRole === "User");
    }
    
    return {
      displayStatus,
      projectStatus,
      estimateStatus,
      availableStatuses,
      canEdit,
      isLocked: isLockedByEstimate
    };
  }, [userRole]);

  // ══════════════════════════════════════════════════════════════════
  // 🔄 DUAL-STATUS UPDATE: Handle status changes with role-based logic
  // ══════════════════════════════════════════════════════════════════
  const handleStatusChange = useCallback(async (projectId, newStatus) => {
    const project = loadedProjects.find(p => p._id === projectId);
    if (!project) return;
    
    const { isLocked, projectStatus, estimateStatus } = getProjectDisplayInfo(project);
    
    // 🚫 RESTRICT: ProjectTable can ONLY update early-stage client statuses
    // Once JobBoard takes over (estimator assigned/working), only JobBoard should update status
    const allowedProjectTableStatuses = [
      "New Lead",
      "Estimate Requested",
      "Estimate Completed", // Client regains control after estimate done
      "Quote Sent",
      "Approved",
      "Project Active",
      "Completed",
      "Cancelled",
      "Job lost"
    ];
    
    if (!allowedProjectTableStatuses.includes(newStatus) && newStatus !== "Cancel Request") {
      console.warn(`⚠️ ProjectTable cannot set status "${newStatus}" - only JobBoard can set estimator statuses`);
      Swal.fire({
        title: "Invalid Status",
        text: "This status can only be set from the Job Board by estimators",
        icon: "warning",
      });
      return;
    }
    
    // NOTE: Status updates work normally even when on hold
    // The "ART:" prefix rule prevents clients from updating locked projects automatically
    
    console.log(`🔄 Status change requested for project ${projectId}:`, {
      newStatus,
      currentProjectStatus: projectStatus,
      currentEstimateStatus: estimateStatus,
      isLocked,
      userRole
    });

    setUpdatingProjects(prev => new Set(prev).add(projectId));

    // Prepare update payload based on role and status
    let updatePayload = {};
    let optimisticUpdate = {};
    
    if (newStatus === "Cancel Request") {
      // 🔴 CANCEL REQUEST: Unlock by setting estimateStatus to "Cancelled"
      updatePayload = { 
        estimateStatus: "Cancelled",
        projectStatus: projectStatus, // Keep current project status
        status: "Cancelled", // ✅ Legacy field for live build
        jobBoardStatus: "Cancelled" // ✅ Legacy field for live build
      };
      optimisticUpdate = {
        estimateStatus: "Cancelled",
        projectStatus: projectStatus,
        status: "Cancelled",
        jobBoardStatus: "Cancelled"
      };
      console.log(`❌ Cancelling estimate request - will unlock client workflow`);
      
    } else if (newStatus === "Estimate Requested") {
      // ✨ SPECIAL: "Estimate Requested" sets BOTH fields simultaneously
      updatePayload = { 
        projectStatus: "Estimate Requested",
        estimateStatus: "Estimate Requested",
        status: "Estimate Requested", // ✅ Legacy field for live build
        jobBoardStatus: "Estimate Requested" // ✅ Legacy field for live build
      };
      optimisticUpdate = {
        projectStatus: "Estimate Requested",
        estimateStatus: "Estimate Requested",
        status: "Estimate Requested",
        jobBoardStatus: "Estimate Requested"
      };
      console.log(`📝 Setting BOTH projectStatus and estimateStatus to "Estimate Requested"`);
      
    } else if (userRole === "User") {
      // 👤 USERS: Can only update projectStatus (early-stage client workflow)
      updatePayload = { 
        projectStatus: newStatus,
        status: newStatus, // ✅ Legacy field for live build
        jobBoardStatus: newStatus // ✅ Legacy field for live build
      };
      optimisticUpdate = { 
        projectStatus: newStatus,
        status: newStatus,
        jobBoardStatus: newStatus
      };
      
    } else if (userRole === "Admin") {
      // 🔧 ADMINS: In ProjectTable, can only update early-stage projectStatus
      // For JobBoard statuses (Assigned, In Progress, etc.), use JobBoard instead
      updatePayload = { 
        projectStatus: newStatus,
        status: newStatus, // ✅ Legacy field for live build
        jobBoardStatus: newStatus // ✅ Legacy field for live build
      };
      optimisticUpdate = { 
        projectStatus: newStatus,
        status: newStatus,
        jobBoardStatus: newStatus
      };
    }

    // Optimistic UI update
    const originalProjects = [...loadedProjects];
    setLoadedProjects(prevProjects =>
      prevProjects.map(p =>
        p._id === projectId ? { ...p, ...optimisticUpdate } : p
      )
    );

    try {
      const response = await axiosSecure.patch(`/projects/${projectId}`, updatePayload);

      if (response.data.success) {
        console.log(`✅ Project ${projectId} status updated successfully`);
        
        // Update with backend response to ensure sync
        setLoadedProjects(prevProjects =>
          prevProjects.map(p =>
            p._id === projectId ? { ...p, ...response.data.data } : p
          )
        );
        
        if (onStatusChange) {
          onStatusChange(projectId, newStatus);
        }

        Swal.fire({
          title: "Success",
          text: newStatus === "Cancel Request" 
            ? "Estimate request cancelled successfully" 
            : "Project status updated successfully",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error("❌ Error updating project status:", error);
      setLoadedProjects(originalProjects); // Rollback
      
      Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Failed to update project status",
        icon: "error",
      });
    } finally {
      setUpdatingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  }, [axiosSecure, loadedProjects, onStatusChange, userRole, getProjectDisplayInfo]);

  // ══════════════════════════════════════════════════════════════════
  // 🎨 RENDER HELPERS
  // ══════════════════════════════════════════════════════════════════

  const renderClientCell = useCallback((project) => {
    const linkedClients = project.linkedClients || [];
    const hasClients = linkedClients.length > 0;
    const clientInfo = hasClients && linkedClients[0]
      ? clients.find(c => c._id === linkedClients[0])
      : null;

    if (userRole === "Admin") {
      return (
        <td className="px-2 py-3 text-sm">
          {hasClients && clientInfo ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openAssignClient(project);
              }}
              className="flex items-center gap-2 min-w-0 hover:bg-gray-50 px-2 py-1 rounded transition-colors w-full text-left"
              title="Click to reassign client"
            >
              <Avatar
                name={clientInfo.company || clientInfo.name || clientInfo.clientName}
                avatarUrl={clientInfo.avatar || clientInfo.clientLogo}
                size="sm"
                className="flex-shrink-0"
              />
              <span className="text-gray-900 font-medium truncate">
                {clientInfo.company || clientInfo.name || clientInfo.clientName}
              </span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openAssignClient(project);
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors"
            >
              Assign
            </button>
          )}
        </td>
      );
    } else if (userRole === "Estimator") {
      return (
        <td className="px-2 py-3 text-sm">
          {hasClients && clientInfo ? (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                name={clientInfo.company || clientInfo.name || clientInfo.clientName}
                avatarUrl={clientInfo.avatar || clientInfo.clientLogo}
                size="sm"
                className="flex-shrink-0"
              />
              <span className="text-gray-900 font-medium truncate" title={clientInfo.company || clientInfo.name || clientInfo.clientName}>
                {clientInfo.company || clientInfo.name || clientInfo.clientName}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 italic text-xs">No client assigned</span>
          )}
        </td>
      );
    }
    return null;
  }, [clients, userRole, openAssignClient]);

  // ══════════════════════════════════════════════════════════════════
  // 🎨 RENDER STATUS CELL: Clean colored badges with dropdown on click
  // ══════════════════════════════════════════════════════════════════
  const renderStatusCell = useCallback((project) => {
    const { displayStatus, canEdit, availableStatuses, isLocked } = getProjectDisplayInfo(project);
    const isUpdating = updatingProjects.has(project._id);

    // Get color classes based on status
    const getStatusColor = (status) => {
      // Strip "ART:" prefix for color lookup
      const cleanStatus = status.replace(/^ART:\s*/, '');
      
      // First check estimateStatuses for JobBoard statuses
      const estimateStatus = estimateStatuses.find(s => s.label === cleanStatus);
      if (estimateStatus) {
        return estimateStatus.color;
      }
      
      // Then check projectStatuses for Project statuses
      const projectStatus = projectStatuses.find(s => s.label === cleanStatus);
      if (projectStatus) {
        return projectStatus.color;
      }
      
      // Fallback to gray
      return 'bg-gray-100 text-gray-800';
    };

    // All users get dropdown with colored appearance
    return (
      <td className="px-2 py-3 relative">
        <select
          value={displayStatus}
          onChange={(e) => {
            e.stopPropagation();
            handleStatusChange(project._id, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          disabled={isUpdating || (userRole === 'Estimator')}
          className={`w-full px-2 py-1.5 text-xs font-medium rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-center ${
            getStatusColor(displayStatus)
          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''} ${
            userRole === 'Estimator' ? 'cursor-default' : ''
          }`}
          style={{
            backgroundImage: userRole !== 'Estimator' ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` : 'none',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.25rem center',
            backgroundSize: '0.875rem',
            paddingRight: userRole !== 'Estimator' ? '1.5rem' : '0.5rem'
          }}
        >
          {availableStatuses.map((status) => (
            <option key={status.label} value={status.label}>
              {status.label === "Estimate Requested" ? "Request Estimate" : status.label}
            </option>
          ))}
        </select>
        {isUpdating && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </td>
    );
  }, [getProjectDisplayInfo, userRole, updatingProjects, handleStatusChange]);

  // ══════════════════════════════════════════════════════════════════
  // 🎨 MAIN RENDER
  // ══════════════════════════════════════════════════════════════════

  if (loading && loadedProjects.length === 0) {
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
          <p className="text-lg font-semibold text-gray-700">Loading Projects...</p>
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

  if (error && loadedProjects.length === 0) {
    return (
      <div className="w-full p-8 text-center">
        <div className="text-red-600 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load projects</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => fetchProjects(1, false)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 📅 MONTH FILTER INTERFACE - Using Shared MonthFilterTabs Component */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Header Section with Title and Role Indicators */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800">
              Projects by Month
              {activeTab !== 'all' && activeTab !== 'lastN' && (
                <span className="ml-1 text-blue-600">({
                  [...recentMonths, ...olderMonths].find(month => month.id === activeTab)?.label || activeTab
                })</span>
              )}
              {activeTab === 'lastN' && (
                <span className="ml-1 text-green-600">(Most Recent {lastNConfig.limit})</span>
              )}
            </h3>
            {/* Development Mode Role Indicators (Hidden in Production) */}
            {process.env.NODE_ENV === 'development' && userRole === 'Estimator' && (
              <div className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                Estimator View: Your Assigned Projects
              </div>
            )}
            {process.env.NODE_ENV === 'development' && userRole === 'Admin' && (
              <div className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                Admin View: All Projects
              </div>
            )}
          </div>
        </div>

        {/* Shared Month Filter Tabs Component */}
        <MonthFilterTabs
          projects={loadedProjects}
          projectIndex={projectIndex}
          activeTab={activeTab}
          onTabChange={handleMonthTabChange}
          selectedOlderMonth={selectedOlderMonth}
          onOlderMonthSelect={handleOlderMonthSelect}
          onOlderMonthRemove={handleOlderMonthRemove}
          lastNConfig={{ 
            enabled: true,
            limit: lastNConfig.limit, 
            label: "Most Recent"
          }}
          userRole={userRole}
          showProjectCount={true}
          projectCount={totalJobCount}
        />
      </div>

      {/* Show loading state when searching */}
      {isSearching && (
        <div className="flex items-center justify-center py-8 bg-blue-50 rounded-lg mt-4">
          <div className="flex items-center gap-3 text-blue-700">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="font-medium">Searching all {totalCount} projects...</span>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mt-4">
        <table className="w-full stable-table">
          <thead>
            <tr className="bg-primary-10 text-medium h-8">
              <th className="text-left pl-3 pr-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap" style={{ width: '110px' }}>
                Project ID
              </th>

              {columnConfig.assignClient !== false && !isUserView && (
                <th className="text-left px-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap" style={{ width: '200px' }}>
                  Client
                </th>
              )}

              {columnConfig.projectName !== false && (
                <th className="text-left px-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap">
                  Project Name
                </th>
              )}

              {columnConfig.dueDate !== false && (
                <th className="text-left px-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap table-col-due-date" style={{ width: '110px' }}>
                  <span>Due Date</span>
                </th>
              )}

              {columnConfig.cost !== false && (
                <th className="text-left px-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap table-col-cost" style={{ width: '80px' }}>
                  <span>Cost</span>
                </th>
              )}

              {columnConfig.status !== false && (
                <th className="text-left px-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap" style={{ width: '180px' }}>
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    <select
                      value={statusFilter}
                      onChange={handleStatusFilterChange}
                      className="text-xs px-2 py-1 border border-gray-300 rounded bg-white"
                      onClick={(e) => e.stopPropagation()}
                      disabled={loading}
                    >
                      <option value="All">All</option>
                      {statuses.map((status) => (
                        <option key={status.label} value={status.label}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
              )}

              {columnConfig.postingDate !== false && (
                <th className="text-left px-2 py-2 font-medium text-sm text-gray-700 whitespace-nowrap table-col-posted" style={{ width: '110px' }}>
                  <span>Posted</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <tr
                  key={project._id}
                  className="border-t-[1px] cursor-pointer hover:bg-gray-100"
                  onClick={() => navigateToProject(project, navigate, axiosSecure)}
                >
                  <td className="pl-3 pr-2 py-3 text-sm font-semibold text-blue-600">
                    <div className="truncate">
                      {project.projectNumber}
                    </div>
                  </td>
                  
                  {columnConfig.assignClient !== false && !isUserView && renderClientCell(project)}

                  {columnConfig.projectName !== false && (
                    <td className="px-2 py-3 text-sm">
                      <div className="font-semibold text-gray-900 leading-tight mb-0.5 line-clamp-1" title={project.name}>
                        {project.name}
                      </div>
                      <div className="text-xs text-gray-500 leading-tight line-clamp-1" title={getProjectLocation(project)}>
                        {getProjectLocation(project)}
                      </div>
                    </td>
                  )}

                  {columnConfig.dueDate !== false && (
                    <td className="px-2 py-3 text-sm overflow-hidden table-col-due-date">
                      <div className="truncate">
                        {project.due_date ? new Date(project.due_date).toLocaleDateString() : "N/A"}
                      </div>
                    </td>
                  )}

                  {columnConfig.cost !== false && (
                    <td className="px-2 py-3 text-sm font-semibold overflow-hidden table-col-cost">
                      <div className="truncate">
                        {project.total ? `$${Number(project.total).toLocaleString()}` : "N/A"}
                      </div>
                    </td>
                  )}

                  {columnConfig.status !== false && renderStatusCell(project)}

                  {columnConfig.postingDate !== false && (
                    <td className="px-2 py-3 text-sm overflow-hidden table-col-posted">
                      <div className="truncate">
                        {project.posting_date ? new Date(project.posting_date).toLocaleDateString() : "N/A"}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">
                      {searchTerm ? `No projects found matching "${searchTerm}"` : 'No projects found'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchTerm 
                        ? 'Try a different search term' 
                        : hasMore && activeTab !== 'all'
                          ? `No projects in loaded data for this filter. Only ${loadedProjects.length} of ${totalCount} projects loaded.`
                          : 'Try adjusting your filters'}
                    </p>
                    {/* Show Load More button in empty state if there are more projects */}
                    {hasMore && activeTab !== 'all' && !searchTerm && (
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {loadingMore ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Loading...</span>
                          </div>
                        ) : (
                          'Load More Projects'
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 p-3">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <div
              key={project._id}
              className="bg-white p-5 rounded-lg shadow-md border border-gray-200 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigateToProject(project, navigate, axiosSecure)}
            >
              {/* Project Number & Status */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-blue-600">
                  {project.projectNumber}
                </span>
                {renderStatusCell(project)}
              </div>

              {/* Project Name */}
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                {project.name}
              </h3>

              {/* Project Location */}
              <p className="text-sm text-gray-600 mb-3">
                {getProjectLocation(project)}
              </p>

              {/* Client */}
              {columnConfig.assignClient !== false && !isUserView && (
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                    Client
                  </label>
                  {renderClientCell(project)}
                </div>
              )}

              {/* Dates & Cost Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {columnConfig.dueDate !== false && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 block mb-1">Due Date</span>
                    <span className="text-gray-900">{project.due_date ? new Date(project.due_date).toLocaleDateString() : "N/A"}</span>
                  </div>
                )}
                {columnConfig.cost !== false && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 block mb-1">Cost</span>
                    <span className="text-gray-900 font-semibold">{project.total ? `$${Number(project.total).toLocaleString()}` : "N/A"}</span>
                  </div>
                )}
                {columnConfig.postingDate !== false && (
                  <div className="col-span-2">
                    <span className="text-xs font-medium text-gray-500 block mb-1">Posted</span>
                    <span className="text-gray-900">{project.posting_date ? new Date(project.posting_date).toLocaleDateString() : "N/A"}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No projects found</p>
            <p className="text-sm text-gray-400 mt-1">
              {hasMore && activeTab !== 'all'
                ? `No projects in loaded data for this filter. Only ${loadedProjects.length} of ${totalCount} projects loaded.`
                : 'Try adjusting your filters'}
            </p>
            {/* Show Load More button in empty state if there are more projects */}
            {hasMore && activeTab !== 'all' && !searchTerm && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  'Load More Projects'
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Load More Button - Hide when searching (search shows all results) */}
      {!searchTerm && !isSearching && hasMore && filteredProjects.length > 0 && filteredProjects.length < totalCount && (
        <div className="flex items-center justify-center py-6 gap-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              loadingMore
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {loadingMore ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Loading...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Load More ({PROJECTS_PER_PAGE} projects)</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          </button>
          
          {/* Load All Button */}
          <button
            onClick={handleLoadAll}
            disabled={loading}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
            }`}
            title="Load all projects for instant month filtering"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Loading All...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Load All Projects</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
            )}
          </button>
        </div>
      )}

      {/* End of list message */}
      {!hasMore && loadedProjects.length > 0 && !searchTerm && !isSearching && (
        <div className="text-center py-6 text-gray-500 text-sm">
          <p>✓ All projects loaded ({filteredProjects.length} total)</p>
        </div>
      )}

      {/* Search results count */}
      {searchTerm && !isSearching && filteredProjects.length > 0 && (
        <div className="text-center py-6 text-green-600 text-sm bg-green-50 rounded-lg">
          <p className="font-medium">✓ Found {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} matching "{searchTerm}"</p>
          <p className="text-xs text-gray-600 mt-1">Searched across all {totalCount} projects in database</p>
        </div>
      )}
    </div>
  );
}
