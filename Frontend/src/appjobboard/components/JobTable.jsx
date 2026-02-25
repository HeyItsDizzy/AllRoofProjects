import React, { useState, useMemo, useContext, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Switch, FormControlLabel, Checkbox, alpha, styled } from '@mui/material';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  flexRender,
} from '@tanstack/react-table';
import { AuthContext } from '@/auth/AuthProvider';
import { jobBoardColumns } from '@/appjobboard/config/JobBoardConfig';
import { IconPin, IconUnpin, IconSave, IconWarning } from '@/shared/IconSet';
import Avatar from '@/shared/Avatar';
import { useMonthGrouping } from '@/appjobboard/hooks/useMonthGrouping';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import { useAutoSave } from '@/appjobboard/hooks/useAutoSave';
import MonthFilterTabs from '@/shared/components/MonthFilterTabs';
import { Z_INDEX, COMPONENT_Z_INDEX } from '@/shared/styles/zIndexManager';
import ZIndexDebugger from '@/shared/styles/ZIndexDebugger';
import { 
  OptimizedEditableCell, 
  JobTableLCPCSS, 
  useLCPMonitoring 
} from '@/appjobboard/components/OptimizedInlineEditing';
import { 
  useCriticalResourcePreloader, 
  useLazyResourceLoader, 
  usePerformanceBudget 
} from '@/utils/performanceOptimizations';

// Custom styled switch with your primary green color
const GreenSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: '#009245', // Your primary green for the thumb/dot
    '&:hover': {
      backgroundColor: alpha('#009245', theme.palette.action.hoverOpacity),
    },
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: '#009245', // Your primary green for the track
  },
  '& .MuiSwitch-thumb': {
    backgroundColor: '#ffffff', // White when unchecked
  },
  '& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb': {
    backgroundColor: '#009245', // Green dot when checked
  },
}));

/**
 * ENHANCED JOB TABLE - Complete Self-Contained Component ✅
 * 
 * INTEGRATED FEATURES:
 * ✅ Month filtering tabs with beautiful UI
 * ✅ Action buttons (Clear Filters, Reset Sorting, Save Changes)  
 * ✅ Excel-like freeze panes using pure TanStack sticky positioning
 * ✅ Search functionality with debouncing
 * ✅ Role-based filtering (Estimator vs Admin)
 * ✅ Auto-save integration support
 * ✅ Column resizing and preferences
 * ✅ Inline editing with callbacks to parent
 * ✅ Zoom control support
 * ✅ Mobile responsive design
 * 
 * ARCHITECTURE:
 * ✅ Self-contained - can be dropped into any page
 * ✅ Clean prop interface for customization
 * ✅ DRY implementation with proper separation of concerns
 * ✅ Performance optimized with memoization
 */
export default function JobTable({
  jobs,
  config,
  exchangeRate,
  clients = [],
  estimators = [],
  openAssignClient = () => {},
  openAssignEstimator = () => {},
  openEstimateModal = () => {},
  openSendModal = () => {},
  openColumn,
  setOpenColumn,
  columnSizing = {},
  onColumnSizingChange = () => {},
  sorting = [],
  onSortingChange = () => {},
  columnFilters = [],
  onColumnFiltersChange = () => {},
  // Zoom integration
  zoomLevel = 100,
  onZoomChange = () => {},
  // Admin analytics callback
  onFilteredRowsChange = () => {},
  // Project index for accurate month counts with pagination
  projectIndex = null,
  // Month filter change callback
  onMonthFilterChange = () => {},
}) {
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  
  // ══════════════════════════════════════════════════════════════════
  // 🎯 PERFORMANCE MONITORING & LCP OPTIMIZATION
  // ══════════════════════════════════════════════════════════════════
  
  const lcpValue = useLCPMonitoring();
  useCriticalResourcePreloader();
  useLazyResourceLoader();
  usePerformanceBudget();
  
  // Log LCP improvements in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && lcpValue) {
      console.log(`🚀 JobTable LCP: ${lcpValue.toFixed(2)}ms`);
      if (lcpValue < 2500) {
        console.log('✅ LCP Improved! Target <2.5s achieved');
      }
    }
  }, [lcpValue]);
  
  // ══════════════════════════════════════════════════════════════════
  // 🎯 AUTO-SAVE FUNCTIONALITY
  // ══════════════════════════════════════════════════════════════════
  
  // Local data state for inline edits and live updates
  const [data, setData] = useState(jobs);
  
  // Tooltip state for help icon
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [helpTooltipPosition, setHelpTooltipPosition] = useState({ top: 0, left: 0 });
  const helpIconRef = useRef(null);
  
  // Auto-save functionality
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
      console.log(`🚀 Sending update to backend for project ${projectId}:`, changes);
      // Use /update/:id endpoint for full project updates (supports all fields)
      await axiosSecure.patch(`/projects/update/${projectId}`, changes);
      console.log(`✅ Successfully updated project ${projectId} in database`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save project:', error);
      throw error;
    }
  });

  // Update row function for immediate UI updates and auto-save
  const updateRow = useCallback((projectId, field, value) => {
    // Update local state immediately for responsive UI
    setData(prev => prev.map(row => 
      row._id === projectId ? { ...row, [field]: value } : row
    ));
    
    // Queue the change for auto-save
    queueChange(projectId, field, value);
  }, [queueChange]);

  // Sync local data when parent jobs prop changes
  useEffect(() => {
    setData(jobs);
  }, [jobs]);
  
  // Help tooltip mouse handlers
  const handleHelpMouseEnter = () => {
    if (helpIconRef.current) {
      const rect = helpIconRef.current.getBoundingClientRect();
      setHelpTooltipPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX + (rect.width / 2)
      });
      setShowHelpTooltip(true);
    }
  };

  const handleHelpMouseLeave = () => {
    setShowHelpTooltip(false);
  };
  
  // ══════════════════════════════════════════════════════════════════
  // 🎯 CORE STATE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════
  
  // Excel-like cell selection state
  const [cellSelectionMode, setCellSelectionMode] = useState(false);
  
  // InvoiceLine column visibility toggle (Admin only)
  const [showInvoiceLine, setShowInvoiceLine] = useState(false);
  
  // Advanced cell selection state (from reference file)
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionMode, setSelectionMode] = useState('cell'); // 'cell' or 'column'
  const [isResizing, setIsResizing] = useState(false); // Track column resizing state
  
  // Row highlighting state - for manual Project Number click highlighting
  const [highlightedRowId, setHighlightedRowId] = useState(null);
  
  // Track active invoice numbers being worked on (for filter visibility)
  const [activeInvoiceNumbers, setActiveInvoiceNumbers] = useState(new Set());
  
  // Simple freeze panes state - like Excel with localStorage persistence
  const [frozenColumns, setFrozenColumns] = useState(() => {
    // Load from localStorage on initial mount
    try {
      const saved = localStorage.getItem('jobboard-frozen-columns');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load frozen columns from localStorage:', error);
    }
    // Default state if no saved data
    return {
      projectNumber: true, // Always frozen (like Excel A column)
      name: false,
      client: false,
      estimators: false,
      status: false,
    };
  });

  // Save frozenColumns to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('jobboard-frozen-columns', JSON.stringify(frozenColumns));
    } catch (error) {
      console.warn('Failed to save frozen columns to localStorage:', error);
    }
  }, [frozenColumns]);

  // Search state with debouncing
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Server-side search state
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tabBeforeSearch, setTabBeforeSearch] = useState(null);
  
  // Filter dropdown state - lifted to JobTable level for proper z-indexing
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [filterDropdownPosition, setFilterDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Filter content state - for the dropdown content
  const [filterStaged, setFilterStaged] = useState({});
  const [filterSearch, setFilterSearch] = useState('');
  
  // Internal zoom state management
  const [internalZoomLevel, setInternalZoomLevel] = useState(zoomLevel);
  
  // Update internal zoom when prop changes
  useEffect(() => {
    setInternalZoomLevel(zoomLevel);
  }, [zoomLevel]);
  
  // ══════════════════════════════════════════════════════════════════
  // 🔄 EFFECTS & DERIVED STATE
  // ══════════════════════════════════════════════════════════════════

  // Role-based access control
  const isEstimatorRole = user?.role === 'estimator' || user?.role === 'Estimator';
  const isAdminRole = user?.role === 'admin' || user?.role === 'Admin' || user?.role === 'administrator';
  const userEstimatorId = user?._id;

  // ── Month filtering state - using reusable MonthFilterTabs component ─────────────────
  const [activeTab, setActiveTab] = useState('all'); // Will be updated to current month on mount
  const [selectedOlderMonth, setSelectedOlderMonth] = useState(null);

  // Use the monthly hook for month data (shared with MonthFilterTabs)
  const { 
    allMonths, 
    recentMonths, 
    olderMonths, 
    getMonthById, 
    totalJobCount 
  } = useMonthGrouping(data);

  // Configuration for Last N Projects tab
  const lastNConfig = useMemo(() => ({
    enabled: true,
    limit: 30,
    label: "Most Recent"
  }), []);

  // Month tab change handler (mark as user-initiated)
  const handleMonthTabChange = useCallback((tabId) => {
    hasUserSelectedTab.current = true; // Track user selection
    setActiveTab(tabId);
    
    // ✅ CLIENT-SIDE filtering only - no backend call needed
    // The month tabs filter the already-loaded jobs array
    // onMonthFilterChange is only called if you want to fetch fresh data from server
  }, []);

  // Handle older month selection from dropdown
  const handleOlderMonthSelect = useCallback((monthId) => {
    hasUserSelectedTab.current = true; // Track user selection
    setSelectedOlderMonth(monthId);
  }, []);

  // Handle removing selected older month tab
  const handleOlderMonthRemove = useCallback(() => {
    setSelectedOlderMonth(null);
  }, []);

  // Track if user has manually changed the tab (don't reset if they have)
  const hasUserSelectedTab = useRef(false);
  const hasSetInitialTab = useRef(false);

  // Set default tab based on user role - ONLY RUN ONCE ON MOUNT
  useEffect(() => {
    // Only set default if user hasn't manually selected a tab AND we haven't set initial tab yet
    if (user?.role && !hasUserSelectedTab.current && !hasSetInitialTab.current) {
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
      hasSetInitialTab.current = true; // Mark that we've set the initial tab
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]); // ONLY depend on user.role, NOT on month data

  // Server-side search function
  const performServerSearch = useCallback(async (searchTerm, monthFilter = null) => {
    try {
      setIsSearching(true);
      console.log(`🔍 JobBoard server search: "${searchTerm}", month: ${monthFilter || 'all'}`);

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

  // Debounce search query for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Trigger server search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
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
      performServerSearch(debouncedSearchQuery, monthFilter);
    } else if (tabBeforeSearch) {
      // Restore previous tab when search is cleared
      setActiveTab(tabBeforeSearch);
      setTabBeforeSearch(null);
      setSearchResults([]);
    } else if (!debouncedSearchQuery) {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, activeTab, tabBeforeSearch, performServerSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Apply filter and close dropdown when clicking outside (Excel behavior)
      if (activeFilterColumn && !event.target.closest('.filter-dropdown-container')) {
        // Apply the staged filter before closing (like Excel)
        const column = table?.getColumn(activeFilterColumn);
        if (column && filterStaged[activeFilterColumn] !== undefined) {
          column.setFilterValue(filterStaged[activeFilterColumn]);
        }
        setActiveFilterColumn(null);
        setFilterSearch(''); // Reset search when closing
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeFilterColumn, filterStaged]);

  // Get filtered data - use server search results when searching, otherwise client-side filter
  const filteredData = useMemo(() => {
    // If actively searching, use server search results
    if (debouncedSearchQuery && debouncedSearchQuery.trim() && searchResults.length > 0) {
      let filtered = searchResults;
      
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
    
    // If searching but no results yet, show empty array
    if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
      return [];
    }
    
    // Not searching - use client-side filtering on loaded data
    let filtered = data;

    // Apply month filtering based on activeTab
    if (activeTab === 'all') {
      filtered = data;
    } else if (activeTab === 'lastN') {
      filtered = [...data]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, lastNConfig.limit);
    } else {
      const monthData = [...recentMonths, ...olderMonths].find(month => month.id === activeTab);
      filtered = monthData ? monthData.jobs : [];
    }

    return filtered;
  }, [data, debouncedSearchQuery, searchResults, activeTab, recentMonths, olderMonths, lastNConfig.limit]);

  // ══════════════════════════════════════════════════════════════════
  // 🎛️ ACTION HANDLERS
  // ══════════════════════════════════════════════════════════════════
  
  // Clear all filters (except month tab and search - acts like Excel tabs)
  const handleClearAllFilters = useCallback(() => {
    // Preserve search query - only clear header filters
    // Don't reset activeTab - month tabs should act like Excel tabs
    
    // Clear column filters (estimator filtering is now handled at data level)
    onColumnFiltersChange([]);
    
    // Clear staged filter state for all dropdowns
    setFilterStaged({});
    
    // Reset tracking flag to allow default month tab to be set again
    hasUserSelectedTab.current = false;
  }, [onColumnFiltersChange]);

  // Reset sorting
  const handleResetSorting = useCallback(() => {
    onSortingChange([]);
  }, [onSortingChange]);

  // Handle zoom level changes
  const handleZoomChange = useCallback((newZoomLevel) => {
    setInternalZoomLevel(newZoomLevel);
    onZoomChange(newZoomLevel); // Also notify parent if it wants to track zoom
  }, [onZoomChange]);

  // Handle filter dropdown opening/closing
  const handleFilterDropdown = useCallback((columnId, headerElement) => {
    if (activeFilterColumn === columnId) {
      // Close if already open
      setActiveFilterColumn(null);
    } else {
      // Open dropdown and calculate position
      const rect = headerElement.getBoundingClientRect();
      setFilterDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX
      });
      setActiveFilterColumn(columnId);
    }
  }, [activeFilterColumn]);

  // Toggle freeze for pinnable columns
  const toggleFreeze = (columnKey) => {
    setFrozenColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  // Handle save all with row highlight clearing
  const handleSaveAll = useCallback(() => {
    setHighlightedRowId(null); // Clear manual row highlighting when save is triggered
    saveAll();
  }, [saveAll]);

  // ── Excel-like Cell Selection Handlers ─────────────────────────────────────────────
  const getCellId = (rowIndex, colIndex) => `${rowIndex}-${colIndex}`;
  
  const handleCellMouseDown = useCallback((e, rowIndex, colIndex) => {
    if (isResizing || !cellSelectionMode) return; // Don't start selection if resizing or not in selection mode
    
    e.preventDefault();
    setIsSelecting(true);
    setSelectionStart({ row: rowIndex, col: colIndex });
    
    // Determine selection mode based on click location
    const isHeader = rowIndex === -1;
    if (isHeader) {
      setSelectionMode('column');
      // Select entire column
      const columnCells = new Set();
      for (let i = 0; i < filteredData.length; i++) {
        columnCells.add(getCellId(i, colIndex));
      }
      setSelectedCells(columnCells);
    } else {
      setSelectionMode('cell');
      setSelectedCells(new Set([getCellId(rowIndex, colIndex)]));
    }
  }, [filteredData, isResizing, cellSelectionMode]);

  const handleCellMouseEnter = useCallback((rowIndex, colIndex) => {
    if (!isSelecting || !selectionStart || !cellSelectionMode) return;

    if (selectionMode === 'column') {
      // Column selection mode - select entire columns in range
      const startCol = Math.min(selectionStart.col, colIndex);
      const endCol = Math.max(selectionStart.col, colIndex);
      const columnCells = new Set();
      
      for (let col = startCol; col <= endCol; col++) {
        for (let row = 0; row < filteredData.length; row++) {
          columnCells.add(getCellId(row, col));
        }
      }
      setSelectedCells(columnCells);
    } else {
      // Cell selection mode - select rectangular range
      const startRow = Math.min(selectionStart.row, rowIndex);
      const endRow = Math.max(selectionStart.row, rowIndex);
      const startCol = Math.min(selectionStart.col, colIndex);
      const endCol = Math.max(selectionStart.col, colIndex);
      
      const rangeCells = new Set();
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          rangeCells.add(getCellId(row, col));
        }
      }
      setSelectedCells(rangeCells);
    }
  }, [isSelecting, selectionStart, selectionMode, filteredData, cellSelectionMode]);

  // State to trigger auto-copy after mouse up
  const [shouldAutoCopy, setShouldAutoCopy] = useState(false);
  
  // Use ref to avoid re-creating handleMouseUp on every selection change
  const selectedCellsRef = useRef(selectedCells);
  const cellSelectionModeRef = useRef(cellSelectionMode);
  
  // Keep refs in sync
  useEffect(() => {
    selectedCellsRef.current = selectedCells;
  }, [selectedCells]);
  
  useEffect(() => {
    cellSelectionModeRef.current = cellSelectionMode;
  }, [cellSelectionMode]);
  
  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
    setSelectionStart(null);
    
    // Trigger auto-copy if we have selected cells (use ref to avoid dependency)
    if (cellSelectionModeRef.current && selectedCellsRef.current.size > 0) {
      setShouldAutoCopy(true);
    }
  }, []); // No dependencies - stable callback

  // Add global mouse up listener
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // Clear selection on escape key and add copy functionality
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedCells(new Set());
        setIsSelecting(false);
        setSelectionStart(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cellSelectionMode]);

  // Editable cell helper
  const editable = (key) => ({ row, getValue }) => {
    const rowId = row.original._id;
    const initialValue = getValue() ?? '';
    const [value, setValue] = useState(initialValue);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);

    const onBlur = () => {
      setIsEditing(false);
      if (value !== initialValue) {
        updateRow(rowId, key, value);
        
        // Track active invoice numbers for filter visibility
        if (key === 'ARTInvNumber' && value && value.trim() !== '') {
          setActiveInvoiceNumbers(prev => new Set([...prev, value.trim()]));
        }
      }
    };

    return isEditing ? (
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onBlur();
          }
        }}
        className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 input-optimized"
        autoFocus
      />
    ) : (
      <div
        className="w-full px-2 py-1 cursor-pointer hover:bg-gray-50 editable-cell-optimized stable-table-cell"
        onClick={() => setIsEditing(true)}
      >
        {value || '—'}
      </div>
    );
  };

  // Get base columns from config
  const baseColumns = useMemo(() => {
    return jobBoardColumns(
      updateRow,
      editable,
      exchangeRate,
      config,
      clients,
      estimators,
      openAssignClient,
      openAssignEstimator,
      openEstimateModal,
      openSendModal, // Pass the actual openSendModal function instead of placeholder
      user?.role,
      user?._id, // Pass current user ID for claim/unassign functionality
      // Filter dropdown state and handlers
      {
        activeFilterColumn,
        handleFilterDropdown
      },
      // Row highlighting handlers for manual click highlighting
      {
        highlightedRowId,
        setHighlightedRowId
      },
      showInvoiceLine, // Pass InvoiceLine column visibility toggle
      activeInvoiceNumbers // Pass active invoice numbers for filter visibility
    );
  }, [updateRow, editable, exchangeRate, config, clients, estimators, openSendModal, user?.role, user?._id, activeFilterColumn, handleFilterDropdown, highlightedRowId, setHighlightedRowId, showInvoiceLine, activeInvoiceNumbers]);

  // Apply freeze panes to columns (pure TanStack way - from checkpoint)
  const columns = useMemo(() => {
    const cols = [...baseColumns];
    
    return cols.map(col => {
      // Project number - always frozen (like Excel column A) - no pin button
      if (col.accessorKey === 'projectNumber') {
        return {
          ...col,
          meta: { 
            ...col.meta, 
            sticky: 'left',
            freezable: false, // No pin button - always sticky
            frozen: true,
            alwaysSticky: true // Mark as always sticky
          }
        };
      }
      
      // Name column - freezable with pin button
      if (col.accessorKey === 'name') {
        return {
          ...col,
          meta: { 
            ...col.meta, 
            sticky: frozenColumns.name ? 'left' : undefined,
            freezable: true,
            frozen: frozenColumns.name,
            onToggleFreeze: () => toggleFreeze('name')
          }
        };
      }
      
      // Client column - freezable with pin button
      if (col.id === 'clients') {
        return {
          ...col,
          meta: { 
            ...col.meta, 
            sticky: frozenColumns.client ? 'left' : undefined,
            freezable: true,
            frozen: frozenColumns.client,
            onToggleFreeze: () => toggleFreeze('client')
          }
        };
      }

      // Estimators column - freezable with pin button
      if (col.id === 'estimators') {
        return {
          ...col,
          meta: { 
            ...col.meta, 
            sticky: frozenColumns.estimators ? 'left' : undefined,
            freezable: true,
            frozen: frozenColumns.estimators,
            onToggleFreeze: () => toggleFreeze('estimators')
          }
        };
      }

      // Status column - freezable with pin button
      if (col.accessorKey === 'status') {
        return {
          ...col,
          meta: { 
            ...col.meta, 
            sticky: frozenColumns.status ? 'left' : undefined,
            freezable: true,
            frozen: frozenColumns.status,
            onToggleFreeze: () => toggleFreeze('status')
          }
        };
      }

      return col;
    });
  }, [baseColumns, frozenColumns, cellSelectionMode]);

  // TanStack table instance
  const table = useReactTable({
    data: filteredData, // Use filtered data instead of raw jobs
    columns,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableFacetedValues: true,
    getRowId: (row) => row._id, // Use project ID as row identifier
    filterFns: {
      arrIncludes: (row, columnId, filterValues) => {
        if (!Array.isArray(filterValues) || filterValues.length === 0) {
          return true;
        }
        const cellValue = row.getValue(columnId);
        if (Array.isArray(cellValue)) {
          return filterValues.some(filterValue => cellValue.includes(filterValue));
        }
        return filterValues.includes(cellValue);
      },
    },
    // State managed by parent
    state: {
      columnSizing,
      sorting,
      columnFilters,
    },
    onColumnSizingChange,
    onSortingChange,
    onColumnFiltersChange,
    meta: { 
      openColumn, 
      setOpenColumn,
      updateData: (rowIndex, columnId, value) => {
        const originalIndex = data.findIndex(job => job._id === filteredData[rowIndex]._id);
        if (originalIndex !== -1) {
          updateRow(data[originalIndex]._id, columnId, value);
        }
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Notify parent of filtered rows for admin analytics
  useEffect(() => {
    const filteredRows = table.getFilteredRowModel().rows;
    const filteredData = filteredRows.map(row => row.original);
    onFilteredRowsChange(filteredData);
  }, [table.getFilteredRowModel().rows, onFilteredRowsChange]);

  // Copy functionality for selected cells (must be after table creation)
  const handleCopy = useCallback((e) => {
    if (selectedCells.size === 0) return;

    e.preventDefault();
    
    // Convert selected cells to grid format
    const cellsArray = Array.from(selectedCells);
    const coords = cellsArray.map(cellId => {
      // Fix parsing for negative row numbers
      // Format is "row-col", but row can be negative (e.g., "-1-2")
      const lastDashIndex = cellId.lastIndexOf('-');
      const row = parseInt(cellId.substring(0, lastDashIndex));
      const col = parseInt(cellId.substring(lastDashIndex + 1));
      
      // Debug: Check if negative numbers are parsing correctly
      if (cellId.includes('-1-')) {
        console.log(`🔍 Debug header cell parsing: "${cellId}" -> row=${row}, col=${col}`);
      }
      return { row, col };
    });

    // Find bounds (including headers if row -1 is selected)
    const minRow = Math.min(...coords.map(c => c.row));
    const maxRow = Math.max(...coords.map(c => c.row));
    const minCol = Math.min(...coords.map(c => c.col));
    const maxCol = Math.max(...coords.map(c => c.col));

    // Build grid
    const grid = [];
    const visibleColumns = table.getAllColumns().filter(col => col.getIsVisible());
    
    for (let row = minRow; row <= maxRow; row++) {
      const gridRow = [];
      for (let col = minCol; col <= maxCol; col++) {
        let cellValue = '';
        
        // Check if this cell is actually selected (important for sparse selections)
        if (selectedCells.has(getCellId(row, col))) {
          
          if (row === -1) {
            // Header row - get column header text
            const columnDef = visibleColumns[col]?.columnDef;
            if (columnDef?.header) {
              if (typeof columnDef.header === 'string') {
                cellValue = columnDef.header;
              } else if (typeof columnDef.header === 'function') {
                // For function headers, try to extract meaningful text
                // Common patterns in our config:
                if (columnDef.id === 'clients') {
                  cellValue = 'Client';
                } else if (columnDef.id === 'estimators') {
                  cellValue = 'Estimator';
                } else if (columnDef.accessorKey === 'projectNumber') {
                  cellValue = 'Project #';
                } else if (columnDef.accessorKey === 'name') {
                  cellValue = 'Project Name';
                } else if (columnDef.accessorKey === 'Comments') {
                  cellValue = 'Comments';
                } else if (columnDef.accessorKey === 'received_date') {
                  cellValue = 'Received';
                } else if (columnDef.accessorKey === 'due_date') {
                  cellValue = 'Due Date';
                } else if (columnDef.accessorKey === 'completed_date') {
                  cellValue = 'Completed';
                } else if (columnDef.accessorKey === 'status') {
                  cellValue = 'Status';
                } else if (columnDef.accessorKey === 'PlanType') {
                  cellValue = 'Plan Type';
                } else if (columnDef.accessorKey === 'Qty') {
                  cellValue = 'Qty';
                } else if (columnDef.accessorKey === 'AUD') {
                  cellValue = 'Total AUD';
                } else if (columnDef.accessorKey === 'NOK') {
                  cellValue = 'Total NOK';
                } else if (columnDef.accessorKey === 'EstQty') {
                  cellValue = 'Est Qty';
                } else if (columnDef.accessorKey === 'EstPay') {
                  cellValue = 'Est Pay';
                } else if (columnDef.id === 'actions') {
                  cellValue = 'Actions';
                } else {
                  // Fallback to accessorKey or id
                  cellValue = columnDef.accessorKey || columnDef.id || '';
                }
              }
            }
          } else {
            // Data row - use table's sorted row model instead of filteredData
            const tableRows = table.getRowModel().rows;
            const rowData = tableRows[row]?.original; // Get the actual sorted row data
            const columnDef = visibleColumns[col]?.columnDef;
            
            if (columnDef && rowData) {
              // Handle special columns first
              if (columnDef.id === 'clients') {
                // Handle client names
                const clientIds = rowData.linkedClients || [];
                const clientNames = clientIds.map(id => {
                  const client = clients.find(c => c._id === id);
                  return client ? (client.company || client.name) : '';
                }).filter(Boolean);
                cellValue = clientNames.join(', ');
              } else if (columnDef.id === 'estimators') {
                // Handle estimator names (linkedEstimators is an array)
                const estimatorIds = rowData.linkedEstimators || [];
                const estimatorNames = estimatorIds.map(id => {
                  const estimator = estimators.find(e => e._id === id);
                  return estimator ? `${estimator.firstName} ${estimator.lastName}`.trim() : '';
                }).filter(Boolean);
                cellValue = estimatorNames.join(', ');
              } else if (columnDef.accessorKey) {
                // Regular accessor key
                cellValue = rowData[columnDef.accessorKey] || '';
              } else if (columnDef.accessorFn) {
                // Accessor function
                cellValue = columnDef.accessorFn(rowData) || '';
              }
            }
          }
        }
        
        gridRow.push(cellValue.toString());
      }
      grid.push(gridRow);
    }

    // Convert to TSV
    const tsvData = grid.map(row => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsvData);
  }, [selectedCells, filteredData, table, clients, estimators]);

  // Auto-copy effect - triggers when shouldAutoCopy flag is set
  useEffect(() => {
    if (shouldAutoCopy && table) {
      // Perform the copy operation using the existing handleCopy logic
      const mockEvent = { preventDefault: () => {} };
      handleCopy(mockEvent);
      setShouldAutoCopy(false);
    }
  }, [shouldAutoCopy, table, handleCopy]);

  // Add copy functionality to keyboard listener (CTRL+C for manual copy)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Use refs to avoid dependencies on frequently changing state
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && cellSelectionModeRef.current && selectedCellsRef.current.size > 0) {
        handleCopy(e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy]); // Only handleCopy dependency

  // Calculate left offset for frozen columns (Excel-style - from checkpoint)
  const getLeftOffset = (column) => {
    const headerGroup = table.getHeaderGroups()[0];
    let offset = 0;
    
    for (const header of headerGroup.headers) {
      if (header.id === column.id) break;
      // Include this column in offset if it's sticky to the left
      if (header.column.columnDef.meta?.sticky === 'left') {
        offset += header.getSize();
      }
    }
    
    return offset;
  };

  return (
    <div 
      className="flex flex-col" 
      style={{ 
        height: showInvoiceLine ? '600px' : 'calc((100vh - 160px) / var(--app-zoom))'
      }}
    >
      {/* Development Z-Index Debugger */}
      <ZIndexDebugger 
        componentName="JobTable"
        componentZIndexConfig={COMPONENT_Z_INDEX.JOB_TABLE}
      />
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 🎛️ TOP CONTROLS BAR - BEAUTIFUL STYLING */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col space-y-2 p-2 bg-gray-50 border-b">
        {/* Action Buttons Row */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200">
          {/* Left side - Action buttons */}
          <div className="flex items-center gap-3">
            {/* Clear All Filters */}
            <button
              onClick={handleClearAllFilters}
              className="flex items-center gap-2 px-2 py-1 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              title={isEstimatorRole 
                ? "Clear column filters and search (keeps your assigned projects filter)"
                : "Clear column filters and search (keeps current month tab)"
              }
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
              Clear Filters
            </button>

            {/* Reset Sorting */}
            <button
              onClick={handleResetSorting}
              className="flex items-center gap-2 px-2 py-1 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
              title="Reset all column sorting"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Reset Sorting
            </button>

            {/* Select Cells Switch - Beautiful Green Styled Switch */}
            <div className="flex items-center gap-2 px-3 py-2">
              <FormControlLabel
                control={
                  <GreenSwitch
                    checked={cellSelectionMode}
                    onChange={(event) => {
                      setCellSelectionMode(event.target.checked);
                      if (!event.target.checked) {
                        setSelectedCells(new Set()); // Clear cell selection when disabling
                      }
                    }}
                  />
                }
                label="Select Cells"
                labelPlacement="end"
                sx={{
                  margin: 0,
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#374151',
                    marginLeft: '8px', // Changed from marginRight to marginLeft for end placement
                  },
                }}
              />
            </div>

            {/* Save Invoice Button - Commits invoice changes and clears active invoice tracking */}
            {activeInvoiceNumbers.size > 0 && (
              <button
                onClick={() => setActiveInvoiceNumbers(new Set())}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Invoice ({activeInvoiceNumbers.size})
              </button>
            )}

            {/* Invoice Line Toggle - Admin Only */}
            {user?.role === "Admin" && (
              <div className="flex items-center gap-2 px-3 py-2">
                <FormControlLabel
                  control={
                    <GreenSwitch
                      checked={showInvoiceLine}
                      onChange={(event) => {
                        setShowInvoiceLine(event.target.checked);
                      }}
                    />
                  }
                  label="Invoice Line"
                  labelPlacement="end"
                  sx={{
                    margin: 0,
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#374151',
                      marginLeft: '8px',
                    },
                  }}
                />
              </div>
            )}

            {/* Selection Counter */}
            {cellSelectionMode && selectedCells.size > 0 && (
              <div className="flex items-center px-3 py-2">
                <div className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full border border-green-200 shadow-sm">
                  {selectedCells.size} cell{selectedCells.size !== 1 ? 's' : ''} selected
                </div>
              </div>
            )}

            {/* Save All Changes */}
            {pendingProjectsCount > 0 && (
              <div className="flex items-center gap-2">
                {/* Save Status */}
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                  <IconWarning size={14} />
                  <span>{pendingProjectsCount} unsaved</span>
                </div>
                
                {/* Save Button */}
                <button
                  onClick={handleSaveAll}
                  disabled={isAutoSaving}
                  className="flex items-center gap-2 px-2 py-1 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={`Save ${pendingProjectsCount} pending changes`}
                >
                  <IconSave size={16} />
                  {isAutoSaving ? 'Saving...' : 'Save All'}
                </button>
              </div>
            )}
          </div>

          {/* Right side - Role indicator only */}
          <div className="flex items-center gap-4">
            {/* Role indicator - Only show in development mode */}
            {process.env.NODE_ENV === 'development' && isEstimatorRole && !isAdminRole && (
              <div className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                Estimator View: Your Assigned Projects
              </div>
            )}
            {process.env.NODE_ENV === 'development' && isAdminRole && (
              <div className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                Admin View: All Projects
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 📅 MONTH FILTER TABS - Reusable Component */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between relative">
          <MonthFilterTabs
            projects={data} // Pass actual data for client-side mode
            activeTab={activeTab}
            onTabChange={handleMonthTabChange}
            selectedOlderMonth={selectedOlderMonth}
            onOlderMonthSelect={handleOlderMonthSelect}
            onOlderMonthRemove={handleOlderMonthRemove}
            lastNConfig={lastNConfig}
            userRole={user?.role || 'User'}
            showProjectCount={true}
            projectCount={filteredData.length}
            serverSideMode={false}
            projectIndex={projectIndex} // Pass index for accurate counts
          />
          
          <div className="flex items-center space-x-3 px-4 py-2">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="Search projects, numbers, clients..." 
                className="pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Zoom Control */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 font-medium">Zoom:</label>
              <select 
                className="text-sm border border-gray-300 h-[32px] rounded-lg px-2 py-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 align-middle leading-none"
                value={internalZoomLevel}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
              >
                <option value="50">50%</option>
                <option value="60">60%</option>
                <option value="70">70%</option>
                <option value="80">80%</option>
                <option value="90">90%</option>
                <option value="100">100%</option>
                <option value="110">110%</option>
                <option value="125">125%</option>
                <option value="150">150%</option>
              </select>
              <span 
                ref={helpIconRef}
                className="text-lg text-gray-500 cursor-help border rounded-lg border-gray-300 h-[32px] w-[32px] flex items-center justify-center"
                onMouseEnter={handleHelpMouseEnter}
                onMouseLeave={handleHelpMouseLeave}
              >
               💡
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Show loading state when searching */}
      {isSearching && (
        <div className="mx-4 mb-4 flex items-center justify-center py-6 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3 text-blue-700">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="font-medium">Searching all projects...</span>
          </div>
        </div>
      )}

      {/* Search results indicator */}
      {debouncedSearchQuery && !isSearching && searchResults.length > 0 && (
        <div className="mx-4 mb-4 text-center py-4 text-green-600 text-sm bg-green-50 rounded-lg">
          <p className="font-medium">✓ Found {searchResults.length} project{searchResults.length !== 1 ? 's' : ''} matching "{debouncedSearchQuery}"</p>
          <p className="text-xs text-gray-600 mt-1">Searched across all projects in database</p>
        </div>
      )}

      {/* No results indicator */}
      {debouncedSearchQuery && !isSearching && searchResults.length === 0 && (
        <div className="mx-4 mb-4 text-center py-4 text-gray-600 text-sm bg-gray-50 rounded-lg">
          <p className="font-medium">No projects found matching "{debouncedSearchQuery}"</p>
          <p className="text-xs text-gray-500 mt-1">Try a different search term</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 📊 TABLE CONTAINER - BEAUTIFUL GREEN STYLING WITH FREEZE PANES */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden">
        <div 
          className="w-full h-full overflow-auto custom-scrollbar"
          style={{ 
            transform: `scale(${internalZoomLevel / 100})`, 
            transformOrigin: 'top left',
            width: `${10000 / internalZoomLevel}%`,
            height: `${10000 / internalZoomLevel}%`
          }}
        >
          <table className="border-collapse border border-gray-300 min-w-full job-table-optimized job-table-critical">
            <JobTableLCPCSS />
            {/* Header with Beautiful Green Styling + Freeze Panes */}
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, colIndex) => {
                    const isSticky = header.column.columnDef.meta?.sticky === 'left';
                    const isAlwaysSticky = header.column.columnDef.meta?.alwaysSticky;
                    const leftOffset = isSticky ? getLeftOffset(header.column) : 0;
                    const meta = header.column.columnDef.meta || {};
                    const cellId = getCellId(-1, colIndex);
                    const isSelected = selectedCells.has(cellId);

                    return (
                      <th
                        key={header.id}
                        className={`
                          px-2 py-1 text-left font-medium text-sm relative transition-all duration-150 text-white sticky top-0
                          ${isSelected && cellSelectionMode ? 'cell-selected-header' : 'bg-green-600 table-header-normal'}
                          ${isSticky ? `${COMPONENT_Z_INDEX.JOB_TABLE.TABLE_HEADER} table-header-sticky` : `${Z_INDEX.STICKY_HEADER}`}
                          hover:bg-green-700 transition-colors
                          ${cellSelectionMode ? 'cursor-pointer' : ''}
                        `}
                        style={{
                          width: header.getSize(),
                          minWidth: header.getSize(),
                          left: isSticky ? `${leftOffset}px` : 'auto',
                          position: 'sticky',
                          top: 0,
                        }}
                        onMouseDown={(e) => cellSelectionMode && handleCellMouseDown(e, -1, colIndex)}
                        onMouseEnter={() => cellSelectionMode && handleCellMouseEnter(-1, colIndex)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                          
                          {/* Pin button for freezable columns (like Excel) */}
                          {meta.freezable && (
                            <button
                              onClick={meta.onToggleFreeze}
                              className="ml-2 p-1 hover:bg-green-700 rounded"
                              title={meta.frozen ? 'Unfreeze column' : 'Freeze column'}
                            >
                              {meta.frozen ? <IconUnpin size={12} /> : <IconPin size={12} />}
                            </button>
                          )}
                          
                          {/* Resize handle */}
                          {header.column.getCanResize() && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              className="absolute right-0 top-0 h-full w-1 bg-green-400 cursor-col-resize opacity-0 hover:opacity-100 transition-opacity"
                            />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            {/* Body with Alternating Row Colors + Freeze Panes */}
            <tbody>
              {table.getRowModel().rows.map((row, rowIndex) => {
                // Check if any cell in this row is selected
                const hasSelectedCell = cellSelectionMode && row.getVisibleCells().some((cell, colIndex) => 
                  selectedCells.has(getCellId(rowIndex, colIndex))
                );
                
                // Check if this row has pending changes (auto yellow highlight)
                const hasUnsavedChanges = pendingProjects.includes(row.original._id);
                
                // Check if this row is manually highlighted (Project Number clicked)
                const isManuallyHighlighted = highlightedRowId === row.id;
                
                return (
                  <tr 
                    key={row.id}
                    className={`
                      border-b border-gray-100 transition-colors
                      ${hasUnsavedChanges || isManuallyHighlighted
                        ? 'bg-yellow-200 hover:bg-yellow-300' 
                        : hasSelectedCell 
                        ? 'bg-transparent' 
                        : (rowIndex % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50')
                      }
                    `}
                  >
                  {row.getVisibleCells().map((cell, colIndex) => {
                    const isSticky = cell.column.columnDef.meta?.sticky === 'left';
                    const isAlwaysSticky = cell.column.columnDef.meta?.alwaysSticky;
                    const leftOffset = isSticky ? getLeftOffset(cell.column) : 0;
                    const cellId = getCellId(rowIndex, colIndex);
                    const isSelected = selectedCells.has(cellId);
                    const isARTInvColumn = cell.column.id === 'ARTInvNumber';
                    const allowCellSelection = cellSelectionMode && !isARTInvColumn;

                    return (
                      <td
                        key={cell.id}
                        className={`
                          px-2 py-1 text-sm transition-all duration-150
                          ${isSticky ? `sticky ${COMPONENT_Z_INDEX.JOB_TABLE.STICKY_COLUMNS}` : 
                            isSelected && allowCellSelection ? 
                              `relative ${COMPONENT_Z_INDEX.JOB_TABLE.SELECTED_CELL}` : 
                              `relative ${Z_INDEX.CONTENT}`
                          }
                          ${isSelected && allowCellSelection ? 
                            'cell-selected bg-green-100 border-2 border-green-500' : 
                            'border border-gray-200 bg-inherit'
                          }
                          ${allowCellSelection ? 'cursor-pointer hover:bg-gray-100' : ''}
                        `}
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                          left: isSticky ? `${leftOffset}px` : 'auto',
                          position: isSticky ? 'sticky' : 'relative',
                          boxShadow: isSticky && !isSelected ? '1px 0 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                        onMouseDown={(e) => allowCellSelection && handleCellMouseDown(e, rowIndex, colIndex)}
                        onMouseEnter={() => allowCellSelection && handleCellMouseEnter(rowIndex, colIndex)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty state */}
          {filteredData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No projects found</h3>
              <p className="text-gray-500">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </div>
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 🎯 FILTER DROPDOWN - RENDERED AT TOP LEVEL FOR PROPER Z-INDEX */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeFilterColumn && table && (() => {
        // Get the column and set up filter logic
        const column = table.getColumn(activeFilterColumn);
        if (!column) return null;

        // Get current filter state for this column
        const staged = filterStaged[activeFilterColumn] ?? column.getFilterValue() ?? [];
        const setStaged = (newValue) => {
          setFilterStaged(prev => ({
            ...prev,
            [activeFilterColumn]: newValue
          }));
        };

        // Compute the unique values/counts for this column
        const uniq = column.getFacetedUniqueValues();
        // Dropdown width = column width + some padding
        const dropdownWidth = column.getSize() + 50;

        return (
          <div
            className={`filter-dropdown-container fixed ${COMPONENT_Z_INDEX.JOB_TABLE.FILTER_DROPDOWN} bg-white border rounded shadow-lg p-2`}
            style={{
              top: filterDropdownPosition.top,
              left: filterDropdownPosition.left,
              minWidth: `${dropdownWidth}px`
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Clear All */}
            <button
              onClick={() => setStaged([])}
              className="mb-2 w-full text-left text-xs text-blue-600 hover:underline"
            >
              Clear All
            </button>

            {/* Select All */}
            <button
              onClick={() => {
                // Get all available options including __BLANK__ if it exists
                let allOptions = Array.from(uniq.keys());
                const isOptionalColumn = ['PlanType', 'clients', 'estimators', 'posting_date', 'due_date', 'DateCompleted', 'Comments', 'ARTInvNumber', 'InvoiceLine', 'FlashingSet'].includes(column.id);
                
                if (isOptionalColumn) {
                  // Check if __BLANK__ should be included
                  const emptyKeys = Array.from(uniq.keys()).filter(key => 
                    key === null || key === undefined || key === '' || 
                    (typeof key === 'string' && key.trim() === '') ||
                    key === '__BLANK__'
                  );
                  
                  if (emptyKeys.length > 0 || column.id.includes('date')) {
                    allOptions = allOptions.filter(key => !emptyKeys.includes(key) || key === '__BLANK__');
                    if (!allOptions.includes('__BLANK__')) {
                      allOptions.push('__BLANK__');
                    }
                  }
                }
                
                setStaged(allOptions);
              }}
              className="mb-2 w-full text-left text-xs text-green-600 hover:underline"
            >
              Select All
            </button>

            {/* Search box */}
            <input
              type="text"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="Search…"
              className="mb-2 w-full border px-2 py-1 text-sm"
            />

            {/* Options list */}
            <div className="h-32 overflow-auto">
              {(() => {
                const isAvatarColumn = ['clients', 'estimators'].includes(column.id);
                const isDateColumn = ['posting_date', 'due_date', 'DateCompleted'].includes(column.id);
                const isOptionalColumn = ['PlanType', 'clients', 'estimators', 'posting_date', 'due_date', 'DateCompleted', 'Comments', 'ARTInvNumber', 'InvoiceLine', 'FlashingSet'].includes(column.id);
                
                // Start with the raw faceted map...
                let optionsMap = uniq;
                if (isAvatarColumn) {
                  // ...but flatten any array-keys into individual string counts
                  const flatMap = new Map();
                  optionsMap.forEach((count, key) => {
                    if (Array.isArray(key)) {
                      key.forEach(item => {
                        flatMap.set(item, (flatMap.get(item) || 0) + count);
                      });
                    } else {
                      flatMap.set(key, (flatMap.get(key) || 0) + count);
                    }
                  });
                  optionsMap = flatMap;
                }
                
                // Convert to array and add blank/undefined option for relevant columns
                let optionsArray = Array.from(optionsMap.keys());
                
                // Add blank/undefined option for columns that can have empty values
                if (isOptionalColumn) {
                  // Check if there are any null/undefined/empty values in the data
                  const emptyKeys = Array.from(optionsMap.keys()).filter(key => 
                    key === null || key === undefined || key === '' || 
                    (typeof key === 'string' && key.trim() === '') ||
                    key === '__BLANK__' || // Also remove any existing __BLANK__ keys
                    (isDateColumn && (key === 'dd/mm/yyyy' || key === 'mm/dd/yyyy' || key === 'yyyy-mm-dd' || 
                     key === 'Invalid Date' || (typeof key === 'string' && key.match(/^[dmy\/\-]{8,10}$/))))
                  );
                  
                  if (emptyKeys.length > 0 || isDateColumn || isAvatarColumn) {
                    // Calculate total count of all empty values (excluding any existing __BLANK__)
                    const blankCount = emptyKeys
                      .filter(key => key !== '__BLANK__') // Don't double-count existing __BLANK__
                      .reduce((total, key) => total + (optionsMap.get(key) || 0), 0);
                    
                    // For date columns using accessorFn, we might have null values that need to be counted from the actual data
                    let actualBlankCount = blankCount;
                    if (isDateColumn && blankCount === 0) {
                      // Count null values directly from the table data for date columns
                      const tableData = table.getRowModel().rows.map(row => row.original);
                      const fieldName = column.id === 'posting_date' ? 'posting_date' : 
                                       column.id === 'due_date' ? 'due_date' : 'DateCompleted';
                      actualBlankCount = tableData.filter(row => {
                        const value = row[fieldName];
                        return value === null || value === undefined || value === '' || 
                               (typeof value === 'string' && value.trim() === '');
                      }).length;
                    }
                    
                    if (actualBlankCount > 0 || isDateColumn || isAvatarColumn) {
                      // Remove ALL empty keys from the optionsMap (including any existing __BLANK__)
                      emptyKeys.forEach(key => optionsMap.delete(key));
                      // Remove all empty keys from the array
                      optionsArray = optionsArray.filter(key => !emptyKeys.includes(key));
                      
                      // Add __BLANK__ with the actual count
                      optionsArray.push('__BLANK__');
                      optionsMap.set('__BLANK__', actualBlankCount);
                    }
                  }
                }
                
                return optionsArray
                  // Filter based on search, but handle special blank option
                  .filter(val => {
                    if (val === '__BLANK__') {
                      return 'blank'.includes(filterSearch.toLowerCase()) || 'empty'.includes(filterSearch.toLowerCase()) || filterSearch === '';
                    }
                    return val != null && val.toString().toLowerCase().includes(filterSearch.toLowerCase());
                  })
                  // Sort so that __BLANK__ always appears at the bottom
                  .sort((a, b) => {
                    if (a === '__BLANK__') return 1; // Move __BLANK__ to end
                    if (b === '__BLANK__') return -1; // Keep __BLANK__ at end
                    return 0; // Keep original order for other items
                  })
                  .map((value, index) => {
                    const isSelected = staged.includes(value);
                    const isBlankOption = value === '__BLANK__';
                    // Use a more unique key that includes the column ID to prevent duplicates across columns
                    const uniqueKey = isBlankOption ? `${column.id}_blank` : `${column.id}_${value}`;
                    
                    return (
                      <label
                        key={uniqueKey}
                        className={`flex items-center justify-between px-2 py-1 cursor-default rounded ${
                          isSelected ? 'bg-green-100 text-gray-900' : 'hover:bg-gray-200 text-gray-900'
                        }`}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {
                              const next = isSelected
                                ? staged.filter(v => v !== value)
                                : [...staged, value];
                              setStaged(next);
                            }}
                            size="small"
                            onClick={e => e.stopPropagation()}
                            sx={{
                              padding: '2px',
                              color: '#009245',
                              '&.Mui-checked': {
                                color: '#009245',
                              },
                              '&:hover': {
                                backgroundColor: 'rgba(0, 146, 69, 0.08)',
                              },
                              '& .MuiSvgIcon-root': {
                                fontSize: '1.2rem',
                              },
                            }}
                          />
                          {isBlankOption ? (
                            <span className="truncate text-gray-500 italic">(Blank/Empty)</span>
                          ) : isAvatarColumn && column.columnDef.meta?.clientsList ? (
                            (() => {
                              const client = column.columnDef.meta.clientsList.find(c => c._id === value) || {};
                              return (
                                <>
                                  <Avatar name={client.company || client.name} avatarUrl={client.avatar} size="sm" />
                                  <span className="truncate text-gray-900">{client.company || client.name}</span>
                                </>
                              );
                            })()
                          ) : isAvatarColumn && column.columnDef.meta?.estimatorsList ? (
                            (() => {
                              const estimator = column.columnDef.meta.estimatorsList.find(e => e._id === value) || {};
                              return (
                                <>
                                  <Avatar 
                                    name={`${estimator.firstName || ''} ${estimator.lastName || ''}`} 
                                    avatarUrl={estimator.avatar} 
                                    size="sm" 
                                  />
                                  <span className="truncate text-gray-900">
                                    {`${estimator.firstName || ''} ${estimator.lastName || ''}`.trim() || estimator.email}
                                  </span>
                                </>
                              );
                            })()
                          ) : (
                            <span className="truncate text-gray-900">{value}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          ({optionsMap.get(value)})
                        </span>
                      </label>
                    );
                  });
              })()}
            </div>

            {/* OK/Cancel buttons - Excel style */}
            <div className="flex justify-end mt-2 gap-2">
              <button
                onClick={() => {
                  // Cancel - revert to original filter value and close
                  setFilterStaged(prev => ({
                    ...prev,
                    [activeFilterColumn]: column.getFilterValue() ?? []
                  }));
                  setActiveFilterColumn(null);
                  setFilterSearch(''); // Reset search when closing
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // OK - apply filter and close
                  column.setFilterValue(staged);
                  setActiveFilterColumn(null);
                  setFilterSearch(''); // Reset search when closing
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        );
      })()}
      
      {/* Portal-rendered help tooltip */}
      {showHelpTooltip && createPortal(
        <div 
          className={`fixed ${COMPONENT_Z_INDEX.JOB_TABLE.HELP_TOOLTIP} p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg pointer-events-none`}
          style={{
            top: `${helpTooltipPosition.top}px`,
            left: `${helpTooltipPosition.left}px`,
            transform: 'translateX(-50%)',
            width: '300px',
            maxWidth: '300px',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            lineHeight: '1.4'
          }}
        >
          <div className="font-semibold underline mb-2">JobBoard Interactions:</div>
          <div className="space-y-1">
            <div>• Resize columns by dragging headers</div>
            <div>• Use filters to narrow results</div>
            <div>• Sort by clicking column headers</div>
            <div>• Click cell to edit</div>
            <div className="font-semibold underline mb-2">Cell Selection Mode:</div>
            <div>• Click and drag to select cells</div>
            <div>• CTRL+C to copy selection</div>
            <div className="font-semibold underline mb-2">Universal:</div>
            <div>• CTRL+S to save all changes</div>
            <div>• Click Project# to highlight row (5s)</div>


          </div>
          {/* Tooltip arrow */}
          <div 
            className="absolute bottom-full left-1/2 transform -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid rgb(17 24 39)' // gray-900
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
