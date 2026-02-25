/**
 * PROJECT SCHEMA REFERENCE - February 2026
 * 
 * OFFICIAL DATABASE SCHEMA for Projects collection
 * Use this as reference for API calls, frontend displays, and backend logic
 * 
 * Last Updated: February 2, 2026
 * Total Projects in DB: 504
 */

const PROJECT_SCHEMA = {
  // ══════════════════════════════════════════════════════════════════
  // 📋 CORE IDENTIFICATION FIELDS (100% populated)
  // ══════════════════════════════════════════════════════════════════
  _id: {
    type: "ObjectId",
    required: true,
    description: "MongoDB unique identifier",
    usage: 100
  },
  
  name: {
    type: "String",
    required: true,
    description: "Project name/address",
    example: "1136 Glen Huntly Road Glen Huntly",
    usage: 100
  },
  
  projectNumber: {
    type: "String",
    required: true,
    description: "Unique project identifier (YY-NNNNN format)",
    example: "25-09067",
    usage: 100,
    indexed: true
  },
  
  alias: {
    type: "String",
    required: false,
    description: "Internal alias combining project number and hash",
    example: "25-09067ART&90539cf7c12a3422acc7513f2b5526ff",
    usage: 87.3
  },
  
  aliasCreatedAt: {
    type: "Date",
    required: false,
    description: "Timestamp when alias was created",
    usage: 75.7
  },
  
  // ══════════════════════════════════════════════════════════════════
  // 📍 LOCATION FIELDS (100% populated)
  // ══════════════════════════════════════════════════════════════════
  location: {
    type: "Object",
    required: true,
    description: "Structured address information",
    usage: 100,
    schema: {
      full_address: "String (formatted address)",
      address_line_1: "String (street name)",
      streetNumber: "String (number)",
      city: "String",
      state: "String",
      zip: "String (postcode)",
      region: "String (AU/NZ/etc)",
      country: "String"
    }
  },
  
  // ══════════════════════════════════════════════════════════════════
  // 📅 DATE FIELDS (>99% populated)
  // ══════════════════════════════════════════════════════════════════
  posting_date: {
    type: "Date",
    required: true,
    description: "Date project was posted/created",
    usage: 100,
    format: "YYYY-MM-DD",
    indexed: true
  },
  
  due_date: {
    type: "Date",
    required: false,
    description: "Due date for estimate completion",
    usage: 99.2,
    format: "YYYY-MM-DD"
  },
  
  DateCompleted: {
    type: "Date",
    required: false,
    description: "Date estimate was completed and sent",
    usage: 83.5,
    format: "YYYY-MM-DD"
  },
  
  // ══════════════════════════════════════════════════════════════════
  // 🔗 RELATIONSHIP FIELDS (>99% populated)
  // ══════════════════════════════════════════════════════════════════
  linkedClients: {
    type: "Array[ObjectId]",
    required: true,
    description: "Array of client ObjectIds",
    usage: 100,
    default: [],
    ref: "Clients"
  },
  
  linkedEstimators: {
    type: "Array[ObjectId]",
    required: true,
    description: "Array of estimator user ObjectIds",
    usage: 100,
    default: [],
    ref: "Users"
  },
  
  // ══════════════════════════════════════════════════════════════════
  // 📊 STATUS FIELDS - CURRENT SYSTEM (Feb 2026)
  // ══════════════════════════════════════════════════════════════════
  status: {
    type: "String",
    required: true,
    description: "**CURRENT** Project table display status",
    usage: 99.8,
    values: [
      "Estimate Completed",
      "Quote Sent", 
      "Assigned",
      "Approved",
      "Job lost",
      "Cancelled",
      "Project Active",
      "HOLD",
      "Completed",
      "RFI"
    ],
    displayLocation: "ProjectTable"
  },
  
  estimateStatus: {
    type: "String",
    required: true,
    description: "**CURRENT** Job Board display status",
    usage: 99.8,
    values: [
      "Sent",
      "Assigned",
      "Cancelled",
      "RFI"
    ],
    displayLocation: "JobBoard"
  },
  
  // ══════════════════════════════════════════════════════════════════
  // 💰 PRICING FIELDS (100% populated)
  // ══════════════════════════════════════════════════════════════════
  subTotal: {
    type: "Number",
    required: true,
    description: "Subtotal before GST",
    usage: 100,
    default: 0
  },
  
  total: {
    type: "Number",
    required: true,
    description: "Total including GST",
    usage: 100,
    default: 0
  },
  
  gst: {
    type: "Number",
    required: true,
    description: "GST amount",
    usage: 100,
    default: 0
  },
  
  pricingSnapshot: {
    type: "Object",
    required: true,
    description: "Captured pricing tier at send time (for price stability)",
    usage: 100,
    schema: {
      capturedAt: "Date (when pricing was locked)",
      clientPricingTier: "String (Elite/Pro/Standard)",
      clientUseNewPricing: "Boolean (legacy: 40% vs new: 30%)",
      priceMultiplier: "Number (0.6/0.7/0.8/1.0)",
      exchangeRate: "Number | null",
      backfilled: "Boolean (true if created by migration script)"
    }
  },
  
  // ══════════════════════════════════════════════════════════════════
  // 📦 PROJECT DETAILS (65-100% usage)
  // ══════════════════════════════════════════════════════════════════
  description: {
    type: "String",
    required: false,
    description: "Project description or notes",
    usage: 100,
    default: "No description provided."
  },
  
  InvoiceLine: {
    type: "String",
    required: false,
    description: "Invoice line item text",
    example: "25-09067 - 1136 Glen Huntly Road Glen Huntly - 1 x Standard",
    usage: 99.8
  },
  
  EstQty: {
    type: "Number",
    required: false,
    description: "Estimated quantity",
    usage: 65.0
  },
  
  PlanType: {
    type: "String",
    required: false,
    description: "Plan type (Standard/Pro/Elite)",
    usage: 64.6
  },
  
  Qty: {
    type: "Number",
    required: false,
    description: "Actual quantity",
    usage: 64.4
  },
  
  EstPayStatus: {
    type: "String",
    required: false,
    description: "Estimator payment status",
    usage: 64.0
  },
  
  ARTInvNumber: {
    type: "String",
    required: false,
    description: "ART invoice number",
    example: "2011",
    usage: 59.4
  },
  
  estimateSent: {
    type: "Array[Date]",
    required: false,
    description: "Array of dates when estimate was sent",
    usage: 44.5
  },
  
  Comments: {
    type: "String",
    required: false,
    description: "Freeform comments about the project",
    example: "2x standard plus garages plus 1 hour walls, 3.5 hr charge",
    usage: 8.9
  },
  
  estimateNotes: {
    type: "Object",
    required: false,
    description: "Structured notes for estimate (exclusions, etc.)",
    usage: 0.2,
    schema: {
      exclusions: "String"
    }
  }
};

// ══════════════════════════════════════════════════════════════════
// 🗑️ REMOVED FIELDS (Deleted Feb 2026)
// ══════════════════════════════════════════════════════════════════
const REMOVED_FIELDS = [
  {
    name: "linkedUsers",
    reason: "Never used (0% populated, always empty array)",
    removedDate: "2026-02-02"
  },
  {
    name: "jobBoardStatus",
    reason: "Legacy status field (replaced by estimateStatus)",
    removedDate: "2026-02-02"
  },
  {
    name: "projectStatus",
    reason: "Legacy status field (replaced by status)",
    removedDate: "2026-02-02"
  },
  {
    name: "Status",
    reason: "Typo duplicate of status field (2.4% usage)",
    removedDate: "2026-02-02"
  },
  {
    name: "estimateSentDate",
    reason: "Superseded by estimateSent array (0.2% usage)",
    removedDate: "2026-02-02"
  },
  {
    name: "jobBoardData",
    reason: "Old structure (3.8% usage)",
    removedDate: "2026-02-02"
  },
  {
    name: "readOnlyToken",
    reason: "Abandoned feature - share links without login (63% had data but feature unused)",
    removedDate: "2026-02-02"
  },
  {
    name: "readOnlyTokenCreatedAt",
    reason: "Associated with abandoned readOnlyToken feature",
    removedDate: "2026-02-02"
  },
  {
    name: "readOnlyTokenExpiresAt",
    reason: "Associated with abandoned readOnlyToken feature",
    removedDate: "2026-02-02"
  }
];

// ══════════════════════════════════════════════════════════════════
// 📖 API USAGE GUIDE
// ══════════════════════════════════════════════════════════════════

/*
CREATING A PROJECT:
```javascript
const newProject = {
  name: "123 Main St Project",
  projectNumber: "26-00001",
  location: {
    full_address: "123 Main St, City State 12345, Country",
    address_line_1: "Main St",
    streetNumber: "123",
    city: "City",
    state: "State",
    zip: "12345",
    country: "Country"
  },
  posting_date: "2026-02-02",
  due_date: "2026-02-09",
  linkedClients: [clientId],
  linkedEstimators: [],
  status: "Assigned",           // ✅ CURRENT for Project table
  estimateStatus: "Assigned",   // ✅ CURRENT for Job Board
  description: "Project description here",
  subTotal: 0,
  total: 0,
  gst: 0,
  pricingSnapshot: null // Will be set when estimate is sent
};
```

UPDATING STATUS:
```javascript
// ✅ CORRECT - Use current fields
await projectsCol.updateOne(
  { _id: projectId },
  { 
    $set: { 
      status: "Estimate Completed",      // For Project table
      estimateStatus: "Sent"             // For Job Board
    } 
  }
);

// ❌ WRONG - Don't use these (removed)
await projectsCol.updateOne(
  { _id: projectId },
  { 
    $set: { 
      projectStatus: "...",  // REMOVED
      jobBoardStatus: "..."  // REMOVED
    } 
  }
);
```

FILTERING PROJECTS:
```javascript
// ✅ Filter by status (current field)
const activeProjects = await projectsCol.find({
  status: { $in: ["Assigned", "Project Active"] }
});

// ✅ Filter by estimateStatus (current field)
const sentEstimates = await projectsCol.find({
  estimateStatus: "Sent"
});

// ✅ Filter by month
const decemberProjects = await projectsCol.find({
  posting_date: {
    $gte: "2025-12-01",
    $lt: "2026-01-01"
  }
});
```

DISPLAYING DATA:
```javascript
// ✅ Project Table - use "status"
<TableCell>{project.status}</TableCell>

// ✅ Job Board - use "estimateStatus"  
<TableCell>{project.estimateStatus}</TableCell>

// ❌ Don't use removed fields
<TableCell>{project.projectStatus}</TableCell>  // REMOVED
<TableCell>{project.jobBoardStatus}</TableCell> // REMOVED
```
*/

module.exports = {
  PROJECT_SCHEMA,
  REMOVED_FIELDS
};
