import React, { useState, useMemo, useContext, useCallback, useEffect } from 'react';
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
}) {
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  
  // ══════════════════════════════════════════════════════════════════
  // 🎯 AUTO-SAVE FUNCTIONALITY
  // ══════════════════════════════════════════════════════════════════
  
  // Local data state for inline edits and live updates
  const [data, setData] = useState(jobs);
  
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
      await axiosSecure.patch(`/projects/update/${projectId}`, changes);
      return true;
    } catch (error) {
      console.error('Failed to save project:', error);
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
  
  // ══════════════════════════════════════════════════════════════════
  // 🎯 CORE STATE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════
  
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
  
  // Debounce search query for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Role-based access control
  const isEstimatorRole = user?.role === 'estimator' || user?.role === 'Estimator';
  const isAdminRole = user?.role === 'admin' || user?.role === 'Admin' || user?.role === 'administrator';
  const userEstimatorId = user?._id;

  // ── Month filtering state - KISS & DRY with hook ─────────────────
  const [activeTab, setActiveTab] = useState('all'); // Start with 'all', will be updated to current month
  const [selectedOlderMonth, setSelectedOlderMonth] = useState(null);
  const [showOlderDropdown, setShowOlderDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showOlderDropdown && !event.target.closest('.dropdown-container')) {
        setShowOlderDropdown(false);
      }
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
  }, [showOlderDropdown, activeFilterColumn, filterStaged]);

  // Handle dropdown positioning like a navigation menu
  const handleDropdownToggle = (event) => {
    if (!showOlderDropdown) {
      const rect = event.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX
      });
    }
    setShowOlderDropdown(!showOlderDropdown);
  };

  // Use the monthly hook for clean month organization
  const { 
    allMonths, 
    recentMonths, 
    olderMonths, 
    getMonthById, 
    totalJobCount 
  } = useMonthGrouping(data);

  // Generate clean tab structure using hook data
  const tabData = useMemo(() => {
    const tabs = [];

    // 1. All tab
    tabs.push({
      id: 'all',
      label: 'All',
      count: totalJobCount,
      jobs: jobs // Use original jobs array (already sorted by parent)
    });

    // 2. Older dropdown tab
    const olderTotalCount = olderMonths.reduce((sum, month) => sum + month.count, 0);
    tabs.push({
      id: 'older',
      label: 'Older',
      count: olderTotalCount,
      isDropdown: true,
      dropdownOptions: olderMonths,
      jobs: olderMonths.flatMap(month => month.jobs)
    });

    // 3. Add selected older month as separate tab if selected (next to Older)
    if (selectedOlderMonth) {
      const selectedMonthData = getMonthById(selectedOlderMonth);
      if (selectedMonthData) {
        tabs.push({
          id: selectedOlderMonth,
          label: selectedOlderMonth,
          count: selectedMonthData.count,
          jobs: selectedMonthData.jobs,
          isSelectedOlder: true
        });
      }
    }

    // 4. Recent 3 months in correct order: 2 months ago, last month, this month
    const orderedRecentMonths = [...recentMonths].reverse(); // Reverse to get oldest to newest
    orderedRecentMonths.forEach(month => {
      tabs.push({
        id: month.id,
        label: month.label,
        count: month.count,
        jobs: month.jobs
      });
    });

    return tabs;
  }, [data, totalJobCount, olderMonths, recentMonths, selectedOlderMonth, getMonthById]);

  // Set default tab to current month when data loads initially
  useEffect(() => {
    // Only set default tab if no tab is currently active (initial load)
    if (activeTab === 'all' && recentMonths.length > 0) {
      // Current month is the first in recentMonths (newest first from hook)
      const currentMonthTab = recentMonths[0];
      if (currentMonthTab && currentMonthTab.count > 0) {
        setActiveTab(currentMonthTab.id);
      }
    }
  }, [recentMonths, activeTab]);

  // Get filtered data based on all filters
  const filteredData = useMemo(() => {
    // Start with jobs from the active tab
    let filtered = [];
    
    // 1. Filter by month tab using our new tab structure
    const activeTabData = tabData.find(tab => tab.id === activeTab);
    
    if (activeTabData && activeTabData.jobs) {
      filtered = [...activeTabData.jobs];
    } else {
      // Fallback - if tab not found, show all jobs
      filtered = [...data];
    }

    // 2. Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const searchableFields = [
          item.projectNumber,
          item.name,
          item.Comments,
          item.status,
          item.PlanType,
          item.FlashingSet,
          item.InvoiceLine,
          item.ARTInvNumber,
          item.location?.state,
          item.location?.city,
          item.clientName,
          item.clientAddress,
          item.estimatorName,
          item.notes,
          item.followUpNotes,
          item.leadSource
        ];

        return searchableFields.some(field => 
          field?.toString().toLowerCase().includes(query)
        );
      });
    }

    // 3. Role-based filtering is now handled at the data source level in JobBoard.jsx

    return filtered;
  }, [tabData, activeTab, data, debouncedSearchQuery]);

  // ══════════════════════════════════════════════════════════════════
  // 🎛️ ACTION HANDLERS
  // ══════════════════════════════════════════════════════════════════
  
  // Clear all filters (except month tab - acts like Excel tabs)
  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('');
    // Don't reset activeTab - month tabs should act like Excel tabs
    
    // Clear column filters (estimator filtering is now handled at data level)
    onColumnFiltersChange([]);
    
    // Clear staged filter state for all dropdowns
    setFilterStaged({});
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
        className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
      />
    ) : (
      <div
        className="w-full px-2 py-1 cursor-pointer hover:bg-gray-50"
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
      () => {}, // openSendModal placeholder
      user?.role,
      user?._id, // Pass current user ID for claim/unassign functionality
      // Filter dropdown state and handlers
      {
        activeFilterColumn,
        handleFilterDropdown
      }
    );
  }, [updateRow, editable, exchangeRate, config, clients, estimators, user?.role, user?._id, activeFilterColumn, handleFilterDropdown]);

  // Apply freeze panes to columns (pure TanStack way - from checkpoint)
  const columns = useMemo(() => {
    return baseColumns.map(col => {
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

      return col;
    });
  }, [baseColumns, frozenColumns]);

  // TanStack table instance
  const table = useReactTable({
    data: filteredData, // Use filtered data instead of raw jobs
    columns,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableFacetedValues: true,
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
    <div className="flex flex-col h-full">
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
                  onClick={saveAll}
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

          {/* Right side - Project count and role indicator */}
          <div className="flex items-center gap-4">
            {/* Project count */}
            <div className="text-sm text-gray-600 whitespace-nowrap">
              <strong>{filteredData.length} projects</strong>
              {activeTab !== 'all' && (
                <span className="ml-1 text-blue-600">({tabData.find(t => t.id === activeTab)?.label})</span>
              )}
            </div>

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
        {/* 📅 MONTH FILTER TABS - PRODUCTION STYLING */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between relative">
          <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
            {tabData.map(tab => (
              <div key={tab.id} className="relative">
                {tab.isDropdown ? (
                  // Dropdown for "Older" tab
                  <div className="relative dropdown-container">
                    <button
                      onClick={handleDropdownToggle}
                      className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center ${
                        activeTab === tab.id || tab.dropdownOptions?.some(opt => opt.id === activeTab)
                          ? 'border-blue-500 text-blue-600 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                      <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                        activeTab === tab.id || tab.dropdownOptions?.some(opt => opt.id === activeTab)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                      <svg className={`ml-1 w-3 h-3 transition-transform ${showOlderDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  // Regular tab (including selected older month tabs)
                  <div className="relative">
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } ${
                        tab.isSelectedOlder 
                          ? 'pr-8' 
                          : ''
                      }`}
                    >
                      {tab.label}
                      <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                        activeTab === tab.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                    {tab.isSelectedOlder && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOlderMonth(null);
                          setActiveTab('all');
                        }}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 w-4 h-4 flex items-center justify-center z-10"
                        title="Remove this month tab"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
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
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 📊 TABLE CONTAINER - BEAUTIFUL GREEN STYLING WITH FREEZE PANES */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden">
        <div 
          className="w-full h-full overflow-auto"
          style={{ 
            transform: `scale(${internalZoomLevel / 100})`, 
            transformOrigin: 'top left',
            width: `${10000 / internalZoomLevel}%`,
            height: `${10000 / internalZoomLevel}%`
          }}
        >
          <table className="border-collapse border border-gray-300 min-w-full">
            {/* Header with Beautiful Green Styling + Freeze Panes */}
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSticky = header.column.columnDef.meta?.sticky === 'left';
                    const isAlwaysSticky = header.column.columnDef.meta?.alwaysSticky;
                    const leftOffset = isSticky ? getLeftOffset(header.column) : 0;
                    const meta = header.column.columnDef.meta || {};

                    return (
                      <th
                        key={header.id}
                        className={`
                          border border-green-500 px-2 py-1 text-left font-medium text-sm relative
                          bg-green-600 text-white sticky top-0
                          ${isSticky ? 'sticky z-[70]' : 'z-20'}
                          hover:bg-green-700 transition-colors
                        `}
                        style={{
                          width: header.getSize(),
                          minWidth: header.getSize(),
                          left: isSticky ? `${leftOffset}px` : 'auto',
                          position: 'sticky',
                          top: 0,
                          boxShadow: isSticky ? '1px 0 3px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        }}
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
              {table.getRowModel().rows.map((row, index) => (
                <tr 
                  key={row.id}
                  className={`
                    border-b border-gray-100 hover:bg-blue-50 transition-colors
                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  `}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isSticky = cell.column.columnDef.meta?.sticky === 'left';
                    const isAlwaysSticky = cell.column.columnDef.meta?.alwaysSticky;
                    const leftOffset = isSticky ? getLeftOffset(cell.column) : 0;

                    return (
                      <td
                        key={cell.id}
                        className={`
                          border border-gray-200 px-2 py-1 text-sm
                          ${isSticky ? 'sticky z-[50] bg-inherit' : 'relative z-10'}
                        `}
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                          left: isSticky ? `${leftOffset}px` : 'auto',
                          position: isSticky ? 'sticky' : 'relative',
                          boxShadow: isSticky ? '1px 0 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))}
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
      
      {/* Portal-style Dropdown Menu - Like Navigation Dropdown */}
      {showOlderDropdown && (
        <div 
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-200 min-w-[200px] max-h-[400px] overflow-y-auto pointer-events-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {tabData.find(tab => tab.isDropdown)?.dropdownOptions?.map((option, index) => (
            <div
              key={option.id}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                setSelectedOlderMonth(option.id);
                setActiveTab(option.id);
                setShowOlderDropdown(false);
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between transition-colors pointer-events-auto cursor-pointer ${
                selectedOlderMonth === option.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              } ${index === 0 ? 'rounded-t-lg' : ''} ${index === tabData.find(tab => tab.isDropdown)?.dropdownOptions?.length - 1 ? 'rounded-b-lg' : ''}`}
              style={{ zIndex: 99999, position: 'relative' }}
            >
              <span className="font-medium">{option.label}</span>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                selectedOlderMonth === option.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {option.count}
              </span>
            </div>
          ))}
        </div>
      )}
      
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
            className="filter-dropdown-container fixed z-[240] bg-white border rounded shadow-lg p-2"
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
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const next = isSelected
                                ? staged.filter(v => v !== value)
                                : [...staged, value];
                              setStaged(next);
                            }}
                            className="form-checkbox h-4 w-4 text-green-600"
                            onClick={e => e.stopPropagation()}
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
    </div>
  );
}
