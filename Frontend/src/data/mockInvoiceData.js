// mockInvoiceData.js - Mock QuickBooks invoice and payment data
/* This simulates QuickBooks API responses for development */

export const mockCustomer = {
  id: "6880a6a598a04402dafabc2d",
  name: "Cloudbreak Roofing",
  legalName: "CLOUDBREAK ROOFING PTY LTD",
  displayName: "Cloudbreak Roofing",
  
  // Contact Information (from mainContact)
  mainContact: {
    name: "Jeremy Kortenhorst",
    email: "cloudbreakroofing@hotmail.com",
    phone: "0426 850 174",
    accountsEmail: "cloudbreakroofing@hotmail.com"
  },
  
  // Legacy fields for compatibility
  email: "cloudbreakroofing@hotmail.com",
  phone: "0426 850 174",
  
  // Business Registration
  abn: "29674038183",
  acn: "674038183",
  gstRegistered: "yes",
  taxInvoiceRequired: "yes",
  
  // ABR Data (Australian Business Registry) - Use top-level fields, not abrRawData
  abrData: {
    Abn: "59636241266",
    AbnStatus: "Active",
    AbnStatusEffectiveFrom: "2019-09-17",
    Acn: "636241266",
    EntityName: "CLOUDBREAK ROOFING PTY LTD",
    EntityTypeCode: "PRV",
    EntityTypeName: "Australian Private Company",
    AddressState: "QLD",
    AddressPostcode: "4701",
    Gst: "2019-09-17",
    capturedAt: "2025-08-10T22:23:09.000Z",
    abrSource: "detailed",
    source: "abr_api",
    normalizedName: "Cloudbreak Roofing"
  },
  
  // Address Information
  billingAddress: {
    line1: "2 Gladman Close",
    line2: "",
    city: "Isaacs",
    state: "Australian Capital Territory",
    postalCode: "2607",
    country: "Australia",
    streetNumber: "2",
    full_address: "2 Gladman Close, Isaacs Australian Capital Territory 2607, Australia"
  },
  
  shippingAddress: null, // Same as billing if not specified
  
  // Company Details
  logoUrl: "", // Can be populated from database
  notes: "",
  customFields: {},
  
  // Project Management
  linkedProjects: [], // Array of project IDs
  
  // Visual
  avatar: "CR" // Initials for avatar
};

export const mockInvoices = [
  // September 2025
  {
    id: "payment-4-9-25",
    key: "payment-4-9-25",
    date: "2025-09-04",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -330.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-09-04"
  },
  {
    id: "1991",
    key: "1991",
    date: "2025-09-03",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-09029",
    projectName: "16 Darebin St Norlane",
    memo: "",
    amount: 330.00,
    status: "paid",
    dueDate: "2025-09-17",
    paymentDate: "2025-09-03"
  },
  
  // August 2025
  {
    id: "payment-31-8-25",
    key: "payment-31-8-25", 
    date: "2025-08-31",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -500.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-08-31"
  },
  {
    id: "1977",
    key: "1977",
    date: "2025-08-24",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-08024",
    projectName: "Roof Repair - Main St",
    memo: "Sent 7/9/25",
    amount: 429.00,
    status: "overdue",
    dueDate: "2025-08-27",
    overdayDays: 18
  },
  {
    id: "payment-19-8-25",
    key: "payment-19-8-25",
    date: "2025-08-19",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -500.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-08-19"
  },
  {
    id: "payment-18-8-25",
    key: "payment-18-8-25",
    date: "2025-08-18",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -825.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-08-18"
  },
  {
    id: "1965",
    key: "1965",
    date: "2025-08-17",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-08017",
    projectName: "Commercial Roof Install",
    memo: "Partially paid, A$270.50 due",
    amount: 528.00,
    status: "overdue",
    dueDate: "2025-08-20",
    overdayDays: 25,
    partiallyPaid: true,
    amountDue: 270.50
  },
  
  // Multiple voided payments on 13/8/25
  {
    id: "void-payment-1-13-8-25",
    key: "void-payment-1-13-8-25",
    date: "2025-08-13",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "Voided",
    amount: 0.00,
    status: "void",
    dueDate: null
  },
  {
    id: "void-payment-2-13-8-25",
    key: "void-payment-2-13-8-25",
    date: "2025-08-13",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "Voided",
    amount: 0.00,
    status: "void",
    dueDate: null
  },
  {
    id: "void-payment-3-13-8-25",
    key: "void-payment-3-13-8-25",
    date: "2025-08-13",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "Voided",
    amount: 0.00,
    status: "void",
    dueDate: null
  },
  {
    id: "void-payment-4-13-8-25",
    key: "void-payment-4-13-8-25",
    date: "2025-08-13",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "Voided",
    amount: 0.00,
    status: "void",
    dueDate: null
  },
  {
    id: "void-payment-5-13-8-25",
    key: "void-payment-5-13-8-25",
    date: "2025-08-13",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "Voided",
    amount: 0.00,
    status: "void",
    dueDate: null
  },
  {
    id: "void-payment-6-13-8-25",
    key: "void-payment-6-13-8-25",
    date: "2025-08-13",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "Voided",
    amount: 0.00,
    status: "void",
    dueDate: null
  },
  {
    id: "void-payment-7-13-8-25",
    key: "void-payment-7-13-8-25",
    date: "2025-08-13",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "Voided",
    amount: 0.00,
    status: "void",
    dueDate: null
  },
  {
    id: "void-payment-8-13-8-25",
    key: "void-payment-8-13-8-25",
    date: "2025-08-13",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "Voided",
    amount: 0.00,
    status: "void",
    dueDate: null
  },
  
  {
    id: "1955",
    key: "1955",
    date: "2025-08-10",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-08010",
    projectName: "Gutter Cleaning Service",
    memo: "",
    amount: 231.00,
    status: "paid",
    dueDate: "2025-08-24",
    paymentDate: "2025-08-12"
  },
  {
    id: "1948",
    key: "1948",
    date: "2025-08-02",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-08002",
    projectName: "Roof Maintenance Check",
    memo: "",
    amount: 561.00,
    status: "paid",
    dueDate: "2025-08-16",
    paymentDate: "2025-08-05"
  },
  
  // July 2025
  {
    id: "1940",
    key: "1940",
    date: "2025-07-27",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-07027",
    projectName: "Emergency Roof Repair",
    memo: "",
    amount: 264.00,
    status: "paid",
    dueDate: "2025-08-10",
    paymentDate: "2025-07-30"
  },
  {
    id: "1924",
    key: "1924",
    date: "2025-07-15",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-07015",
    projectName: "Downpipe Replacement",
    memo: "",
    amount: 66.00,
    status: "paid",
    dueDate: "2025-07-29",
    paymentDate: "2025-07-20"
  },
  {
    id: "1915",
    key: "1915",
    date: "2025-07-07",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-07007",
    projectName: "Roof Tile Replacement",
    memo: "",
    amount: 445.50,
    status: "paid",
    dueDate: "2025-07-21",
    paymentDate: "2025-07-10"
  },
  
  // Multiple payments on 2/7/25
  {
    id: "payment-2-7-25-1",
    key: "payment-2-7-25-1",
    date: "2025-07-02",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -330.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-07-02"
  },
  {
    id: "payment-2-7-25-2",
    key: "payment-2-7-25-2",
    date: "2025-07-02",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -66.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-07-02"
  },
  {
    id: "payment-2-7-25-3",
    key: "payment-2-7-25-3",
    date: "2025-07-02",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -165.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-07-02"
  },
  {
    id: "payment-2-7-25-4",
    key: "payment-2-7-25-4",
    date: "2025-07-02",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -132.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-07-02"
  },
  
  // June 2025
  {
    id: "1906",
    key: "1906",
    date: "2025-06-29",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-06029",
    projectName: "Roof Inspection",
    memo: "",
    amount: 330.00,
    status: "paid",
    dueDate: "2025-07-13",
    paymentDate: "2025-07-02"
  },
  {
    id: "1894",
    key: "1894",
    date: "2025-06-22",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-06022",
    projectName: "Gutter Guard Install",
    memo: "",
    amount: 66.00,
    status: "paid",
    dueDate: "2025-07-06",
    paymentDate: "2025-07-02"
  },
  {
    id: "1883",
    key: "1883",
    date: "2025-06-16",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-06016",
    projectName: "Flashing Repair",
    memo: "",
    amount: 165.00,
    status: "paid",
    dueDate: "2025-06-30",
    paymentDate: "2025-07-02"
  },
  {
    id: "payment-12-6-25",
    key: "payment-12-6-25",
    date: "2025-06-12",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -297.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-06-12"
  },
  {
    id: "1870",
    key: "1870",
    date: "2025-06-08",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-06008",
    projectName: "Ridge Cap Replacement",
    memo: "",
    amount: 297.00,
    status: "paid",
    dueDate: "2025-06-22",
    paymentDate: "2025-06-12"
  },
  
  // May 2025
  {
    id: "1865",
    key: "1865",
    date: "2025-05-25",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-05025",
    projectName: "Roof Ventilation Install",
    memo: "",
    amount: 132.00,
    status: "paid",
    dueDate: "2025-06-08",
    paymentDate: "2025-05-21"
  },
  
  // Multiple payments on 21/5/25
  {
    id: "payment-21-5-25-1",
    key: "payment-21-5-25-1",
    date: "2025-05-21",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -66.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-05-21"
  },
  {
    id: "payment-21-5-25-2",
    key: "payment-21-5-25-2",
    date: "2025-05-21",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -132.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-05-21"
  },
  {
    id: "payment-21-5-25-3",
    key: "payment-21-5-25-3",
    date: "2025-05-21",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -231.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-05-21"
  },
  
  {
    id: "payment-7-5-25",
    key: "payment-7-5-25",
    date: "2025-05-07",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -297.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-05-07"
  },
  {
    id: "1850",
    key: "1850",
    date: "2025-05-05",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-05005",
    projectName: "Skylight Installation",
    memo: "",
    amount: 231.00,
    status: "paid",
    dueDate: "2025-05-19",
    paymentDate: "2025-05-21"
  },
  {
    id: "payment-3-5-25",
    key: "payment-3-5-25",
    date: "2025-05-03",
    type: "Payment",
    customer: "Cloudbreak Roofing",
    projectNumber: "",
    projectName: "",
    memo: "",
    amount: -330.00,
    status: "closed",
    dueDate: null,
    paymentDate: "2025-05-03"
  },
  
  // April 2025
  {
    id: "1842",
    key: "1842",
    date: "2025-04-29",
    type: "Invoice",
    customer: "Cloudbreak Roofing",
    projectNumber: "25-04029",
    projectName: "Roof Coating Application",
    memo: "",
    amount: 297.00,
    status: "paid",
    dueDate: "2025-05-13",
    paymentDate: "2025-05-07"
  }
];

// Financial calculation utilities
export const calculateFinancialStats = (invoices) => {
  // Separate invoices and payments
  const invoiceList = invoices.filter(item => item.type === 'Invoice' && item.status !== 'void');
  const payments = invoices.filter(item => item.type === 'Payment' && item.status !== 'void');
  
  // Calculate totals
  const totalInvoiced = invoiceList.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = Math.abs(payments.reduce((sum, payment) => sum + payment.amount, 0));
  
  // Calculate overdue amount (invoices that are overdue)
  const overdueAmount = invoiceList
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => {
      if (inv.partiallyPaid && inv.amountDue) {
        return sum + inv.amountDue; // Use remaining amount due for partially paid invoices
      }
      return sum + inv.amount; // Use full amount for unpaid overdue invoices
    }, 0);
  
  // Calculate open balance (unpaid invoices)
  const openBalance = invoiceList
    .filter(inv => inv.status === 'overdue' || inv.status === 'sent' || inv.status === 'draft')
    .reduce((sum, inv) => {
      if (inv.partiallyPaid && inv.amountDue) {
        return sum + inv.amountDue; // Use remaining amount due for partially paid invoices
      }
      return sum + inv.amount; // Use full amount for unpaid invoices
    }, 0);

  return { 
    totalInvoiced, 
    totalPaid, 
    overdueAmount, 
    openBalance 
  };
};