// src/appjobboard/config/JobBoardConfig.jsx
import React, { useState, useRef, useEffect } from 'react';
import Avatar from "@/shared/Avatar"; 
import { calculateAUD, calculatePay, calculateNOK } from '@/shared/jobPricingUtils';
import { FilterSortHeader } from '@/appjobboard/config/ColumnConfig';
import { formatLocalDate } from "@/utils/dateUtils";
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import { estimateStatuses as statuses } from '@/shared/projectStatuses';
import { planTypes } from "@/shared/planPricing";
import { basePlanTypes } from "@/shared/planTypes";


export const jobBoardColumns = (
  updateRow,
  editable,
  exchangeRate,
  config,
  clients,
  openAssignClient
) => [


  // ─── Project Number column ────
  {
    accessorKey: 'projectNumber',
    header: props => <FilterSortHeader {...props} label="Project#" />,
    cell: info => info.getValue(),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Name column ────
  {
    accessorKey: 'name',
    header: props => <FilterSortHeader {...props} label="Name" />,
    cell: info => info.getValue(),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
// ─── Clients column ──────────────────────────────────────
{
  id: "clients",

  // 1) Use accessorFn so sorting/filtering works on the first client's name
  // Return *all* client names as an array so arrIncludes can filter
  accessorFn: row => row.linkedClients ?? [],

  // 2) Use FilterSortHeader so you still get your filter & sort UI
  header: (props) => <FilterSortHeader {...props} label="Client" />,

  // 3) cell shows avatar + name, but looks up by ID
  cell: ({ row }) => {
    const [cid] = row.original.linkedClients ?? [];
    if (cid) {
      const client = clients.find(c => c._id === cid) || {};
      return (
        <button
          className="flex items-center gap-2 px-2 bg-gray-100 rounded"
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
    return (
      <button
        className="px-2 py-1 bg-green-500 text-white rounded"
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

  // ─── Date columns ────
  {
    accessorKey: 'posting_date',
    header: props => <FilterSortHeader {...props} label="Date Received" />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const dateValue = getValue();
      const [value, setValue] = useState(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
      
      useEffect(() => {
        setValue(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
      }, [dateValue]);

      const handleChange = (e) => {
        const newDate = e.target.value;
        setValue(newDate);
        updateRow(rowId, 'posting_date', newDate ? new Date(newDate).toISOString() : null);
      };

      return (
        <input
          type="date"
          value={value}
          onChange={handleChange}
          className="border px-2 py-1 w-full text-sm"
        />
      );
    },
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: 'due_date',
    header: props => <FilterSortHeader {...props} label="Date Due" />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const dateValue = getValue();
      const [value, setValue] = useState(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
      
      useEffect(() => {
        setValue(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
      }, [dateValue]);

      const handleChange = (e) => {
        const newDate = e.target.value;
        setValue(newDate);
        updateRow(rowId, 'due_date', newDate ? new Date(newDate).toISOString() : null);
      };

      return (
        <input
          type="date"
          value={value}
          onChange={handleChange}
          className="border px-2 py-1 w-full text-sm"
        />
      );
    },
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: 'DateCompleted',
    header: props => <FilterSortHeader {...props} label="Date Completed" />,
    cell: ({ row, getValue }) => {
      const rowId = row.original._id;
      const dateValue = getValue();
      const [value, setValue] = useState(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
      
      useEffect(() => {
        setValue(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
      }, [dateValue]);

      const handleChange = (e) => {
        const newDate = e.target.value;
        setValue(newDate);
        updateRow(rowId, 'DateCompleted', newDate ? new Date(newDate).toISOString() : null);
      };

      return (
        <input
          type="date"
          value={value}
          onChange={handleChange}
          className="border px-2 py-1 w-full text-sm"
        />
      );
    },
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Comments column ──── FIXED UP TO HERE, BELOW THIS NEEDS FIXING BEYOND THIS POINT
  {
    accessorKey: 'Comments',
    header: props => <FilterSortHeader {...props} label="Comments" />,
    cell: editable('Comments'),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Status column (dropdown + autosave) ────
  {
    accessorKey: 'status',
    header: props => <FilterSortHeader {...props} label="Status" />,
    cell: ({ row, getValue }) => {
      const axiosSecure = useAxiosSecure();
      const rowId = row.original._id;
      const initial = getValue() ?? 'Estimate Requested';
      const [status, setStatus] = useState(initial);

      useEffect(() => {
        setStatus(getValue() ?? 'Estimate Requested');
      }, [getValue]);

      const handleChange = async (e) => {
        const newStatus = e.target.value;
        setStatus(newStatus);
        updateRow(rowId, 'status', newStatus);

        // Auto-set project status if "Sent" is selected
        if (newStatus === "Sent") {
          try {
            await axiosSecure.patch(`/projects/update-status/${rowId}`, { status: "Estimate Completed" });
          } catch (err) {
            console.error("Failed to mark as Estimate Completed:", err);
          }
        } else {
          try {
            await axiosSecure.patch(`/projects/update-status/${rowId}`, { status: newStatus });
          } catch (err) {
            console.error('Failed to update status:', err);
          }
        }
      };

      const currentStatus = statuses.find(s => s.label === status) || {
        label: status,
        color: "bg-gray-300 text-black",
      };

      return (
        <select
          className={`border rounded-md px-3 py-1 cursor-pointer text-sm font-medium ${currentStatus.color}`}
          value={status}
          onChange={handleChange}
        >
          {statuses.map((s) => (
            <option key={s.label} value={s.label}>
              {s.label}
            </option>
          ))}
          
        </select>
      );
    },
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },



// ─── PlanTypes & Pricing columns ───
{
  accessorKey: 'PlanType',
  header: props => <FilterSortHeader {...props} label="Plan Type" />,
  cell: ({ row, getValue }) => {
    const rowId = row.original._id;
    const [value, setValue] = useState(getValue() ?? '');
    useEffect(() => { setValue(getValue() ?? '') }, [getValue]);

    const handleChange = (e) => {
      const newValue = e.target.value;
      setValue(newValue);
      updateRow(rowId, 'PlanType', newValue);
    };

    return (
      <select
        value={value}
        onChange={handleChange}
        className="border rounded px-2 py-1 w-full text-sm"
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
  filterFn: 'arrIncludes',
  enableSorting: true,
  enableColumnFilter: true,
},

{
  accessorKey: 'Qty',
  header: props => <FilterSortHeader {...props} label="Qty" />,
  cell: ({ row, getValue }) => {
    const rowId = row.original._id;
    const qty = getValue() || 0;
    return (
      <input
        type="number"
        min={0}
        value={qty}
        onChange={e => {
          const parsed = parseInt(e.target.value) || 0;
          updateRow(rowId, 'Qty', parsed);
        }}
        className="border px-2 py-1 w-full text-sm"
      />
    );
  },
  filterFn: 'arrIncludes',
  enableSorting: true,
  enableColumnFilter: true,
},

{
  accessorKey: 'PriceEach',
  header: props => <FilterSortHeader {...props} label="Price ea" />,
  cell: ({ row }) => {
    const price = calculateAUD(row.original, planTypes);
    return <span className="block text-right pr-2">{price ? `$${price}` : ''}</span>;
  },
  filterFn: 'arrIncludes',
  enableSorting: true,
  enableColumnFilter: true,
},

{
  id: 'totalAUD',
  header: props => <FilterSortHeader {...props} label="Total (AUD)" />,
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

{
  id: 'totalNOK',
  header: props => <FilterSortHeader {...props} label="Total (NOK)" />,
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
  // ─── Invoicing columns ────
  {
    accessorKey: 'InvoiceLine',
    header: props => <FilterSortHeader {...props} label="Invoice Line" />,
    cell: editable('InvoiceLine'),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: 'ARTInvNumber',
    header: props => <FilterSortHeader {...props} label="ART Inv#" />,
    cell: editable('ARTInvNumber'),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Flashing Set column ────
  {
    accessorKey: 'FlashingSet',
    header: props => <FilterSortHeader {...props} label="Flashing Set" />,
    cell: editable('FlashingSet'),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Estimator columns ────
  {
    accessorKey: 'Estimator',
    header: props => <FilterSortHeader {...props} label="Estimator" />,
    cell: editable('Estimator'),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: 'EstQty',
    header: props => <FilterSortHeader {...props} label="Est Qty" />,
    cell: ({ row, getValue }) => (
      <input
        type="number"
        value={getValue() || 0}
        onChange={e =>
          updateRow(row.index, 'EstQty', parseInt(e.target.value) || 0)
        }
        className="border px-2 py-1 w-full"
      />
    ),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'estPay',
    header: props => <FilterSortHeader {...props} label="Est Pay" />,
    accessorFn: row => calculatePay(row),
    cell: info => info.getValue(),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  // ─── Profit column ────
  {
    id: 'profit',
    header: props => <FilterSortHeader {...props} label="Profit" />,
    accessorFn: row => calculateAUD(row, config) - calculatePay(row),
    cell: info => info.getValue(),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
    // ─── Location columns ────
  {
    id: 'state',
    accessorFn: row => row.location?.state || '',
    header: props => <FilterSortHeader {...props} label="State" />,
    cell: info => info.getValue(),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'city',
    accessorFn: row => row.location?.city || '',
    header: props => <FilterSortHeader {...props} label="City" />,
    cell: info => info.getValue(),
    filterFn: 'arrIncludes',
    enableSorting: true,
    enableColumnFilter: true,
  },
];
