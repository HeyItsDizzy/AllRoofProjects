/**
 * MONTH FILTER TABS COMPONENT - Reusable ✅
 * 
 * FEATURES:
 * ✅ Month-based filtering tabs (All, Older dropdown, Recent 3 months)
 * ✅ Optional "Last N Projects" tab (configurable)
 * ✅ Year-based hierarchical grouping in "Older" dropdown
 * ✅ Auto-collapse year expansion behavior
 * ✅ Responsive design with scroll on mobile
 * ✅ Consistent styling across ProjectTable and JobTable
 * 
 * PROPS:
 * @param {Array} projects - Array of project/job objects
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
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useMonthGrouping } from '@/appjobboard/hooks/useMonthGrouping';
import { COMPONENT_Z_INDEX } from '@/shared/styles/zIndexManager';

export default function MonthFilterTabs({
  projects = [],
  activeTab = 'all',
  onTabChange = () => {},
  selectedOlderMonth = null,
  onOlderMonthSelect = () => {},
  onOlderMonthRemove = () => {},
  lastNConfig = { enabled: false, limit: 30, label: "Most Recent" },
  userRole = "User"
}) {
  // ══════════════════════════════════════════════════════════════════
  // 🎯 DROPDOWN STATE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════
  const [showOlderDropdown, setShowOlderDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [expandedYear, setExpandedYear] = useState(null); // null means current year expanded

  // ══════════════════════════════════════════════════════════════════
  // 🗓️ MONTH GROUPING LOGIC
  // ══════════════════════════════════════════════════════════════════
  const { 
    allMonths, 
    recentMonths, 
    olderMonths, 
    getMonthById, 
    totalJobCount 
  } = useMonthGrouping(projects);

  // ══════════════════════════════════════════════════════════════════
  // 📅 YEAR-BASED GROUPING FOR OLDER DROPDOWN
  // ══════════════════════════════════════════════════════════════════
  const olderMonthsByYear = useMemo(() => {
    if (!olderMonths.length) return {};
    
    const groupedByYear = {};
    
    // Use the year property from the useMonthGrouping hook data
    olderMonths.forEach(month => {
      const year = month.year; // This comes directly from useMonthGrouping hook
      
      if (!groupedByYear[year]) {
        groupedByYear[year] = [];
      }
      groupedByYear[year].push(month);
    });
    
    // Sort years in descending order (newest first: 2025, 2024, 2023...)
    const sortedYears = Object.keys(groupedByYear)
      .map(Number)
      .sort((a, b) => b - a); // b - a = descending (2025, 2024, 2023...)
    
    const result = {};
    sortedYears.forEach(year => {
      result[year] = groupedByYear[year];
    });
    
    return result;
  }, [olderMonths]);

  // Get currently expanded year (defaults to current year, but only shows if it has older months)
  const currentYear = new Date().getFullYear();
  const getExpandedYear = () => {
    if (expandedYear !== null) return expandedYear;
    // Default to current year if it has older months, otherwise the most recent year with data
    if (olderMonthsByYear[currentYear]?.length > 0) return currentYear;
    const availableYears = Object.keys(olderMonthsByYear).map(Number);
    return availableYears.length > 0 ? Math.max(...availableYears) : currentYear;
  };

  // ══════════════════════════════════════════════════════════════════
  // 🔢 LAST N PROJECTS FILTERING (if enabled)
  // ══════════════════════════════════════════════════════════════════
  const lastNProjects = useMemo(() => {
    if (!lastNConfig.enabled || !projects.length) return [];
    
    // Sort projects by posting_date (newest first), fallback to creation date or project number
    const sortedProjects = [...projects].sort((a, b) => {
      const dateA = new Date(a.posting_date || a.createdAt || a.projectNumber || 0);
      const dateB = new Date(b.posting_date || b.createdAt || b.projectNumber || 0);
      return dateB - dateA; // Newest first
    });
    
    // Take first N projects (head operation)
    return sortedProjects.slice(0, lastNConfig.limit);
  }, [projects, lastNConfig]);

  // ══════════════════════════════════════════════════════════════════
  // 📊 TAB DATA GENERATION
  // ══════════════════════════════════════════════════════════════════
  const tabData = useMemo(() => {
    const tabs = [];

    // 1. All tab - shows all projects regardless of date
    tabs.push({
      id: 'all',
      label: 'All Projects',
      count: projects.length,
      jobs: projects
    });

    // 2. Older dropdown tab - aggregates all months older than recent 3
    // Now with year-based hierarchical grouping (only expanded year shows months)
    const olderTotalCount = olderMonths.reduce((sum, month) => sum + month.count, 0);
    const expandedYearValue = getExpandedYear();
    const expandedYearMonths = olderMonthsByYear[expandedYearValue] || [];
    
    tabs.push({
      id: 'older',
      label: 'Older',
      count: olderTotalCount,
      isDropdown: true,
      dropdownOptions: expandedYearMonths, // Only show months from expanded year
      yearGroups: olderMonthsByYear, // Full year structure for dropdown rendering
      expandedYear: expandedYearValue,
      jobs: olderMonths.flatMap(month => month.jobs)
    });

    // 3. Selected older month as separate tab (when user clicks from dropdown)
    // This creates a temporary tab next to "Older" with close button
    if (selectedOlderMonth) {
      const selectedMonth = getMonthById(selectedOlderMonth);
      if (selectedMonth) {
        tabs.push({
          ...selectedMonth,
          isSelectedOlder: true // Flag to show close button
        });
      }
    }

    // 4. Recent 3 months in chronological order (2 months ago → last month → current month)
    // Reversed because useMonthGrouping returns newest first
    const orderedRecentMonths = [...recentMonths].reverse(); // Reverse to get oldest to newest
    orderedRecentMonths.forEach(month => {
      tabs.push(month);
    });

    // 5. Last N Projects tab - shows most recent N projects (if enabled)
    // Placed at the end for easy access to recent work across all months
    if (lastNConfig.enabled) {
      tabs.push({
        id: 'lastN',
        label: lastNConfig.label,
        count: lastNProjects.length,
        jobs: lastNProjects
      });
    }

    return tabs;
  }, [projects, lastNProjects, lastNConfig, recentMonths, olderMonths, selectedOlderMonth, getMonthById, olderMonthsByYear, expandedYear]);

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
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
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

      {/* Year-Based Hierarchical Dropdown Menu */}
      {showOlderDropdown && (
        <div 
          className={`fixed bg-white border border-gray-200 rounded-lg shadow-xl ${COMPONENT_Z_INDEX.JOB_TABLE.OLDER_DROPDOWN} min-w-[250px] overflow-y-auto pointer-events-auto md:max-h-none max-h-[80vh]`}
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
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        parseInt(year) === expandedYearValue
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {months.reduce((sum, month) => sum + month.count, 0)}
                      </span>
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
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      selectedOlderMonth === month.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {month.count}
                    </span>
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>
      )}
    </>
  );
}

// Export helper function to get filtered data based on active tab
export const getFilteredDataByTab = (tabData, activeTab, projects) => {
  const currentTab = tabData.find(tab => tab.id === activeTab);
  if (!currentTab) return projects;
  
  return currentTab.id === 'all' ? projects : currentTab.jobs || [];
};