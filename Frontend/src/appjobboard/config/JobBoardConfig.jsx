// src/appjobboard/config/JobBoardConfig.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Avatar from "@/shared/Avatar"; 
import { calculateAUD, calculatePay, calculateNOK } from '@/shared/jobPricingUtils';
import { FilterSortHeader } from '@/appjobboard/config/ColumnConfig';
import { basePlanTypes } from '@/shared/planTypes';
import { estimateStatuses as statuses } from '@/shared/projectStatuses';
import MessageTypeSelector from '@/modals/emails/jobboard/MessageTypeSelector';
import { IconSend } from '@/shared/IconSet';
import { formatLocalDate } from "@/utils/dateUtils";
import { planTypes } from "@/shared/planPricing";
import Swal from '@/shared/swalConfig';

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
  filterDropdownHandlers = {} // Add filter dropdown handlers
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
    'InvoiceLine',    // accessorKey: 'InvoiceLine' - Hidden but in DB
    'FlashingSet',    // accessorKey: 'FlashingSet' - Hidden but in DB
    'city',           // id: 'city' - Hidden but in DB
    'profit'          // id: 'profit' - Hidden but in DB
  ];
  
  // Helper function to check if column should be shown
  const shouldShowColumn = (columnId) => {
    // Check if column is globally hidden first
    if (globalHiddenColumns.includes(columnId)) {
      return false;
    }
    
    if (userRole === "Estimator") {
      return !estimatorHiddenColumns.includes(columnId);
    }
    return true; // Show all columns for Admin and other roles (except globally hidden)
  };

  const allColumns = [

/* I want my collumns in this order
Project#, Estimator,Client,Project Name,  Comments, Received,Due Date,Completed, Status, Plan Type, Qty, Price ea, Total AUD, Total NOK,Est Qty,Est Pay,State,ART Inv#,Actions Column

these are to be Hidden but still required to be in DB and allow for calls in future implementations:
Invoice line
Flashing Set
City
Profit*/ 

  // ─── Project Number column ────
  {    accessorKey: 'projectNumber',
    header: props => <FilterSortHeader {...props} label="Project#" filterHandlers={filterDropdownHandlers} />,
    cell: editable('projectNumber'),
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
        console.log(`🔍 Avatar Debug [${row.index}] Project ${row.original.projectNumber}:`, {
          linkedEstimators: row.original.linkedEstimators,
          estimatorId: eid,
          currentUserId: currentUserId,
          estimatorFound: !!estimators.find(e => e._id === eid),
          totalEstimators: estimators.length,
          estimatorsArray: estimators.map(e => ({ id: e._id, name: `${e.firstName} ${e.lastName}` })),
          isMatch: eid === currentUserId
        });
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
  // ─── Comments column ────
  {    accessorKey: 'Comments',
    header: props => <FilterSortHeader {...props} label="Comments" filterHandlers={filterDropdownHandlers} />,
    cell: editable('Comments'),
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Date columns ────
  {    
    accessorFn: row => row.posting_date || null, // Ensure null values are explicitly returned for faceting
    id: 'posting_date',
    header: props => <FilterSortHeader {...props} label="Received" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const dateValue = row.original.posting_date; // Use row.original since we're using accessorFn
      const [value, setValue] = useState(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
      
      useEffect(() => {
        setValue(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
      }, [dateValue]);

      const handleChange = (e) => {
        const newDate = e.target.value;
        setValue(newDate);
        // Save only the date part (YYYY-MM-DD) without time
        updateRow(rowId, 'posting_date', newDate || null);
      };

      // Allow editing for both estimators and admins
      const canEdit = userRole === "Estimator" || userRole === "Admin";
      
      if (!canEdit) {
        return (
          <span className="px-3 py-1 text-sm text-gray-700">
            {value ? new Date(value).toLocaleDateString() : ''}
          </span>
        );
      }

      return (
        <input
          type="date"
          value={value}
          onChange={handleChange}
          className="px-3 py-1 w-full text-sm bg-transparent border-none outline-none focus:bg-white focus:shadow-sm"
        />
      );
    },
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {    
    accessorFn: row => row.due_date || null, // Ensure null values are explicitly returned for faceting
    id: 'due_date',
    header: props => <FilterSortHeader {...props} label="Due Date" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const dateValue = row.original.due_date; // Use row.original since we're using accessorFn
      const [value, setValue] = useState(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
      
      useEffect(() => {
        setValue(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
      }, [dateValue]);

      const handleChange = (e) => {
        const newDate = e.target.value;
        setValue(newDate);
        // Save only the date part (YYYY-MM-DD) without time
        updateRow(rowId, 'due_date', newDate || null);
      };

      // 🔒 Only admins can edit due dates, estimators get read-only view
      const canEdit = userRole === "Admin";
      
      if (!canEdit) {
        return (
          <span className="px-3 py-1 text-sm text-gray-700">
            {value ? new Date(value).toLocaleDateString() : '—'}
          </span>
        );
      }

      return (
        <input
          type="date"
          value={value}
          onChange={handleChange}
          className="px-3 py-1 w-full text-sm bg-transparent border-none outline-none focus:bg-white focus:shadow-sm"
        />
      );
    },
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {    
    accessorFn: row => row.DateCompleted || null, // Ensure null values are explicitly returned for faceting
    id: 'DateCompleted',
    header: props => <FilterSortHeader {...props} label="Completed" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const dateValue = row.original.DateCompleted; // Use row.original since we're using accessorFn
      const [value, setValue] = useState(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
      
      useEffect(() => {
        setValue(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
      }, [dateValue]);

      const handleChange = (e) => {
        const newDate = e.target.value;
        setValue(newDate);
        // Save only the date part (YYYY-MM-DD) without time
        updateRow(rowId, 'DateCompleted', newDate || null);
      };

      // ✅ Allow both estimators and admins to edit completed dates
      const canEdit = userRole === "Estimator" || userRole === "Admin";
      
      if (!canEdit) {
        return (
          <span className="px-3 py-1 text-sm text-gray-700">
            {value ? new Date(value).toLocaleDateString() : '—'}
          </span>
        );
      }

      return (
        <input
          type="date"
          value={value}
          onChange={handleChange}
          className="px-3 py-1 w-full text-sm bg-transparent border-none outline-none focus:bg-white focus:shadow-sm"
        />
      );
    },
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Status column (dropdown + autosave) ────
  {    accessorKey: 'status',
    header: props => <FilterSortHeader {...props} label="Status" filterHandlers={filterDropdownHandlers} />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const initial = getValue() ?? 'Estimate Requested';
      const [status, setStatus] = useState(initial);

      useEffect(() => {
        setStatus(getValue() ?? 'Estimate Requested');
      }, [getValue]);

      const handleChange = (e) => {
        const newStatus = e.target.value;
        setStatus(newStatus);
        
        // 🎯 Auto-status logic for estimator workflow
        if (newStatus === "Estimate Completed" && userRole === "Estimator") {
          // When estimator marks as "Estimate Completed", auto-change to "Awaiting Review"
          const finalStatus = "Awaiting Review";
          setStatus(finalStatus);
          updateRow(rowId, 'status', finalStatus);
          updateRow(rowId, 'projectStatus', "Estimate Completed");
          
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
          // Normal status change
          updateRow(rowId, 'status', newStatus);
          
          // If "Estimate Completed" is selected by admin, also update the project status
          if (newStatus === "Estimate Completed") {
            updateRow(rowId, 'projectStatus', "Estimate Completed");
          }
        }
      };

      const currentStatus = statuses.find(s => s.label === status) || {
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
            {statuses.map((s) => (
              <option key={s.label} value={s.label} className="bg-white text-black">
                {s.label}
              </option>
            ))}
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
      
      useEffect(() => { setValue(getValue() || 0) }, [getValue]);

      const handleChange = (e) => {
        const newValue = parseInt(e.target.value) || 0;
        setValue(newValue);
        updateRow(rowId, 'Qty', newValue);
      };

      if (!isAdmin) {
        return (
          <span className="px-3 py-1 text-sm text-gray-700">
            {value || 0}
          </span>
        );
      }

      return (
        <input
          type="number"
          value={value}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          min="0"
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
      
      useEffect(() => { setValue(getValue() || 0) }, [getValue]);

      const handleChange = (e) => {
        const newValue = parseInt(e.target.value) || 0;
        setValue(newValue);
        updateRow(rowId, 'EstQty', newValue);
      };

      // Show editable if:
      // 1. User is an estimator AND payment is not confirmed, OR
      // 2. User is an admin AND payment is not confirmed
      const canEdit = (isEstimator || isAdmin) && !isConfirmed;
      
      if (!canEdit) {
        return (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-sm text-gray-700 bg-gray-50 rounded">
              {value || 0}
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
          onFocus={(e) => e.target.select()}
          min="0"
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
          
          {hasEstQty > 0 && (
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
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[currentStatus]}`}>
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
    cell: info => info.getValue(),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Invoicing columns ────
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
  {    accessorKey: 'InvoiceLine',
    header: props => <FilterSortHeader {...props} label="Invoice Line" filterHandlers={filterDropdownHandlers} />,
    cell: editable('InvoiceLine'),
    filterFn: customFilterFn,
    enableSorting: true,
    enableColumnFilter: true,
  },
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
    console.log(`⚠️ ESTIMATORS ARRAY IS EMPTY - This is why avatars don't show!`, {
      estimatorsLength: estimators.length,
      currentUserId: currentUserId,
      userRole: userRole
    });
  }
  
  console.log(`📊 Total columns: ${allColumns.length}, Visible columns: ${filteredColumns.length}`);
  return filteredColumns;
};
