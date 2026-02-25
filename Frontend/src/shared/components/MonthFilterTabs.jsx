/**
 * MONTH FILTER TABS COMPONENT - Server-Side Pagination Compatible ✅
 * 
 * FEATURES:
 * ✅ Month-based filtering tabs (All, Older dropdown, Recent 3 months)
 * ✅ Optional "Last N Projects" tab (configurable)
 * ✅ Server-side pagination compatible (uses optimized hook)
 * ✅ Year-based hierarchical grouping in "Older" dropdown
 * ✅ Auto-collapse year expansion behavior
 * ✅ Responsive design with scroll on mobile
 * ✅ Consistent styling across ProjectTable and JobTable
 * 
 * PROPS:
 * @param {Array} projects - Project data for month grouping (can be empty for server-side)
 * @param {String} activeTab - Currently active tab ID
 * @param {Function} onTabChange - Callback when tab is clicked
 * @param {String|null} selectedOlderMonth - Selected older month ID
 * @param {Function} onOlderMonthSelect - Callback when older month is selected
 * @param {Function} onOlderMonthRemove - Callback to remove older month tab
 * @param {Object} lastNConfig - Configuration for "Last N Projects" tab
 * @param {Boolean} lastNConfig.enabled - Whether to show the Last N tab
 * @param {Number} lastNConfig.limit - Number of projects for Last N (default: 30)
 * @param {String} lastNConfig.label - Custom label for Last N tab (default: "Most Recent")
 * @param {String} userRole - User role for default tab selection
 * @param {Boolean} showProjectCount - Whether to show project count
 * @param {Number} projectCount - Current project count from pagination
 * @param {Boolean} serverSideMode - Whether to use server-side pagination mode (default: auto-detect)
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMonthGrouping } from '../../appjobboard/hooks/useMonthGrouping';
import { COMPONENT_Z_INDEX } from '../styles/zIndexManager';

export default function MonthFilterTabs({
  projects = [],
  activeTab = 'all',
  onTabChange = () => {},
  selectedOlderMonth = null,
  onOlderMonthSelect = () => {},
  onOlderMonthRemove = () => {},
  lastNConfig = { enabled: false, limit: 30, label: "Most Recent" },
  userRole = "User",
  showProjectCount = false,
  projectCount = 0,
  serverSideMode = null, // Auto-detect based on whether projects is empty
  projectIndex = null // Optional: lightweight index for accurate counts with pagination
}) {
  // ══════════════════════════════════════════════════════════════════
  // 🎯 DROPDOWN STATE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════
  const [showOlderDropdown, setShowOlderDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [expandedYear, setExpandedYear] = useState(null);

  // ══════════════════════════════════════════════════════════════════
  // 🎯 MONTH DATA GENERATION - Optimized for Server-Side Pagination
  // ══════════════════════════════════════════════════════════════════

  // Auto-detect server-side mode based on projects prop
  const isServerSideMode = serverSideMode !== null ? serverSideMode : projects.length === 0;

  // Use project index for accurate counts if available, otherwise use loaded projects
  const dataForCounting = projectIndex && projectIndex.length > 0 ? projectIndex : projects;

  // Use month grouping hook - optimized for different modes
  const { 
    allMonths, 
    recentMonths: hookRecentMonths, 
    olderMonths: hookOlderMonths, 
    getMonthById 
  } = useMonthGrouping(isServerSideMode ? [] : dataForCounting);

  // Generate static months for server-side mode (when projects is empty)
  const staticMonthData = useMemo(() => {
    if (!isServerSideMode) return null;

    const currentDate = new Date();
    const recentMonths = [];
    
    // Generate recent 3 months
    for (let i = 0; i < 3; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      
      const shortYear = String(date.getFullYear()).slice(-2);
      const monthNum = String(date.getMonth() + 1).padStart(2, '0');
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const monthId = `${shortYear}-${monthNum} ${monthName}`;
      
      recentMonths.push({
        id: monthId,
        label: monthId,
        year: date.getFullYear(),
        month: date.getMonth(),
        count: 0, // Server-side mode doesn't show counts
        jobs: []
      });
    }

    // Generate older months (previous 24 months)
    const olderMonths = [];
    for (let i = 3; i < 27; i++) { // 3 to 26 = 24 older months
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      
      const shortYear = String(date.getFullYear()).slice(-2);
      const monthNum = String(date.getMonth() + 1).padStart(2, '0');
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const monthId = `${shortYear}-${monthNum} ${monthName}`;
      
      olderMonths.push({
        id: monthId,
        label: monthId,
        year: date.getFullYear(),
        month: date.getMonth(),
        count: 0,
        jobs: []
      });
    }

    return { recentMonths, olderMonths };
  }, [isServerSideMode]);

  // Use either hook data or static data based on mode
  const recentMonths = isServerSideMode ? (staticMonthData?.recentMonths || []) : hookRecentMonths;
  const olderMonths = isServerSideMode ? (staticMonthData?.olderMonths || []) : hookOlderMonths;

  // Generate older months grouped by year for dropdown
  const olderMonthsByYear = useMemo(() => {
    const groupedByYear = {};
    
    olderMonths.forEach(month => {
      const year = month.year;
      if (!groupedByYear[year]) {
        groupedByYear[year] = [];
      }
      groupedByYear[year].push(month);
    });
    
    return groupedByYear;
  }, [olderMonths]);

  // Get currently expanded year
  const currentYear = new Date().getFullYear();
  const getExpandedYear = () => {
    if (expandedYear !== null) return expandedYear;
    // Default to current year if it has older months, otherwise the most recent year with data
    if (olderMonthsByYear[currentYear]?.length > 0) return currentYear;
    const availableYears = Object.keys(olderMonthsByYear).map(Number);
    return availableYears.length > 0 ? Math.max(...availableYears) : currentYear;
  };

  // ══════════════════════════════════════════════════════════════════
  // � TAB DATA GENERATION - STATIC (NO DATA DEPENDENCY)
  // ══════════════════════════════════════════════════════════════════
  const tabData = useMemo(() => {
    const tabs = [];

    // 1. All tab - shows all projects regardless of date
    tabs.push({
      id: 'all',
      label: 'All Projects',
      isAll: true,
      count: isServerSideMode ? projectCount : (allMonths.reduce((sum, m) => sum + m.count, 0) || 0)
    });

    // 2. Older dropdown tab - with total count of older months
    const expandedYearValue = getExpandedYear();
    const expandedYearMonths = olderMonthsByYear[expandedYearValue] || [];
    const olderTotalCount = isServerSideMode ? 0 : olderMonths.reduce((sum, m) => sum + m.count, 0);
    
    tabs.push({
      id: 'older',
      label: 'Older',
      isDropdown: true,
      dropdownOptions: expandedYearMonths,
      yearGroups: olderMonthsByYear,
      expandedYear: expandedYearValue,
      count: olderTotalCount
    });

    // 3. Recent 3 months in chronological order (oldest to newest: 2 months ago → last month → current month)
    [...recentMonths].reverse().forEach(month => {
      tabs.push({
        ...month,
        count: isServerSideMode ? 0 : (month.count || 0) // Keep 0 for server-side, will show if showProjectCount is true
      });
    });

    // 4. Last N Projects tab - shows most recent N projects (if enabled)
    if (lastNConfig.enabled) {
      const lastNCount = isServerSideMode ? projectCount : Math.min(lastNConfig.limit, (allMonths.reduce((sum, m) => sum + m.count, 0) || 0));
      tabs.push({
        id: 'lastN',
        label: lastNConfig.label,
        isLastN: true,
        limit: lastNConfig.limit,
        count: lastNCount
      });
    }

    // 5. Selected older month as separate tab (when user clicks from dropdown) - AFTER Most Recent
    if (selectedOlderMonth) {
      // Find the selected month in our hook data
      const selectedMonth = [...recentMonths, ...olderMonths].find(month => month.id === selectedOlderMonth);
      if (selectedMonth) {
        tabs.push({
          ...selectedMonth,
          isSelectedOlder: true // Flag to show close button
        });
      }
    }

    return tabs;
  }, [recentMonths, olderMonths, allMonths, olderMonthsByYear, selectedOlderMonth, lastNConfig, getExpandedYear, isServerSideMode, projectCount]);

  // ══════════════════════════════════════════════════════════════════
  // 🎛️ EVENT HANDLERS
  // ══════════════════════════════════════════════════════════════════

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showOlderDropdown && !event.target.closest('.dropdown-container')) {
        setShowOlderDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOlderDropdown]);

  // Position dropdown menu relative to "Older" button
  const handleDropdownToggle = (event) => {
    if (!showOlderDropdown) {
      const rect = event.target.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
    setShowOlderDropdown(!showOlderDropdown);
  };

  // Handle tab clicks
  const handleTabClick = useCallback((tabId) => {
    console.log(`🎯 Tab clicked: ${tabId}`);
    onTabChange(tabId);
  }, [onTabChange]);

  // Handle older month selection from dropdown
  const handleOlderMonthClick = useCallback((monthId) => {
    onOlderMonthSelect(monthId);
    onTabChange(monthId);
    setShowOlderDropdown(false);
  }, [onOlderMonthSelect, onTabChange]);

  // Handle removing selected older month tab
  const handleRemoveOlderMonth = useCallback(() => {
    onOlderMonthRemove();
    onTabChange('all');
  }, [onOlderMonthRemove, onTabChange]);

  // ══════════════════════════════════════════════════════════════════
  // 🎨 COMPONENT RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <>
      {/* Month Filter Tabs */}
      <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 p-2 bg-gray-50">
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
                  {(tab.count !== undefined && (
                    tab.count > 0 || 
                    (isServerSideMode && showProjectCount && (tab.isAll || tab.isLastN))
                  )) && (
                    <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id || tab.dropdownOptions?.some(opt => opt.id === activeTab)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                  <svg className={`ml-1 w-3 h-3 transition-transform ${showOlderDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ) : (
              // Regular tab (including selected older month tabs)
              <div className="relative">
                <button
                  onClick={() => handleTabClick(tab.id)}
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
                  {(tab.count !== undefined && (
                    tab.count > 0 || 
                    (isServerSideMode && showProjectCount && (tab.isAll || tab.isLastN))
                  )) && (
                    <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
                {/* Close button for selected older month tabs */}
                {tab.isSelectedOlder && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveOlderMonth();
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

      {/* Year-Based Hierarchical Dropdown Menu - Rendered via Portal */}
      {showOlderDropdown && createPortal(
        <div 
          className={`fixed bg-white border border-gray-200 rounded-lg shadow-xl ${COMPONENT_Z_INDEX.JOB_TABLE.OLDER_DROPDOWN} min-w-[250px] min-h-[300px] overflow-y-auto pointer-events-auto md:max-h-none max-h-[80vh]`}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {(() => {
            const olderTab = tabData.find(tab => tab.isDropdown);
            if (!olderTab?.yearGroups) return null;
            
            const yearGroups = olderTab.yearGroups;
            const expandedYearValue = olderTab.expandedYear;
            
            return Object.entries(yearGroups)
              .sort(([yearA], [yearB]) => parseInt(yearB) - parseInt(yearA)) // Ensure newest year first in display
              .map(([year, months], yearIndex) => (
              <div key={year}>
                {/* Year Header - Clickable to expand/collapse */}
                <div
                  className={`w-full text-left px-4 py-3 text-sm font-semibold border-b border-gray-100 cursor-pointer transition-colors ${
                    parseInt(year) === expandedYearValue 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                  } ${yearIndex === 0 ? 'rounded-t-lg' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Toggle year expansion (collapse if same year clicked, expand if different)
                    const newExpandedYear = parseInt(year) === expandedYearValue ? null : parseInt(year);
                    setExpandedYear(newExpandedYear);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{year}</span>
                    <div className="flex items-center gap-2">
                      {months.length > 0 && (
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          parseInt(year) === expandedYearValue
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {months.reduce((sum, month) => sum + (month.count || 0), 0)}
                        </span>
                      )}
                      <svg 
                        className={`w-4 h-4 transition-transform ${
                          parseInt(year) === expandedYearValue ? 'rotate-180' : ''
                        }`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Month Items - Only show if this year is expanded */}
                {parseInt(year) === expandedYearValue && months.map((month, monthIndex) => (
                  <div
                    key={month.id}
                    className={`w-full text-left px-6 py-2 text-sm hover:bg-gray-50 flex items-center justify-between transition-colors cursor-pointer border-l-2 ${
                      selectedOlderMonth === month.id 
                        ? 'bg-blue-50 text-blue-600 border-blue-500' 
                        : 'text-gray-700 border-transparent'
                    } ${yearIndex === Object.keys(yearGroups).length - 1 && monthIndex === months.length - 1 ? 'rounded-b-lg' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOlderMonthClick(month.id);
                    }}
                  >
                    <span className="font-medium pl-2">{month.label}</span>
                    {(month.count !== undefined && month.count > 0) && (
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        selectedOlderMonth === month.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {month.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>,
        document.body
      )}
    </>
  );
}

// Export helper function to get filtered data based on active tab (for client-side filtering)
export const getFilteredDataByTab = (activeTab, allMonths, recentMonths, olderMonths, projects, lastNConfig) => {
  if (activeTab === 'all') {
    return projects;
  } else if (activeTab === 'lastN') {
    return [...projects]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, lastNConfig.limit);
  } else {
    // Find the matching month data
    const monthData = [...recentMonths, ...olderMonths].find(month => month.id === activeTab);
    return monthData ? monthData.jobs : [];
  }
};