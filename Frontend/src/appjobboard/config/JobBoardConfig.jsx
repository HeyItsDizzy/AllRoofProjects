// src/appjobboard/config/JobBoardConfig.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Avatar from "@/shared/Avatar"; 
import DatePicker from "@/shared/DatePicker";
import { calculateAUD, calculatePay, calculateNOK, calculateSafeEstQty } from '@/shared/jobPricingUtils';
import { FilterSortHeader } from '@/appjobboard/config/ColumnConfig';
import { basePlanTypes } from '@/shared/planTypes';
import { estimateStatuses as statuses, estimateStatuses } from '@/shared/projectStatuses';
import MessageTypeSelector from '@/features/emails/modals/jobboard/MessageTypeSelector';
import { IconSend } from '@/shared/IconSet';
import { formatLocalDate } from "@/utils/dateUtils";
import { planTypes } from "@/shared/planPricing";
import Swal from '@/shared/swalConfig';
import { COMPONENT_Z_INDEX } from '@/shared/styles/zIndexManager';

// Custom filter function to handle blank/empty values
const customFilterFn = (row, columnId, filterValue) => {
  // No filter = show all
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
  
  const rowValue = row.getValue(columnId);
  
  // Check if blank filter is selected
  const hasBlankFilter = filterValue.includes('__BLANK__');
  const otherFilters = filterValue.filter(val => val !== '__BLANK__');
  
  // Check if row value is blank/empty (including empty strings and whitespace-only strings)
  const isRowValueBlank = rowValue === null || rowValue === undefined || rowValue === '' || 
    (typeof rowValue === 'string' && rowValue.trim() === '') ||
    (Array.isArray(rowValue) && rowValue.length === 0);
  
  // Special handling for date columns when "All" concept applies
  // If this is a date column and the row has undefined/null date, include it in "All" scenarios
  const isDateColumn = columnId === 'posting_date' || columnId === 'due_date' || columnId === 'completed_date';
  if (isDateColumn && isRowValueBlank) {
    // For date columns, always show undefined dates in "All" filter scenarios
    // This happens when no specific date filter is applied or when blank filter is included
    return hasBlankFilter || otherFilters.length === 0;
  }
  
  // If blank filter is selected and value is blank, include it
  if (hasBlankFilter && isRowValueBlank) {
    return true;
  }
  
  // If only blank filter is selected and value is not blank, exclude it
  if (hasBlankFilter && otherFilters.length === 0 && !isRowValueBlank) {
    return false;
  }
  
  // For array values (like clients, estimators), check if any selected filter is in the array
  if (Array.isArray(rowValue)) {
    return otherFilters.some(filterVal => rowValue.includes(filterVal));
  }
  
  // For single values, check if the value is in the filter list
  return otherFilters.includes(rowValue);
};


export const jobBoardColumns = (
  updateRow,
  editable,
  exchangeRate,
  config,
  clients,
  estimators,
  openAssignClient,
  openAssignEstimator,
  openEstimateModal,
  openSendModal,
  userRole = "Admin", // Add user role parameter
  currentUserId = null, // Add current user ID parameter
  filterDropdownHandlers = {}, // Add filter dropdown handlers
  rowHighlightHandlers = {}, // Add row highlighting handlers for manual click highlighting
  showInvoiceLine = false // Add toggle for InvoiceLine column visibility (Admin only)
) => {
  
  // Define columns that should be hidden for estimators
  const estimatorHiddenColumns = [
    // 'estimators',     // Show estimator column to estimators so they can see assignments
    'actions',        // id: 'actions' - Hide sending/message actions column
    'Comments',        // accessorKey: 'Comments'
    'Qty',            // accessorKey: 'Qty' 
    'PriceEach',      // accessorKey: 'PriceEach'
    'totalAUD',       // id: 'totalAUD'
    'totalNOK',       // id: 'totalNOK'
    'InvoiceLine',    // accessorKey: 'InvoiceLine'
    'ARTInvNumber',   // accessorKey: 'ARTInvNumber'
    'profit',         // id: 'profit'
    'city'            // id: 'city'
  ];

  // Define columns that should be completely hidden for all users
  const globalHiddenColumns = [
    'FlashingSet',    // accessorKey: 'FlashingSet' - Hidden but in DB
    'city',           // id: 'city' - Hidden but in DB
    'profit'          // id: 'profit' - Hidden but in DB
  ];

  // Define columns that should be conditionally hidden based on toggles
  const conditionallyHiddenColumns = [
    'InvoiceLine'     // accessorKey: 'InvoiceLine' - Hidden by default, toggle for Admins only
  ];
  
  // Helper function to check if column should be shown
  const shouldShowColumn = (columnId) => {
    // Check if column is globally hidden first
    if (globalHiddenColumns.includes(columnId)) {
      return false;
    }
    
    // Handle InvoiceLine column - Admin only, based on toggle
    if (columnId === 'InvoiceLine') {
      return userRole === "Admin" && showInvoiceLine;
    }
    
    if (userRole === "Estimator") {
      return !estimatorHiddenColumns.includes(columnId);
    }
    return true; // Show all columns for Admin and other roles (except globally hidden)
  };

/* I want my collumns in this order
Project#, Estimator,Client,Project Name, Status, Comments, Received,Due Date,Completed, Plan Type, Qty, Price ea, Total AUD, Total NOK,Est Qty,Est Pay,State,ART Inv#,Actions Column

these are to be Hidden but still required to be in DB and allow for calls in future implementations:
Invoice line
Flashing Set  
City
Profit */

  // Custom Project Number cell with manual highlighting + auto unsaved highlighting + inline editing
  const ProjectNumberCell = ({ row, getValue }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(getValue() || '');
    
    if (!rowHighlightHandlers) {
      // Fallback if no handlers provided - simple double-click edit only
      return (
        <div
          onDoubleClick={() => setIsEditing(true)}
          className="cursor-pointer hover:bg-blue-100 px-1 py-0.5 rounded"
          title="Double-click to edit"
        >
          {getValue() || ''}
        </div>
      );
    }
    
    const { highlightedRowId, setHighlightedRowId } = rowHighlightHandlers;
    
    // Handle single click for manual row highlighting
    const handleSingleClick = () => {
      if (!isEditing) {
        const rowId = row.id;
        const newHighlightedRowId = highlightedRowId === rowId ? null : rowId;
        setHighlightedRowId(newHighlightedRowId);
        
        // Auto-fade manual highlight after 5 seconds
        if (newHighlightedRowId) {
          setTimeout(() => {
            setHighlightedRowId(prevId => prevId === newHighlightedRowId ? null : prevId);
          }, 5000);
        }
      }
    };
    
    // Handle double click for editing
    const handleDoubleClick = () => {
      setIsEditing(true);
    };
    
    // Handle value changes and save
    const handleBlur = () => {
      setIsEditing(false);
      if (value !== getValue() && updateRow) {
        updateRow(row.original._id, 'projectNumber', value);
      }
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleBlur();
      } else if (e.key === 'Escape') {
        setValue(getValue() || '');
        setIsEditing(false);
      }
    };
    
    useEffect(() => {
      setValue(getValue() || '');
    }, [getValue]);
    
    if (isEditing) {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full px-1 py-0.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      );
    }
    
    return (
      <div
        onClick={handleSingleClick}
        onDoubleClick={handleDoubleClick}
        className="cursor-pointer hover:bg-blue-100 px-1 py-0.5 rounded"
        title="Click to highlight row (5s), double-click to edit"
      >
        {value}
      </div>
    );
  };

  const allColumns = [

/* I want my collumns in this order
Project#, Estimator,Client,Project Name, Status, Comments, Received,Due Date,Completed, Plan Type, Qty, Price ea, Total AUD, Total NOK,Est Qty,Est Pay,State,ART Inv#,Actions Column

these are to be Hidden but still required to be in DB and allow for calls in future implementations:
Flashing Set  
City
Profit */

//Invoice line - Hidden by default, toggle available for Admins only

  // ─── Project Number column ────
  {    
    accessorKey: 'projectNumber',
    header: props => <FilterSortHeader {...props} label="Project#" filterHandlers={filterDropdownHandlers} />,
    cell: ProjectNumberCell,
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Estimators column ──────────────────────────────────────
  {  id: "estimators",

    // 1) Use accessorFn so sorting/filtering works on the first estimator's name
    // Return *all* estimator names as an array so arrIncludes can filter
    accessorFn: row => row.linkedEstimators ?? [],

    // 2) Use FilterSortHeader so you still get your filter & sort UI
    header: (props) => <FilterSortHeader {...props} label="Estimator" filterHandlers={filterDropdownHandlers} />,

    // 3) cell shows avatar + name, but looks up by ID
    cell: ({ row }) => {
      const [eid] = row.original.linkedEstimators ?? [];
      const isEstimator = userRole === "Estimator";
      
      // Debug logging for estimator avatar issue (limited to first 3 projects)
      if (isEstimator && eid && row.index < 3) {
        // Limited debug logging for production troubleshooting
      }
      
      if (eid) {
        const estimator = estimators.find(e => e._id === eid) || {};
        const isAssignedToCurrentUser = isEstimator && eid === currentUserId;
        
        // For estimators
        if (isEstimator) {
          if (isAssignedToCurrentUser) {
            // Clickable avatar to unassign yourself
            return (
              <button
                onClick={async () => {
                  const result = await Swal.fire({
                    title: 'Unassign Yourself?',
                    text: 'Are you sure you want to unassign yourself from this project?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, unassign me'
                  });
                  
                  if (result.isConfirmed) {
                    // Remove current user from linkedEstimators
                    const updatedEstimators = row.original.linkedEstimators.filter(id => id !== currentUserId);
                    updateRow(row.original._id, 'linkedEstimators', updatedEstimators);
                    
                    Swal.fire({
                      title: 'Unassigned!',
                      text: 'You have been unassigned from this project.',
                      icon: 'success',
                      timer: 2000,
                      showConfirmButton: false
                    });
                  }
                }}
                className="flex items-center gap-2 px-3 h-full w-full bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Click to unassign yourself from this project"
              >
                <Avatar
                  name={`${estimator.firstName || ''} ${estimator.lastName || ''}`}
                  avatarUrl={estimator.avatar}
                  size="sm"
                />
                <span className="truncate max-w-[1000px]">
                  {`${estimator.firstName || ''} ${estimator.lastName || ''}`.trim() || estimator.email}
                </span>
              </button>
            );
          } else {
            // Read-only display for other estimators
            return (
              <div className="flex items-center gap-2 px-3 h-full w-full bg-gray-50">
                <Avatar
                  name={`${estimator.firstName || ''} ${estimator.lastName || ''}`}
                  avatarUrl={estimator.avatar}
                  size="sm"
                />
                <span className="truncate max-w-[1000px] text-gray-700">
                  {`${estimator.firstName || ''} ${estimator.lastName || ''}`.trim() || estimator.email}
                </span>
              </div>
            );
          }
        }
        
        // For admins, show clickable button
        return (
          <button
            className="flex items-center gap-2 px-3 h-full w-full bg-gray-100 hover:bg-gray-200 transition-colors"
            onClick={() => openAssignEstimator(row.original)}
          >
            <Avatar
              name={`${estimator.firstName || ''} ${estimator.lastName || ''}`}
              avatarUrl={estimator.avatar}
              size="sm"
            />
            <span className="truncate max-w-[1000px]">
              {`${estimator.firstName || ''} ${estimator.lastName || ''}`.trim() || estimator.email}
            </span>
          </button>
        );
      }
      
      // No estimator assigned
      if (isEstimator) {
        // Show "Claim" button for estimators on unassigned projects
        return (
          <button
            onClick={async () => {
              const result = await Swal.fire({
                title: 'Claim this project?',
                text: 'Are you sure you want to assign yourself to this project?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, claim it!'
              });
              
              if (result.isConfirmed) {
                // Add current user to linkedEstimators
                const updatedEstimators = [...(row.original.linkedEstimators || []), currentUserId];
                updateRow(row.original._id, 'linkedEstimators', updatedEstimators);
                
                // 🎯 Auto-set status to "Assigned" when estimator claims project
                updateRow(row.original._id, 'status', 'Assigned');
                
                Swal.fire({
                  title: 'Claimed!',
                  text: 'You have been assigned to this project and status updated to "Assigned".',
                  icon: 'success',
                  timer: 3000,
                  showConfirmButton: false
                });
              }
            }}
            className="h-full w-full px-3 bg-green-500 hover:bg-green-600 text-white transition-colors text-sm"
          >
            Claim Project
          </button>
        );
      }
      
      // For admins, show assign button
      return (
        <button
          className="h-full w-full px-3 bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          onClick={() => openAssignEstimator(row.original)}
        >
          Assign Estimator
        </button>
      );
    },

    // 4) Enable sorting & filtering using that accessorFn value
    enableSorting:      true,
    enableColumnFilter: true,
    // INLINE multi‐select filter:
    filterFn: (row, columnId, filterValue) => {
      const rowVals = row.getValue(columnId) || [];
      // no filter = show all
      if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
      // show row if any selected ID is in the row's linkedEstimators
      return filterValue.some(val => rowVals.includes(val));
    },
    size: 180,
    meta: { estimatorsList: estimators },
  },
  // ─── Clients column ──────────────────────────────────────
  {  id: "clients",

    // 1) Use accessorFn so sorting/filtering works on the first client's name
    // Return *all* client names as an array so arrIncludes can filter
    accessorFn: row => row.linkedClients ?? [],

    // 2) Use FilterSortHeader so you still get your filter & sort UI
    header: (props) => <FilterSortHeader {...props} label="Client" filterHandlers={filterDropdownHandlers} />,

    // 3) cell shows avatar + name, but looks up by ID
    cell: ({ row }) => {
      const [cid] = row.original.linkedClients ?? [];
      const isEstimator = userRole === "Estimator";
      
      if (cid) {
        const client = clients.find(c => c._id === cid) || {};
        
        if (isEstimator) {
          // Read-only display for estimators
          return (
            <div className="flex items-center gap-2 px-3 h-full w-full">
              <Avatar
                name={client.company || client.name}
                avatarUrl={client.avatar}
                size="sm"
              />
              <span className="truncate max-w-[1000px] text-gray-700">
                {client.company || client.name}
              </span>
            </div>
          );
        }
        
        return (
          <button
            className="flex items-center gap-2 px-3 h-full w-full bg-gray-100 hover:bg-gray-200 transition-colors"
            onClick={() => openAssignClient(row.original)}
          >
            <Avatar
              name={client.company || client.name}
              avatarUrl={client.avatar}
              size="sm"
            />
            <span className="truncate max-w-[1000px]">
              {client.company || client.name}
            </span>
          </button>
        );
      }
      
      if (isEstimator) {
        // Read-only "No Client" for estimators
        return (
          <div className="h-full w-full px-3 text-gray-500">
            No Client Assigned
          </div>
        );
      }
      
      return (
        <button
          className="h-full w-full px-3 bg-green-500 hover:bg-green-600 text-white transition-colors"
          onClick={() => openAssignClient(row.original)}
        >
          Assign Client
        </button>
      );
    },

    // 4) Enable sorting & filtering using that accessorFn value
    enableSorting:      true,
    enableColumnFilter:true,
    // INLINE multi‐select filter:
    filterFn: (row, columnId, filterValue) => {
      const rowVals = row.getValue(columnId) || [];
      // no filter = show all
      if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
      // show row if any selected ID is in the row’s linkedClients
      return filterValue.some(val => rowVals.includes(val));
    },
    size: 180,
    meta: { clientsList: clients },
  },
  // ─── Project Name column ────
  {    accessorKey: 'name',
    header: props => <FilterSortHeader {...props} label="Project Name" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
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
          updateRow(rowId, 'name', value);
        }
      };

      // 🔒 Only admins can edit project names, estimators get read-only view
      const canEdit = userRole === "Admin";

      if (!canEdit) {
        return (
          <div className="w-full px-2 py-1 text-sm text-gray-700">
            {value || '—'}
          </div>
        );
      }

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
    },
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
    // ─── Status column (KISS: Only use main status field) ────
  {    accessorKey: 'status',
    accessorFn: row => {
      // Show "Sent" if DateCompleted exists AND status is "Estimate Completed"
      return (row.DateCompleted && row.status === 'Estimate Completed') ? 'Sent' : (row.status || 'Estimate Requested');
    },
    header: props => <FilterSortHeader {...props} label="Status" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const mainStatus = row.original.status || 'Estimate Requested';
      // Display "Sent" if DateCompleted exists AND status is "Estimate Completed"
      const displayStatus = (row.original.DateCompleted && row.original.status === 'Estimate Completed') ? 'Sent' : mainStatus;
      const [status, setStatus] = useState(displayStatus);

      useEffect(() => {
        // Display "Sent" if DateCompleted exists AND status is "Estimate Completed"
        const currentDisplayStatus = (row.original.DateCompleted && row.original.status === 'Estimate Completed') ? 'Sent' : (row.original.status || 'Estimate Requested');
        setStatus(currentDisplayStatus);
      }, [row.original.status, row.original.DateCompleted]);

      const handleChange = (e) => {
        const newStatus = e.target.value;
        setStatus(newStatus);
        
        // 🎯 Auto-status logic for estimator workflow
        if (newStatus === "Estimate Completed" && userRole === "Estimator") {
          // When estimator marks as "Estimate Completed", auto-change to "Awaiting Review"
          const finalStatus = "Awaiting Review";
          setStatus(finalStatus);
          console.log(`🔄 Estimator auto-status change: "Estimate Completed" → "Awaiting Review" for project ${rowId}`);
          updateRow(rowId, 'status', finalStatus); // 🎯 KISS: Only update main status field
          
          // Show notification to estimator
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              title: 'Status Updated!',
              text: 'Your estimate is complete and now awaiting review by admin.',
              icon: 'success',
              timer: 3000,
              showConfirmButton: false
            });
          }
        } else {
          // Normal status change - update main status field only
          console.log(`🔄 JobBoard Status Update: Setting status to "${newStatus}" for project ${rowId}`);
          
          // Status-specific client view mapping
          if (newStatus === "Sent") {
            // "Sent" appends to estimateSent array and sets/updates DateCompleted
            const now = new Date();
            const isoTimestamp = now.toISOString();
            const dateOnly = now.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            // Get existing estimateSent array or initialize empty array
            const existingEstimateSent = row.original.estimateSent || [];
            const updatedEstimateSent = [...existingEstimateSent, isoTimestamp];
            
            console.log(`📤 "Sent" status → Appending to estimateSent: [${updatedEstimateSent.join(', ')}], DateCompleted: ${dateOnly}, keeping status as "Estimate Completed"`);
            updateRow(rowId, 'status', "Estimate Completed");
            updateRow(rowId, 'estimateSent', updatedEstimateSent);
            updateRow(rowId, 'DateCompleted', dateOnly);
          } else if (newStatus === "Estimate Completed" && userRole === "Admin") {
            // Admin manually sets "Estimate Completed" → Client sees plain "Estimate Completed" (no ART prefix)
            // Only clear DateCompleted, preserve estimateSent audit trail
            console.log(`✅ Admin "Estimate Completed" → Client sees "Estimate Completed"`);
            updateRow(rowId, 'status', "Estimate Completed");
            updateRow(rowId, 'DateCompleted', null);
          } else if (newStatus === "Cancelled") {
            // Cancelled → Client sees plain "Cancelled" (no ART prefix)
            // Only clear DateCompleted, preserve estimateSent audit trail
            console.log(`❌ "Cancelled" → Client sees "Cancelled"`);
            updateRow(rowId, 'status', "Cancelled");
            updateRow(rowId, 'DateCompleted', null);
          } else {
            // All other statuses → Client sees same status (will get "ART:" prefix in ProjectTable)
            // "In Progress", "Awaiting Review", etc.
            // Only clear DateCompleted, preserve estimateSent audit trail
            console.log(`🎯 "${newStatus}" → Client sees "ART: ${newStatus}"`);
            updateRow(rowId, 'status', newStatus);
            updateRow(rowId, 'DateCompleted', null);
          }
        }
      };

      const currentStatus = estimateStatuses.find(s => s.label === status) || {
        label: status,
        color: "bg-gray-300 text-black",
      };

      // 🔒 Lock estimator interaction when status is "Awaiting Review"
      const isAwaitingReview = status === "Awaiting Review";
      const isEstimatorLocked = userRole === "Estimator" && isAwaitingReview;
      
      // Allow both estimators and admins to edit status (but not estimators when locked)
      const canEdit = (userRole === "Estimator" && !isEstimatorLocked) || userRole === "Admin";
      
      if (!canEdit) {
        return (
          <div className="flex items-center h-full">
            <span className={`px-3 py-1 text-sm font-medium rounded-md ${currentStatus.color} ${isEstimatorLocked ? 'opacity-75' : ''}`}>
              {status}
              {isEstimatorLocked && (
                <span className="ml-1 text-xs">🔒</span>
              )}
            </span>
          </div>
        );
      }

      return (
        <div className="relative flex items-center h-full">
          {/* Colored background badge */}
          <div className={`absolute inset-0 rounded-md ${currentStatus.color} opacity-90`}></div>
          
          {/* Select dropdown */}
          <select
            className={`relative z-10 px-3 py-1 w-full text-sm border-none outline-none cursor-pointer font-medium bg-transparent ${currentStatus.color.includes('text-white') ? 'text-white' : currentStatus.color.includes('text-black') ? 'text-black' : 'text-gray-800'}`}
            value={status}
            onChange={handleChange}
            style={{
              background: 'transparent',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none'
            }}
          >
            {estimateStatuses
              .filter(s => {
                // 🚫 Hide "Sent" option from Estimators (Estimator role restriction)
                if (userRole === "Estimator" && s.label === "Sent") {
                  return false;
                }
                return true;
              })
              .map((s) => (
                <option key={s.label} value={s.label} className="bg-white text-black">
                  {s.label}
                </option>
              ))
            }
          </select>
          
          {/* Custom dropdown arrow */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none z-20">
            <svg className={`w-4 h-4 ${currentStatus.color.includes('text-white') ? 'text-white' : 'text-black'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      );
    },
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
    size: 180, // Match the width of other status columns
  },
  // ─── Comments column ────
  {    accessorKey: 'Comments',
    header: props => <FilterSortHeader {...props} label="Comments" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const initial = getValue() ?? '';
      const [comments, setComments] = useState(initial);
      const [showTooltip, setShowTooltip] = useState(false);
      const [isEditing, setIsEditing] = useState(false);
      const [isFocused, setIsFocused] = useState(false);
      const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
      const cellRef = useRef(null);

      useEffect(() => {
        if (!isFocused) {
          setComments(getValue() ?? '');
        }
      }, [getValue, isFocused]);

      const handleChange = (e) => {
        const newValue = e.target.value;
        setComments(newValue);
      };

      const handleFocus = () => {
        setIsEditing(true);
        setIsFocused(true);
        setShowTooltip(false);
      };

      const handleBlur = () => {
        setIsEditing(false);
        setIsFocused(false);
        updateRow(rowId, 'Comments', comments);
      };

      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.target.blur();
        }
      };

      const handleMouseEnter = () => {
        if (!isEditing && comments && comments.length > 30 && cellRef.current) {
          const rect = cellRef.current.getBoundingClientRect();
          setTooltipPosition({
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX + (rect.width / 2)
          });
          setShowTooltip(true);
        }
      };

      const handleMouseLeave = () => {
        setShowTooltip(false);
      };

      const truncatedText = comments && comments.length > 30 
        ? comments.substring(0, 30) + '...' 
        : comments;

      const shouldShowTooltip = comments && comments.length > 30;

      return (
        <>
          <div 
            ref={cellRef}
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <input
              type="text"
              value={comments}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1 border-none bg-transparent focus:bg-white focus:border focus:border-blue-300 focus:rounded text-sm"
              placeholder="Add comments..."
              style={{ 
                minHeight: '24px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={shouldShowTooltip ? "" : comments} // Use native tooltip for short text
            />
          </div>

          {/* Portal-rendered tooltip for long comments */}
          {showTooltip && shouldShowTooltip && !isEditing && createPortal(
            <div 
              className={`fixed ${COMPONENT_Z_INDEX.JOB_TABLE.COMMENTS_TOOLTIP} p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg pointer-events-none`}
              style={{
                top: `${tooltipPosition.top}px`,
                left: `${tooltipPosition.left}px`,
                transform: 'translateX(-50%)',
                width: '350px',
                maxWidth: '350px',
                whiteSpace: 'normal',
                wordWrap: 'break-word',
                lineHeight: '1.4'
              }}
            >
              {comments}
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
        </>
      );
    },
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
    size: 200, // Slightly wider for comments
  },
  // ─── Date columns ────
  { // Recieved   
    accessorFn: row => row.posting_date || null, // Ensure null values are explicitly returned for faceting
    id: 'posting_date',
    header: props => <FilterSortHeader {...props} label="Received" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const dateValue = row.original.posting_date;
      
      const handleDateChange = (newDate) => {
        // Save only the date part (YYYY-MM-DD) without time
        updateRow(rowId, 'posting_date', newDate || null);
      };

      // Allow editing for both estimators and admins
      const canEdit = userRole === "Estimator" || userRole === "Admin";
      
      return (
        <DatePicker
          value={dateValue}
          onChange={handleDateChange}
          readOnly={!canEdit}
        />
      );
    },
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
  },
  { // Due Date
    accessorFn: row => row.due_date || null, // Ensure null values are explicitly returned for faceting
    id: 'due_date',
    header: props => <FilterSortHeader {...props} label="Due Date" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const dateValue = row.original.due_date;
      
      const handleDateChange = (newDate) => {
        // Save only the date part (YYYY-MM-DD) without time
        updateRow(rowId, 'due_date', newDate || null);
      };

      // 🔒 Only admins can edit due dates, estimators get read-only view
      const canEdit = userRole === "Admin";
      
      return (
        <DatePicker
          value={dateValue}
          onChange={handleDateChange}
          readOnly={!canEdit}
        />
      );
    },
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
  },
  { // Completed Date
    accessorFn: row => row.DateCompleted || null, // Ensure null values are explicitly returned for faceting
    id: 'DateCompleted',
    header: props => <FilterSortHeader {...props} label="Completed" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const dateValue = row.original.DateCompleted;
      
      const handleDateChange = (newDate) => {
        // Save only the date part (YYYY-MM-DD) without time
        updateRow(rowId, 'DateCompleted', newDate || null);
      };

      // ✅ Allow both estimators and admins to edit completed dates
      const canEdit = userRole === "Estimator" || userRole === "Admin";
      
      return (
        <DatePicker
          value={dateValue}
          onChange={handleDateChange}
          readOnly={!canEdit}
        />
      );
    },
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── PlanTypes & Pricing columns ───
  {  accessorKey: 'PlanType',
    header: props => <FilterSortHeader {...props} label="Plan Type" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const [value, setValue] = useState(getValue() ?? '');
      useEffect(() => { setValue(getValue() ?? '') }, [getValue]);

      const handleChange = (e) => {
        const newValue = e.target.value;
        setValue(newValue);
        updateRow(rowId, 'PlanType', newValue);
        
        // Auto-update EstQty when changing to Manual Price
        const currentEstQty = row.original.EstQty;
        const currentQty = row.original.Qty || 0;
        const isApproved = row.original.EstPayStatus === "Confirmed";
        
        if (!isApproved && newValue === "Manual Price" && currentQty > 0) {
          // For Manual Price, calculate the price using the plan types
          const updatedRow = {...row.original, PlanType: newValue};
          const calculatedPrice = calculateAUD(updatedRow, planTypes);
          
          // Calculate safe EstQty using the calculated price
          const estQtyValue = Math.min(currentQty, calculatedPrice || 1);
          
          // Update EstQty if it's currently 0, null, undefined, or matches current Qty
          if (currentEstQty === 0 || currentEstQty === null || currentEstQty === undefined || currentEstQty === currentQty) {
            updateRow(rowId, 'EstQty', estQtyValue);
          }
        }
      };

      // Allow both estimators and admins to edit this field
      const canEdit = userRole === "Estimator" || userRole === "Admin";
      
      if (!canEdit) {
        return (
          <span className="px-3 py-1 text-sm text-gray-700">
            {value || '—'}
          </span>
        );
      }

      return (
        <select
          value={value}
          onChange={handleChange}
          className="px-3 py-1 w-full text-sm bg-transparent border-none outline-none focus:bg-white focus:shadow-sm"
        >
          <option value="">— Select —</option>
          {basePlanTypes.map(plan => (
            <option key={plan.label} value={plan.label}>
              {plan.label} {plan.uom ? `(${plan.uom})` : ''}
            </option>
          ))}
        </select>
      );
    },
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {  accessorKey: 'Qty',
    header: props => <FilterSortHeader {...props} label="Qty" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const isAdmin = userRole === "Admin";
      const initialValue = getValue() || 0;
      const [value, setValue] = useState(initialValue);
      const [isFocused, setIsFocused] = useState(false);
      
      useEffect(() => { 
        if (!isFocused) {
          setValue(getValue() || 0);
        }
      }, [getValue, isFocused]);

      const handleChange = (e) => {
        const newValue = e.target.value; // Keep as string while typing
        setValue(newValue);
      };

      const handleBlur = () => {
        setIsFocused(false);
        const numValue = parseFloat(value) || 0;
        setValue(numValue); // Normalize to number
        updateRow(rowId, 'Qty', numValue);
        
        // Auto-update EstQty if conditions are met
        const currentEstQty = row.original.EstQty;
        const currentQty = row.original.Qty;
        const isApproved = row.original.EstPayStatus === "Confirmed";
        
        // Calculate safe EstQty value (lower of Qty/PriceEach for Manual Price)
        const estQtyValue = calculateSafeEstQty(row.original, numValue);
        
        // Update EstQty only if:
        // 1. EstQty is 0, null, undefined, OR
        // 2. EstQty equals current Qty value, AND
        // 3. Project is not approved (EstPayStatus !== "Confirmed")
        if (!isApproved && 
            (currentEstQty === 0 || currentEstQty === null || currentEstQty === undefined || currentEstQty === currentQty)) {
          updateRow(rowId, 'EstQty', estQtyValue);
        }
      };

      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.target.blur();
        }
      };

      if (!isAdmin) {
        return (
          <span className="px-3 py-1 text-sm text-gray-700">
            {initialValue || 0}
          </span>
        );
      }

      return (
        <input
          type="number"
          value={value}
          onChange={handleChange}
          onFocus={(e) => {
            setIsFocused(true);
            e.target.select();
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min="0"
          step="0.5"
          className="px-3 py-1 w-full text-sm bg-transparent border-none outline-none focus:bg-white focus:shadow-sm"
        />
      );
    },
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  {  accessorKey: 'PriceEach',
    header: props => <FilterSortHeader {...props} label="Price ea" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row }) => {
      const price = calculateAUD(row.original, planTypes);
      return <span className="block text-right pr-2">{price ? `$${price}` : ''}</span>;
    },
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  {  id: 'totalAUD',
    header: props => <FilterSortHeader {...props} label="Total (AUD)" filterHandlers={filterDropdownHandlers} />,
    accessorFn: row => {
      const price = calculateAUD(row, planTypes);
      const qty = parseFloat(row.Qty || 0);
      return price && qty ? `$${(price * qty).toFixed(2)}` : '';
    },
    cell: info => info.getValue(),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  {  id: 'totalNOK',
    header: props => <FilterSortHeader {...props} label="Total (NOK)" filterHandlers={filterDropdownHandlers} />,
    accessorFn: row => {
      const nok = calculateNOK(row, planTypes);
      const qty = parseFloat(row.Qty || 0);
      return nok && qty ? `kr ${(nok * qty).toFixed(2)}` : '';
    },
    cell: info => info.getValue(),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Estimate Price/Invoicing columns ────
  {    accessorKey: 'EstQty',
    header: props => <FilterSortHeader {...props} label="Est Qty" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const isEstimator = userRole === "Estimator";
      const isAdmin = userRole === "Admin";
      const isConfirmed = row.original.EstPayStatus === "Confirmed";
      const initialValue = getValue() || 0;
      const [value, setValue] = useState(initialValue);
      const [isFocused, setIsFocused] = useState(false);
      
      useEffect(() => { 
        if (!isFocused) {
          setValue(getValue() || 0);
        }
      }, [getValue, isFocused]);

      const handleChange = (e) => {
        const newValue = e.target.value; // Keep as string while typing
        setValue(newValue);
      };

      const handleBlur = () => {
        setIsFocused(false);
        const numValue = parseFloat(value) || 0;
        setValue(numValue); // Normalize to number
        updateRow(rowId, 'EstQty', numValue);
      };

      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.target.blur();
        }
      };

      // Show editable if:
      // 1. User is an estimator AND payment is not confirmed, OR
      // 2. User is an admin AND payment is not confirmed
      const canEdit = (isEstimator || isAdmin) && !isConfirmed;
      
      if (!canEdit) {
        return (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-sm text-gray-700 bg-gray-50 rounded">
              {initialValue || 0}
            </span>
            {isConfirmed && (
              <span className="text-xs text-green-600 font-medium">🔒</span>
            )}
          </div>
        );
      }

      return (
        <input
          type="number"
          value={value}
          onChange={handleChange}
          onFocus={(e) => {
            setIsFocused(true);
            e.target.select();
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min="0"
          step="0.5"
          className="px-3 py-1 w-full text-sm bg-transparent border-none outline-none focus:bg-white focus:shadow-sm"
        />
      );
    },
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  {    id: 'estPay',
    header: props => <FilterSortHeader {...props} label="Est Pay" filterHandlers={filterDropdownHandlers} />,
    accessorFn: row => calculatePay(row),
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const payAmount = getValue();
      const currentStatus = row.original.EstPayStatus || 'Pending';
      const isAdmin = userRole === "Admin";
      const hasEstQty = row.original.EstQty > 0;
      const hasQty = row.original.Qty > 0;
      
      // Show approval controls if EstQty > 0 OR (EstQty = 0 but Qty > 0 - for free estimator work)
      const showApprovalControls = hasEstQty || (row.original.EstQty === 0 && hasQty);
      
      const statusColors = {
        'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
        'Confirmed': 'bg-green-100 text-green-800 border-green-300'
      };

      const handlePendingClick = async () => {
        const result = await Swal.fire({
          title: 'Review Estimate Payment',
          text: `Estimate amount: $${payAmount || 0}`,
          icon: 'question',
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonColor: '#10b981',
          denyButtonColor: '#ef4444',
          cancelButtonColor: '#6b7280',
          confirmButtonText: '✅ Approve',
          denyButtonText: '❌ Reject',
          cancelButtonText: 'Cancel',
          customClass: {
            actions: 'flex gap-2'
          }
        });
        
        if (result.isConfirmed) {
          // Approve - lock the EstQty
          updateRow(rowId, 'EstPayStatus', 'Confirmed');
          Swal.fire({
            title: 'Approved!',
            text: 'Estimate payment has been approved and EstQty is now locked.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        } else if (result.isDenied) {
          // Reject - keep as pending, could add a rejection reason
          Swal.fire({
            title: 'Rejected',
            text: 'Estimate payment has been rejected. EstQty remains editable.',
            icon: 'info',
            timer: 2000,
            showConfirmButton: false
          });
        }
      };
      
      return (
        <div className="flex items-center gap-2 h-8">
          <span className="text-sm font-medium">
            {payAmount ? `$${payAmount}` : '$0'}
          </span>
          
          {showApprovalControls && (
            <>
              {currentStatus === 'Pending' ? (
                <button
                  onClick={handlePendingClick}
                  className={`px-2 py-0.5 text-xs font-medium rounded-full border cursor-pointer transition-colors ${statusColors[currentStatus]}`}
                  title="Click to approve or reject estimate payment"
                >
                  ⏳ Pending
                </button>
              ) : (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap ${statusColors[currentStatus]}`}>
                  ✅ Confirmed
                </span>
              )}
              
              {currentStatus === 'Confirmed' && (
                <span className="text-xs text-green-600 font-medium">🔒</span>
              )}
            </>
          )}
        </div>
      );
    },
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Location State column ────
  {    id: 'state',
    accessorFn: row => row.location?.state || '',
    header: props => <FilterSortHeader {...props} label="State" filterHandlers={filterDropdownHandlers} />,
    cell: info => {
      const state = info.getValue();
      // Display "ACT" instead of "Australian Capital Territory" for thinner column width
      return state === 'Australian Capital Territory' ? 'ACT' : state;
    },
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Invoicing columns ────
    {    accessorKey: 'InvoiceLine',
    header: props => <FilterSortHeader {...props} label="Invoice Line" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const currentValue = getValue() || '';
      
      // Auto-generate invoice line format for QuickBooks integration
      const generateInvoiceLine = () => {
        const projectNumber = row.original.projectNumber || '';
        const projectName = row.original.name || '';
        const qty = row.original.Qty || 0;
        const planType = row.original.PlanType || '';
        const comments = row.original.Comments || '';
        
        let invoiceLine = '';
        
        // First line: [Project Number] - [Project Name] - [Qty] x [Plan Type]
        if (projectNumber || projectName || qty || planType) {
          const parts = [];
          if (projectNumber) parts.push(projectNumber);
          if (projectName) parts.push(projectName);
          if (qty && planType) parts.push(`${qty} x ${planType}`);
          
          invoiceLine = parts.join(' - ');
        }
        
        // Second line: Comments (if they exist)
        if (comments) {
          invoiceLine += invoiceLine ? `\n${comments}` : comments;
        }
        
        return invoiceLine;
      };
      
      // Auto-update invoice line when dependent fields change
      useEffect(() => {
        const newInvoiceLine = generateInvoiceLine();
        if (newInvoiceLine !== currentValue) {
          updateRow(rowId, 'InvoiceLine', newInvoiceLine);
        }
      }, [
        row.original.projectNumber,
        row.original.name,
        row.original.Qty,
        row.original.PlanType,
        row.original.Comments
      ]);
      
      // Since this column is hidden, return a minimal display
      // The actual value is still saved to backend via the useEffect above
      return (
        <span className="text-xs text-gray-400 truncate">
          {generateInvoiceLine() || 'Auto-generated'}
        </span>
      );
    },
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {    accessorKey: 'ARTInvNumber',
    header: props => <FilterSortHeader {...props} label="ART Inv#" filterHandlers={filterDropdownHandlers} />,
    cell: editable('ARTInvNumber'),
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Actions column ────
  {    id: 'actions',
    header: () => (
      <div className="flex justify-center">
        <IconSend size={20} className="text-white" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <MessageTypeSelector 
          project={row.original}
          onOpenSendModal={openSendModal}
        />
      </div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
    enableResizing: false,
    size: 60,
    minSize: 60,
    maxSize: 60,
    sticky: 'right',
  },
  // ─── Hidden columns (still require backend sync for api calls) ────
  {    accessorKey: 'FlashingSet', // ─── Flashing Set column ────
    header: props => <FilterSortHeader {...props} label="Flashing Set" filterHandlers={filterDropdownHandlers} />,
    cell: editable('FlashingSet'),
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {    id: 'city',// ─── Location City column ────
    accessorFn: row => row.location?.city || '',
    header: props => <FilterSortHeader {...props} label="City" filterHandlers={filterDropdownHandlers} />,
    cell: info => info.getValue(),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },    
  {    id: 'profit', // ─── Profit column ────
    header: props => <FilterSortHeader {...props} label="Profit" filterHandlers={filterDropdownHandlers} />,
    accessorFn: row => calculateAUD(row, planTypes) - calculatePay(row),
    cell: info => info.getValue(),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
];

  // Filter columns based on user role and global visibility
  const filteredColumns = allColumns.filter(column => {
    // Check if column has an ID or accessorKey to identify it
    const columnId = column.id || column.accessorKey;
    return shouldShowColumn(columnId);
  });

  // One-time debug for estimators array
  if (userRole === "Estimator" && estimators.length === 0) {
    // Note: Empty estimators array may affect avatar display
  }
  
  return filteredColumns;
};
