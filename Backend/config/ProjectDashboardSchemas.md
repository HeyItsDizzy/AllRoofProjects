# Project Dashboard Database Schemas

## Overview
This document defines the MongoDB schemas for the Project Dashboard feature. These collections support the comprehensive project management dashboard with file management, takeoffs, quotes, orders, tasks, notes, and activity tracking.

## Collections

### 1. project_files
**Purpose**: Store metadata for all files uploaded to projects (actual files stored in S3/filesystem)

```javascript
{
  _id: ObjectId,
  projectId: ObjectId,           // Reference to Projects collection
  projectNumber: String,         // Denormalized for quick lookup
  
  // File Information
  name: String,                  // Original filename
  displayName: String,           // User-friendly name
  size: Number,                  // File size in bytes
  mimeType: String,              // MIME type (application/pdf, image/jpeg, etc.)
  extension: String,             // File extension (.pdf, .jpg, etc.)
  
  // Storage
  storagePath: String,           // Full path in filesystem (e.g., /AU/2025/08/25-08088/Takeoffs/file.pdf)
  s3Key: String,                 // S3 key if using cloud storage
  checksum: String,              // MD5/SHA256 for integrity verification
  
  // Categorization
  category: String,              // Enum: ['takeoffs', 'quotes', 'orders', 'images', 'documents', 'plans', 'reports', 'other']
  subCategory: String,           // Optional subcategory
  tags: [String],                // User-defined tags for search/filtering
  
  // Metadata
  uploadedAt: Date,              // Upload timestamp
  uploadedBy: ObjectId,          // Reference to Users collection
  uploadedByName: String,        // Denormalized for quick display
  lastModified: Date,            // Last modification timestamp
  modifiedBy: ObjectId,          // Last modifier
  
  // Access & Versioning
  version: Number,               // Version number (for versioned files)
  isLatestVersion: Boolean,      // Quick flag for latest version
  previousVersionId: ObjectId,   // Reference to previous version
  
  // Status
  status: String,                // Enum: ['active', 'archived', 'deleted']
  
  // Additional Fields
  description: String,           // Optional file description
  linkedTaskId: ObjectId,        // Optional: linked to a task
  viewCount: Number,             // Number of times viewed
  downloadCount: Number,         // Number of times downloaded
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.project_files.createIndex({ projectId: 1, uploadedAt: -1 });
db.project_files.createIndex({ projectId: 1, category: 1 });
db.project_files.createIndex({ projectNumber: 1 });
db.project_files.createIndex({ uploadedBy: 1 });
db.project_files.createIndex({ status: 1, isLatestVersion: 1 });
```

### 2. project_takeoffs
**Purpose**: Store measurement and takeoff data for roofing projects

```javascript
{
  _id: ObjectId,
  projectId: ObjectId,           // Reference to Projects collection
  projectNumber: String,         // Denormalized for quick lookup
  
  // Takeoff Data
  takeoffNumber: String,         // Sequential number (TO-001, TO-002, etc.)
  version: Number,               // Version of this takeoff
  
  // Measurements
  roofFaces: Number,             // Number of roof faces measured
  wallFaces: Number,             // Number of wall faces measured
  totalArea: Number,             // Total area in square meters
  
  // Detailed Measurements
  measurements: [{
    id: String,                  // Unique ID for this measurement
    type: String,                // Enum: ['roof', 'wall', 'gutter', 'valley', 'ridge', 'other']
    area: Number,                // Area in square meters
    length: Number,              // Length in meters (for linear items)
    width: Number,               // Width in meters
    height: Number,              // Height in meters
    pitch: Number,               // Roof pitch in degrees
    notes: String,               // Measurement notes
    coordinates: [               // Optional polygon/shape data
      { x: Number, y: Number }
    ]
  }],
  
  // Materials Calculation
  materials: [{
    name: String,                // Material name (e.g., "Colorbond Roofing")
    quantity: Number,            // Calculated quantity
    unit: String,                // Unit (sqm, linear meter, piece, etc.)
    wastage: Number,             // Wastage percentage applied
    notes: String
  }],
  
  // Associated Files
  planFileId: ObjectId,          // Reference to project_files (original plan)
  takeoffFileId: ObjectId,       // Reference to project_files (takeoff document)
  
  // Status & Approval
  status: String,                // Enum: ['draft', 'pending_review', 'approved', 'revised', 'superseded']
  approvedBy: ObjectId,          // Reference to Users collection
  approvedAt: Date,              // Approval timestamp
  supersededBy: ObjectId,        // Reference to newer takeoff if superseded
  
  // Metadata
  createdBy: ObjectId,           // Estimator who created takeoff
  createdByName: String,         // Denormalized
  createdAt: Date,
  
  lastModifiedBy: ObjectId,
  lastModifiedAt: Date,
  
  // Notes & Comments
  notes: String,                 // General notes
  internalNotes: String,         // Internal-only notes
  
  // Quality Checks
  verified: Boolean,             // Whether measurements verified
  verifiedBy: ObjectId,          // Verifier
  verifiedAt: Date,
  
  // Timestamps
  updatedAt: Date
}

// Indexes
db.project_takeoffs.createIndex({ projectId: 1, version: -1 });
db.project_takeoffs.createIndex({ projectNumber: 1 });
db.project_takeoffs.createIndex({ status: 1 });
db.project_takeoffs.createIndex({ createdBy: 1 });
```

### 3. project_quotes
**Purpose**: Store pricing quotes for projects

```javascript
{
  _id: ObjectId,
  projectId: ObjectId,           // Reference to Projects collection
  projectNumber: String,         // Denormalized for quick lookup
  
  // Quote Information
  quoteNumber: String,           // Sequential (Q-001, Q-002, etc.)
  version: Number,               // Version number
  
  // Pricing
  subtotal: Number,              // Pre-tax total
  tax: Number,                   // GST/VAT amount
  taxRate: Number,               // Tax rate applied (0.10 for 10%)
  total: Number,                 // Final amount
  currency: String,              // Currency code (AUD, USD, etc.)
  
  // Line Items
  items: [{
    id: String,                  // Unique item ID
    description: String,         // Item description
    quantity: Number,            // Quantity
    unit: String,                // Unit (sqm, meter, piece, etc.)
    unitPrice: Number,           // Price per unit
    discount: Number,            // Discount percentage
    lineTotal: Number,           // Line item total
    category: String,            // Category (materials, labor, equipment, etc.)
    notes: String
  }],
  
  // Linked Data
  takeoffId: ObjectId,           // Reference to project_takeoffs
  
  // Status & Workflow
  status: String,                // Enum: ['draft', 'pending_review', 'sent_to_client', 'approved', 'rejected', 'revised', 'accepted']
  sentToClientAt: Date,          // When sent to client
  clientViewedAt: Date,          // When client viewed
  clientResponseAt: Date,        // When client responded
  clientResponse: String,        // Enum: ['accepted', 'rejected', 'needs_revision']
  
  // Terms & Conditions
  validUntil: Date,              // Quote expiry date
  paymentTerms: String,          // Payment terms description
  depositRequired: Number,       // Deposit amount
  depositPercentage: Number,     // Deposit as percentage
  
  // Files
  quoteFileId: ObjectId,         // Reference to project_files (PDF quote)
  
  // Metadata
  createdBy: ObjectId,           // Creator
  createdByName: String,         // Denormalized
  createdAt: Date,
  
  sentBy: ObjectId,              // Who sent to client
  sentAt: Date,
  
  approvedBy: ObjectId,          // Internal approver
  approvedAt: Date,
  
  // Conversion
  convertedToOrder: Boolean,     // If quote converted to order
  orderId: ObjectId,             // Reference to project_orders
  
  // Notes
  internalNotes: String,         // Internal notes
  clientNotes: String,           // Notes visible to client
  
  // Timestamps
  updatedAt: Date
}

// Indexes
db.project_quotes.createIndex({ projectId: 1, version: -1 });
db.project_quotes.createIndex({ projectNumber: 1 });
db.project_quotes.createIndex({ status: 1 });
db.project_quotes.createIndex({ validUntil: 1 });
db.project_quotes.createIndex({ createdBy: 1 });
```

### 4. project_orders
**Purpose**: Store material and service orders for projects

```javascript
{
  _id: ObjectId,
  projectId: ObjectId,           // Reference to Projects collection
  projectNumber: String,         // Denormalized for quick lookup
  
  // Order Information
  orderNumber: String,           // Sequential (ORD-001, ORD-002, etc.)
  purchaseOrderNumber: String,   // External PO number
  
  // Supplier Information
  supplierName: String,          // Supplier name
  supplierId: ObjectId,          // Reference to suppliers collection (if exists)
  supplierContact: String,       // Contact person
  supplierEmail: String,         // Supplier email
  supplierPhone: String,         // Supplier phone
  
  // Order Details
  orderType: String,             // Enum: ['materials', 'labor', 'equipment', 'services']
  
  // Items
  items: [{
    id: String,                  // Unique item ID
    productCode: String,         // Supplier product code
    description: String,         // Item description
    quantity: Number,            // Quantity ordered
    unit: String,                // Unit
    unitPrice: Number,           // Price per unit
    lineTotal: Number,           // Line total
    quantityReceived: Number,    // Quantity received so far
    notes: String
  }],
  
  // Pricing
  subtotal: Number,              // Pre-tax total
  tax: Number,                   // Tax amount
  shipping: Number,              // Shipping cost
  total: Number,                 // Final total
  currency: String,              // Currency code
  
  // Status & Tracking
  status: String,                // Enum: ['draft', 'pending', 'confirmed', 'processing', 'partially_received', 'received', 'cancelled']
  
  // Important Dates
  orderDate: Date,               // When order was placed
  expectedDeliveryDate: Date,    // Expected delivery
  actualDeliveryDate: Date,      // Actual delivery
  
  // Delivery
  deliveryAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  
  deliveryInstructions: String,  // Special delivery instructions
  
  // Linked Data
  quoteId: ObjectId,             // Reference to project_quotes
  takeoffId: ObjectId,           // Reference to project_takeoffs
  
  // Receiving Records
  receivingRecords: [{
    receivedAt: Date,            // Timestamp of receipt
    receivedBy: ObjectId,        // User who received
    receivedByName: String,      // Denormalized
    itemsReceived: [{
      itemId: String,            // Reference to items array
      quantityReceived: Number,  // Quantity in this receipt
      condition: String,         // Condition on arrival
      notes: String
    }],
    photos: [ObjectId],          // References to project_files
    notes: String
  }],
  
  // Payment
  paymentStatus: String,         // Enum: ['unpaid', 'partially_paid', 'paid', 'overdue']
  paymentDueDate: Date,          // When payment is due
  invoiceNumber: String,         // Supplier invoice number
  invoiceFileId: ObjectId,       // Reference to project_files
  
  // Metadata
  createdBy: ObjectId,           // Who created order
  createdByName: String,         // Denormalized
  createdAt: Date,
  
  confirmedBy: ObjectId,         // Who confirmed order
  confirmedAt: Date,
  
  // Notes
  internalNotes: String,         // Internal notes
  supplierNotes: String,         // Notes for supplier
  
  // Timestamps
  updatedAt: Date
}

// Indexes
db.project_orders.createIndex({ projectId: 1, orderDate: -1 });
db.project_orders.createIndex({ projectNumber: 1 });
db.project_orders.createIndex({ status: 1 });
db.project_orders.createIndex({ supplierName: 1 });
db.project_orders.createIndex({ expectedDeliveryDate: 1 });
```

### 5. project_tasks
**Purpose**: Store tasks and action items for projects

```javascript
{
  _id: ObjectId,
  projectId: ObjectId,           // Reference to Projects collection
  projectNumber: String,         // Denormalized for quick lookup
  
  // Task Information
  title: String,                 // Task title (required)
  description: String,           // Detailed description
  
  // Priority & Type
  priority: String,              // Enum: ['low', 'medium', 'high', 'urgent']
  type: String,                  // Enum: ['action', 'milestone', 'reminder', 'approval', 'communication']
  
  // Assignment
  assignedTo: [ObjectId],        // Array of User IDs
  assignedToNames: [String],     // Denormalized for display
  createdBy: ObjectId,           // Task creator
  createdByName: String,         // Denormalized
  
  // Status & Progress
  status: String,                // Enum: ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']
  progress: Number,              // Progress percentage (0-100)
  
  // Dates
  dueDate: Date,                 // When task is due
  startDate: Date,               // Optional start date
  completedAt: Date,             // When task was completed
  completedBy: ObjectId,         // Who completed it
  
  // Categorization
  category: String,              // Category (design, estimation, ordering, installation, etc.)
  tags: [String],                // User-defined tags
  
  // Linked Items
  linkedFileIds: [ObjectId],     // References to project_files
  linkedTaskIds: [ObjectId],     // Related/dependent tasks
  linkedTakeoffId: ObjectId,     // Reference to project_takeoffs
  linkedQuoteId: ObjectId,       // Reference to project_quotes
  linkedOrderId: ObjectId,       // Reference to project_orders
  
  // Checklist
  checklist: [{
    id: String,                  // Unique ID
    text: String,                // Checklist item text
    completed: Boolean,          // Completion status
    completedAt: Date,           // When completed
    completedBy: ObjectId        // Who completed
  }],
  
  // Comments/Updates
  comments: [{
    id: String,                  // Unique comment ID
    text: String,                // Comment text
    author: ObjectId,            // Comment author
    authorName: String,          // Denormalized
    createdAt: Date,             // Comment timestamp
    edited: Boolean,             // If edited
    editedAt: Date               // Edit timestamp
  }],
  
  // Reminders
  reminders: [{
    reminderDate: Date,          // When to send reminder
    reminderSent: Boolean,       // If reminder was sent
    sentAt: Date,                // When reminder was sent
    recipientId: ObjectId        // Who to remind
  }],
  
  // Recurring Task
  recurring: Boolean,            // If task is recurring
  recurringPattern: String,      // Pattern (daily, weekly, monthly, etc.)
  recurringEndDate: Date,        // When recurring ends
  parentTaskId: ObjectId,        // Reference to original recurring task
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  lastActivityAt: Date           // Last activity on this task
}

// Indexes
db.project_tasks.createIndex({ projectId: 1, status: 1, dueDate: 1 });
db.project_tasks.createIndex({ projectNumber: 1 });
db.project_tasks.createIndex({ assignedTo: 1, status: 1 });
db.project_tasks.createIndex({ dueDate: 1, status: 1 });
db.project_tasks.createIndex({ priority: 1, status: 1 });
db.project_tasks.createIndex({ createdBy: 1 });
```

### 6. project_notes
**Purpose**: Store communications, notes, and messages related to projects

```javascript
{
  _id: ObjectId,
  projectId: ObjectId,           // Reference to Projects collection
  projectNumber: String,         // Denormalized for quick lookup
  
  // Note Content
  title: String,                 // Optional title
  content: String,               // Note content (required)
  contentType: String,           // Enum: ['text', 'markdown', 'html']
  
  // Type & Category
  noteType: String,              // Enum: ['general', 'meeting', 'phone_call', 'email', 'site_visit', 'client_communication', 'internal']
  category: String,              // Optional category
  
  // Author
  author: ObjectId,              // Reference to Users collection
  authorName: String,            // Denormalized
  authorRole: String,            // User role at time of creation
  
  // Visibility
  visibility: String,            // Enum: ['public', 'internal', 'private', 'client_visible']
  visibleTo: [ObjectId],         // Specific users who can see (for private notes)
  
  // Associated Data
  linkedFiles: [ObjectId],       // References to project_files
  linkedTasks: [ObjectId],       // References to project_tasks
  linkedContacts: [String],      // Contact names/emails mentioned
  
  // Meeting Notes Specific
  meetingDate: Date,             // If meeting note
  meetingAttendees: [{
    userId: ObjectId,
    name: String,
    role: String
  }],
  actionItems: [{
    text: String,
    assignedTo: ObjectId,
    dueDate: Date,
    completed: Boolean
  }],
  
  // Replies/Thread
  isReply: Boolean,              // If this is a reply
  parentNoteId: ObjectId,        // Reference to parent note
  threadId: String,              // Thread identifier
  
  // Status
  status: String,                // Enum: ['active', 'archived', 'deleted']
  pinned: Boolean,               // If pinned to top
  important: Boolean,            // If marked important
  
  // Mentions
  mentions: [ObjectId],          // Users mentioned in note
  
  // Email Integration
  emailSubject: String,          // If note created from email
  emailFrom: String,             // Email sender
  emailTo: [String],             // Email recipients
  emailDate: Date,               // Email date
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  lastEditedAt: Date,
  lastEditedBy: ObjectId
}

// Indexes
db.project_notes.createIndex({ projectId: 1, createdAt: -1 });
db.project_notes.createIndex({ projectNumber: 1 });
db.project_notes.createIndex({ author: 1, createdAt: -1 });
db.project_notes.createIndex({ noteType: 1 });
db.project_notes.createIndex({ visibility: 1, status: 1 });
db.project_notes.createIndex({ mentions: 1 });
db.project_notes.createIndex({ pinned: 1, important: 1 });
```

### 7. project_activity
**Purpose**: Comprehensive activity log for all project actions

```javascript
{
  _id: ObjectId,
  projectId: ObjectId,           // Reference to Projects collection
  projectNumber: String,         // Denormalized for quick lookup
  
  // Activity Details
  action: String,                // Action taken (e.g., "file_uploaded", "task_completed", "quote_sent")
  actionType: String,            // Enum: ['create', 'update', 'delete', 'status_change', 'upload', 'download', 'view', 'comment', 'assign']
  
  // Subject of Activity
  entityType: String,            // What was affected: ['file', 'task', 'quote', 'order', 'note', 'takeoff', 'project']
  entityId: ObjectId,            // Reference to affected entity
  entityName: String,            // Human-readable entity name
  
  // Actor
  actorId: ObjectId,             // Reference to Users collection
  actorName: String,             // Denormalized
  actorRole: String,             // User role at time of action
  actorType: String,             // Enum: ['user', 'system', 'automation', 'api']
  
  // Details
  description: String,           // Human-readable description
  details: {                     // Flexible object for additional data
    // Examples:
    // For file_uploaded: { fileName, fileSize, category }
    // For status_change: { oldStatus, newStatus }
    // For task_completed: { taskTitle, dueDate, completedEarly: true }
  },
  
  // Changes (for updates)
  changes: [{
    field: String,               // Field that changed
    oldValue: Schema.Types.Mixed, // Previous value
    newValue: Schema.Types.Mixed  // New value
  }],
  
  // Context
  source: String,                // Where action originated: ['web_app', 'mobile_app', 'api', 'email', 'automation']
  ipAddress: String,             // IP address of actor
  userAgent: String,             // Browser/client info
  
  // Importance
  important: Boolean,            // If activity is important/notable
  visibleToClient: Boolean,      // If activity should be visible to clients
  
  // Notification
  notifyUsers: [ObjectId],       // Users to notify about this activity
  notificationSent: Boolean,     // If notifications were sent
  
  // Timestamps
  timestamp: Date,               // When activity occurred
  createdAt: Date                // Database insertion time
}

// Indexes
db.project_activity.createIndex({ projectId: 1, timestamp: -1 });
db.project_activity.createIndex({ projectNumber: 1, timestamp: -1 });
db.project_activity.createIndex({ actorId: 1, timestamp: -1 });
db.project_activity.createIndex({ entityType: 1, entityId: 1 });
db.project_activity.createIndex({ actionType: 1, timestamp: -1 });
db.project_activity.createIndex({ important: 1, timestamp: -1 });
```

## Existing Projects Collection Updates

### Additional Fields for Dashboard Support

Add these fields to the existing `Projects` collection:

```javascript
{
  // ... existing fields (name, address, status, linkedClients, etc.)
  
  // Dashboard-specific fields
  dashboard: {
    // Progress Tracking
    progressStage: String,       // Enum: ['design', 'quoting', 'ordered', 'installation', 'completed']
    progressPercentage: Number,  // 0-100
    lastProgressUpdate: Date,    // When progress was last updated
    
    // Supplier Information
    supplierInfo: {
      selectedSupplier: String,  // Supplier name
      materialType: String,      // Primary material (e.g., "Colorbond")
      pricePerSqm: Number,       // Price per square meter
      lastPriceUpdate: Date      // When price was last updated
    },
    
    // Wind Region (Australian specific)
    windRegion: {
      detectedRegion: String,    // Detected wind region (W28, W33, W41, C1, C2, etc.)
      verified: Boolean,         // If wind region has been verified
      verifiedBy: ObjectId,      // Who verified
      verifiedAt: Date,          // When verified
      manualOverride: Boolean,   // If manually overridden
      notes: String              // Notes about wind region
    },
    
    // Roofing Color
    selectedColor: String,       // Selected roofing color
    colorCode: String,           // Color code (if applicable)
    
    // Quick Stats (denormalized for performance)
    stats: {
      totalFiles: Number,
      totalTasks: Number,
      pendingTasks: Number,
      totalQuotes: Number,
      totalOrders: Number,
      openOrders: Number,
      lastFileUpload: Date,
      lastActivity: Date
    }
  },
  
  // ... existing fields continue
}
```

## Utility Functions & Helpers

### Activity Logger Function
```javascript
// Helper function to log activity
async function logProjectActivity(projectId, projectNumber, action, details) {
  const activityLog = {
    projectId: new ObjectId(projectId),
    projectNumber,
    action,
    actionType: details.actionType || 'update',
    entityType: details.entityType,
    entityId: details.entityId ? new ObjectId(details.entityId) : null,
    entityName: details.entityName,
    actorId: details.actorId ? new ObjectId(details.actorId) : null,
    actorName: details.actorName,
    actorRole: details.actorRole || 'User',
    actorType: details.actorType || 'user',
    description: details.description,
    details: details.additionalData || {},
    changes: details.changes || [],
    source: details.source || 'web_app',
    important: details.important || false,
    visibleToClient: details.visibleToClient || false,
    timestamp: new Date(),
    createdAt: new Date()
  };
  
  const activityCollection = await db.collection('project_activity');
  await activityCollection.insertOne(activityLog);
  
  // Update project's last activity timestamp
  const projectsCollection = await db.collection('Projects');
  await projectsCollection.updateOne(
    { _id: new ObjectId(projectId) },
    { $set: { 'dashboard.stats.lastActivity': new Date() } }
  );
}
```

## Migration Considerations

1. **Existing Projects**: Add `dashboard` field with default values to all existing projects
2. **File Migration**: If files currently stored elsewhere, migrate metadata to `project_files` collection
3. **Backward Compatibility**: Ensure existing APIs continue to work during migration
4. **Indexes**: Create all indexes before full deployment to production
5. **Data Validation**: Implement validation at application level to ensure data integrity

## Notes

- All ObjectId references should be validated before insertion
- Consider implementing soft deletes (status field) instead of hard deletes for audit trail
- Use denormalized fields (like names) for display performance
- Regular cleanup of old activity logs (consider archiving after 12 months)
- Consider implementing caching for frequently accessed dashboard data
