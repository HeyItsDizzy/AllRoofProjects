// JobBoardConfig.js
import { calculateEstCost, calculatePay, calculateNOK } from '@/appjobboard/utils/formulaLogic';

export const jobBoardColumns = (updateRow, editable, exchangeRate, config) => [
  { header: 'Project #', accessorKey: 'projectNumber' },
  { header: 'Job ID', accessorKey: 'JobID' },
  { header: 'Name', accessorKey: 'name' },
  { header: 'Client', accessorKey: 'Client', cell: editable('Client') },

  { header: 'Date Received', accessorKey: 'posting_date' },
  { header: 'Date Due', accessorKey: 'due_date' },
  { header: 'Date Completed', accessorKey: 'DateCompleted' },

  {
    header: 'City',
    accessorFn: row => row.location?.city || '',
  },
  {
    header: 'State',
    accessorFn: row => row.location?.state || '',
  },

  { header: 'Invoice Line', accessorKey: 'InvoiceLine', cell: editable('InvoiceLine') },
  { header: 'Comments', accessorKey: 'Comments', cell: editable('Comments') },
  { header: 'Plan Type', accessorKey: 'PlanType', cell: editable('PlanType') },
  { header: 'Status', accessorKey: 'status', cell: editable('status') },

  {
    header: 'Qty', accessorKey: 'Qty', cell: ({ row, getValue }) => (
      <input
        type="number"
        value={getValue() || 0}
        onChange={e => updateRow(row.index, 'Qty', parseInt(e.target.value) || 0)}
        className="border px-2 py-1 w-full"
      />
    )
  },
  { header: 'Price ea', accessorKey: 'PriceEach', cell: editable('PriceEach') },

  {
    header: 'Total (AUD)',
    accessorFn: row => calculateEstCost(row, config),
  },
  {
    header: 'Total (NOK)',
    accessorFn: row => calculateNOK(row, config, exchangeRate),
  },

  { header: 'ARTInv #', accessorKey: 'ARTInvNumber', cell: editable('ARTInvNumber') },
  { header: 'Flashing Set', accessorKey: 'FlashingSet', cell: editable('FlashingSet') },
  { header: 'Est', accessorKey: 'Est', cell: editable('Est') },

  {
    header: 'Est Qty', accessorKey: 'EstQty', cell: ({ row, getValue }) => (
      <input
        type="number"
        value={getValue() || 0}
        onChange={e => updateRow(row.index, 'EstQty', parseInt(e.target.value) || 0)}
        className="border px-2 py-1 w-full"
      />
    )
  },

  {
    header: 'Est Pay',
    accessorFn: row => calculatePay(row),
  },
  {
    header: 'Profit',
    accessorFn: row => {
      const aud = calculateEstCost(row, config);
      const pay = calculatePay(row);
      return aud - pay;
    },
  },
];
