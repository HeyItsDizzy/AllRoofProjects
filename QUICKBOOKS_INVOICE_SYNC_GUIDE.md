# QuickBooks Invoice Sync System

## 🎯 **Overview**

This system provides secure, controlled access to QuickBooks invoice data by storing it locally in MongoDB and syncing periodically instead of making direct API calls every time.

## ✅ **Benefits**

- **🔒 Security**: Your invoice data is stored securely in your own MongoDB database
- **⚡ Performance**: Fast queries from local database instead of QB API calls
- **💰 Cost Control**: Reduces QuickBooks API usage and potential rate limiting
- **🛡️ Data Control**: You control exactly what invoice data is stored and displayed
- **📊 Better Reporting**: Local data enables advanced analytics and custom reports

## 🏗️ **Architecture**

```
QuickBooks API → Sync Service → MongoDB → Your App Frontend
               (Weekly/Manual)          (Fast Local Queries)
```

### **Data Flow:**
1. **Weekly Sync**: Automated sync every Sunday at 2 AM
2. **Daily Incremental**: Small sync every day at 6 AM for recent changes  
3. **Manual Sync**: On-demand sync via UI button or API call
4. **Fast Queries**: Frontend reads from local MongoDB (no QB API calls)

## 📚 **API Endpoints**

### Sync Operations
- `POST /api/invoices/sync` - Sync all connected clients
- `POST /api/invoices/sync/:clientId` - Sync specific client
- `GET /api/invoices/sync/status` - Get sync status for all clients

### Local Data Access  
- `GET /api/invoices/local` - Get invoices for current user's client
- `GET /api/invoices/local/:invoiceId` - Get specific invoice
- `GET /api/invoices/local/stats/:clientId?` - Get invoice statistics

## 🔄 **Automatic Syncing**

### **Weekly Full Sync**
```cron
0 2 * * 0  # Every Sunday at 2:00 AM
```
- Syncs all invoices for all connected QB clients
- Handles new invoices, updates, and payments
- Updates client sync status

### **Daily Incremental Sync**
```cron  
0 6 * * *  # Every day at 6:00 AM
```
- Only syncs invoices modified in last 24 hours
- Faster sync for recent changes
- Keeps data fresh without full sync overhead

## 🎮 **Manual Operations**

### **Via Frontend UI**
- Click "🔄 Sync QB" button in Invoice Feed (when QB connected)
- Shows progress and results in popup
- Automatically refreshes invoice list after sync

### **Via CLI/Terminal**
```bash
# From backend directory
npm run sync:invoices

# Or direct node command
node -e "require('./services/quickbooksInvoiceSyncService').syncAllClientInvoices().then(r => console.log('Sync complete:', r))"
```

## 📋 **Database Schema**

### **Invoice Collection**
```javascript
{
  // Basic invoice data
  invoiceNumber: "INV-1001",
  customerId: ObjectId("..."), // Reference to client
  customerName: "Client Name",
  total: 1500.00,
  balanceDue: 500.00,
  status: "Partial",
  invoiceDate: Date,
  dueDate: Date,
  
  // QuickBooks sync metadata
  quickbooks: {
    id: "123",              // QB Invoice ID
    syncToken: "0",         // QB sync token
    lastSynced: Date,       // Last sync timestamp
    balance: 500.00         // QB balance amount
  },
  
  // Line items and payments
  lineItems: [...],
  payments: [...]
}
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
QB_CLIENT_ID=your_qb_client_id
QB_CLIENT_SECRET=your_qb_client_secret  
QB_REDIRECT_URI=your_redirect_uri
NODE_ENV=production  # or 'development' for sandbox
```

### **Database Indexes**
The system automatically creates these indexes for performance:
- `invoiceNumber` (unique)
- `customerId + status` (compound)
- `quickbooks.id` (QB reference)
- `invoiceDate` (date range queries)

## 🚀 **Getting Started**

1. **Ensure QB Connection**: Make sure your clients have connected their QuickBooks accounts
2. **Run Initial Sync**: Click "🔄 Sync QB" to populate local database
3. **Switch to Live Mode**: Use "Live QuickBooks" data source to see real data
4. **Monitor Sync Status**: Check sync status via `/api/invoices/sync/status`

## ⚠️ **Important Notes**

### **QB Token Management**
- Tokens are automatically refreshed when expired
- Failed token refresh disables sync for that client
- Check QB connection status in settings if sync fails

### **Data Consistency**
- Local data reflects QB state at last sync time
- Manual sync ensures up-to-date data when needed
- Sync frequency can be adjusted via cron schedule

### **Error Handling**
- Individual client sync failures don't affect other clients
- Detailed error logging for troubleshooting
- Sync status tracking per client

## 🐛 **Troubleshooting**

### **Sync Not Working**
1. Check QB token validity: `/api/invoices/sync/status`
2. Verify client QB connection in settings
3. Check server logs for detailed error messages
4. Try manual sync for specific client first

### **Missing Invoices**  
1. Check sync date range (defaults to last 30 days for first sync)
2. Run full sync: `POST /api/invoices/sync` with `{"fullSync": true}`
3. Verify invoices exist in QuickBooks
4. Check invoice date filters in frontend

### **Performance Issues**
1. Monitor database indexes
2. Verify cron jobs aren't overlapping  
3. Consider adjusting sync frequency
4. Check MongoDB query performance

## 📊 **Monitoring**

### **Sync Status Dashboard**
- Access sync status via API: `GET /api/invoices/sync/status`
- Shows last sync time, status, and error details for each client
- Invoice counts and recent activity

### **Logging**
- All sync operations are logged with timestamps
- Error details captured for failed syncs
- Performance metrics for large syncs

---

**🎉 Your QuickBooks invoice data is now automatically synced and securely stored locally!**