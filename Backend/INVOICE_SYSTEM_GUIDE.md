/**
 * Invoice System Integration Guide
 * Complete setup and integration instructions
 */

## INVOICE SYSTEM IMPLEMENTATION

This reference provides a complete invoice management system aligned with QuickBooks structure.

### FILES CREATED:

1. **Backend/models/Invoice.js** - MongoDB schema with validation and auto-calculation
2. **Backend/references/InvoiceReference.js** - Sample data, builders, and utilities
3. **Backend/routes/invoiceRoutes.js** - Complete CRUD operations and QB integration
4. **Backend/db/invoiceCollection.js** - Database setup with optimized indexes

### INTEGRATION STEPS:

#### 1. Add Invoice Routes to Main App
```javascript
// In your main app.js or server.js
const invoiceRoutes = require('./routes/invoiceRoutes');
app.use('/api/invoices', invoiceRoutes);
```

#### 2. Initialize Database Collections
```javascript
// In your startup code
const { initializeInvoiceCollection } = require('./db/invoiceCollection');
await initializeInvoiceCollection();
```

#### 3. Update Project Schema
```javascript
// Add these fields to your Project model/collection:
{
  ARTInvNumber: String,        // Invoice number reference
  invoicedAt: Date,           // When invoice was created
  invoiceId: ObjectId,        // Reference to invoice document
  estimateSent: [Date],       // Array of sent dates
  estimateStatus: String      // "Draft", "Sent", "Accepted", etc.
}
```

#### 4. Update Client Schema
```javascript
// Add these fields to your Client model/collection:
{
  billingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  paymentTerms: String,       // "7 Days", "14 Days", "30 Days"
  quickbooks: {
    connected: Boolean,
    customerId: String,       // QB Customer ID
    access_token: String,
    realmId: String,
    lastSynced: Date
  }
}
```

### FRONTEND COMPONENTS NEEDED:

#### 1. Invoice List Page
```jsx
// /src/pages/InvoiceListPage.jsx
- Display all invoices with filtering
- Status badges (Draft, Sent, Paid, Overdue)
- Search and pagination
- Actions: View, Edit, Send, Mark Paid
```

#### 2. Invoice Creation Page
```jsx
// /src/pages/InvoiceCreatePage.jsx
- Customer selection
- Line item management
- Tax calculation
- Preview and save
```

#### 3. Invoice Detail/Edit Page
```jsx
// /src/pages/InvoiceDetailPage.jsx
- Full invoice display
- Edit capabilities
- Send to QuickBooks
- Payment tracking
```

#### 4. Invoice Widget/Cards
```jsx
// /src/components/InvoiceCard.jsx
- Summary card for dashboard
- Quick actions
- Status indicators
```

### API ENDPOINTS AVAILABLE:

```
POST   /api/invoices                    - Create new invoice
POST   /api/invoices/from-project/:id   - Create from project
GET    /api/invoices                    - List invoices (with filtering)
GET    /api/invoices/:id                - Get specific invoice
PUT    /api/invoices/:id                - Update invoice
DELETE /api/invoices/:id                - Delete invoice (draft only)
POST   /api/invoices/:id/sync-to-quickbooks - Sync to QB
GET    /api/invoices/summary            - Financial summary
```

### QUICKBOOKS INTEGRATION:

The system is designed to work seamlessly with your existing QuickBooks integration:

1. **Invoice Creation** - Uses QB-compatible format
2. **Customer Sync** - Maps to QB customers
3. **Tax Handling** - Supports GST calculation
4. **Status Sync** - Tracks QB invoice status

### USAGE EXAMPLES:

#### Create Invoice from Project:
```javascript
const { InvoiceBuilder } = require('./references/InvoiceReference');

// From your existing project creation flow
const invoice = new InvoiceBuilder()
  .setCustomer(client._id, client.name, client.email)
  .setDates(new Date(), "7 Days")
  .addProjectLineItems(project)
  .setMessage("Thank you for your business!")
  .build();
```

#### Sync to QuickBooks:
```javascript
// After creating invoice locally
const response = await axios.post(`/api/invoices/${invoiceId}/sync-to-quickbooks`);
```

#### Check Outstanding Balance:
```javascript
const { utils } = require('./db/invoiceCollection');
const outstanding = await utils.getCustomerOutstanding(customerId);
```

### REPLACE EXISTING PROJECT INVOICE CREATION:

Your current project routes have invoice creation logic. Replace them with:

```javascript
// Replace in projectRoutes.js
router.post('/:projectId/create-invoice', async (req, res) => {
  // Use the new invoice system
  const response = await axios.post(
    `${req.protocol}://${req.get('host')}/api/invoices/from-project/${req.params.projectId}`,
    req.body,
    { headers: req.headers }
  );
  res.json(response.data);
});
```

### MIGRATION STRATEGY:

1. **Phase 1**: Deploy new invoice system alongside existing
2. **Phase 2**: Update QuickInvoiceCreator to use new endpoints
3. **Phase 3**: Migrate existing invoice data to new schema
4. **Phase 4**: Remove old invoice logic

### TESTING:

1. **Unit Tests**: Test InvoiceBuilder and validation
2. **Integration Tests**: Test CRUD operations
3. **QB Integration Tests**: Test sync with sandbox
4. **Performance Tests**: Test with large datasets

### DEPLOYMENT CHECKLIST:

- [ ] Database indexes created
- [ ] Invoice routes added to main app
- [ ] Environment variables configured
- [ ] QuickBooks credentials updated
- [ ] Frontend components updated
- [ ] Data migration completed (if needed)
- [ ] Testing completed

### MONITORING:

Monitor these metrics:
- Invoice creation success rate
- QuickBooks sync success rate
- Payment processing time
- Outstanding invoice amounts
- Overdue invoice counts

This implementation provides a complete, production-ready invoice system that seamlessly integrates with your existing QuickBooks workflow while maintaining data consistency and providing excellent user experience.