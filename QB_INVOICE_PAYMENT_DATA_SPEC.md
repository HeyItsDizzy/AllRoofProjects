# 📊 QuickBooks Invoice & Payment Sync - Complete Data Fields

## 🔍 **INVOICE FIELDS CAPTURED**

### **QuickBooks Transaction List Fields** (matching your screenshot):
- ✅ **DATE** - `invoiceDate` from QB `TxnDate`
- ✅ **TYPE** - Always "Invoice"
- ✅ **NO.** - `invoiceNumber` from QB `DocNumber`
- ✅ **CUSTOMER** - `customerName` from your client data
- ✅ **MEMO** - `memo` from QB `PrivateNote` or `CustomerMemo`
- ✅ **AMOUNT** - `total` from QB `TotalAmt`
- ✅ **STATUS** - Enhanced mapping (Paid, Partial, Overdue, Sent)
- ✅ **ACTION** - View/Edit, Receive payment, Print buttons

### **Complete Invoice Metadata Captured**:
```javascript
// Basic Invoice Data
invoiceNumber: "2155"
customerName: "Cloudbreak Roofing" 
invoiceDate: "2026-01-02"
dueDate: "2026-01-09"
total: 231.00
balanceDue: 231.00
status: "Overdue" // Smart calculation based on due date

// Enhanced QB Fields
quickbooks: {
  id: "123",
  syncToken: "0",
  emailStatus: "EmailSent",
  printStatus: "NeedToPrint", 
  allowOnlinePayment: true,
  allowOnlineCreditCardPayment: true,
  customerRef: { value: "1", name: "Cloudbreak Roofing" },
  currencyRef: { value: "AUD", name: "Australian Dollar" },
  metaData: {
    createTime: "2026-01-02T09:00:00Z",
    lastUpdatedTime: "2026-01-02T09:00:00Z"
  },
  linkedTxn: [] // Any linked transactions
}

// Line Items Detail
lineItems: [
  {
    productService: "Roof Takeoff",
    description: "Detailed roof measurements and calculations",
    quantity: 1.00,
    rate: 210.00,
    amount: 210.00,
    taxable: true,
    taxCode: "GST"
  }
]
```

---

## 💳 **PAYMENT FIELDS CAPTURED** 

### **QuickBooks Transaction List Fields**:
- ✅ **DATE** - `paymentDate` from QB `TxnDate`
- ✅ **TYPE** - Always "Payment"  
- ✅ **NO.** - "—" (payments don't have document numbers)
- ✅ **CUSTOMER** - `customerName`
- ✅ **MEMO** - Shows which invoices payment was applied to
- ✅ **AMOUNT** - `totalAmount` from QB `TotalAmt`
- ✅ **STATUS** - "Closed" (payments are typically deposited)
- ✅ **ACTION** - View payment details

### **Complete Payment Metadata Captured**:
```javascript
// Basic Payment Data  
paymentNumber: "PMT-001"
customerName: "Cloudbreak Roofing"
paymentDate: "2026-01-08"
totalAmount: 132.00
memo: "Payment for Invoice 2155"
paymentMethod: "Credit Card"

// CRITICAL: Invoice-to-Payment Linking
invoiceApplications: [
  {
    qbInvoiceId: "123",           // Links to specific QB invoice
    invoiceNumber: "2155",       // Human-readable reference
    appliedAmount: 132.00,       // Amount applied to this invoice
    applicationDate: "2026-01-08"
  }
]

// Enhanced QB Fields
quickbooks: {
  id: "456",
  syncToken: "0", 
  paymentMethodRef: { value: "1", name: "Credit Card" },
  depositToAccountRef: { value: "35", name: "Checking Account" },
  customerRef: { value: "1", name: "Cloudbreak Roofing" },
  linkedTxn: [
    {
      txnId: "123",              // References the invoice QB ID
      txnType: "Invoice",
      amount: 132.00
    }
  ]
}
```

---

## 🔗 **INVOICE-PAYMENT LINKAGE SYSTEM**

### **How Payments are Linked to Invoices**:

1. **QB LinkedTxn Field** - Contains array of linked transactions
2. **Invoice Applications** - Each payment shows exactly which invoices it pays
3. **Cross-Reference IDs** - Use QB invoice/payment IDs for precise matching

### **Example Linkage**:
```javascript
// Invoice Record
{
  _id: "mongo_invoice_id_1",
  invoiceNumber: "2155", 
  total: 231.00,
  balanceDue: 99.00,      // 231 - 132 = 99 remaining
  quickbooks: { id: "123" }
}

// Payment Record  
{
  _id: "mongo_payment_id_1",
  paymentNumber: "PMT-001",
  totalAmount: 132.00,
  invoiceApplications: [
    {
      qbInvoiceId: "123",        // Links to invoice above
      invoiceNumber: "2155",
      appliedAmount: 132.00      // Partial payment
    }
  ]
}
```

### **Frontend Display Logic**:
- **Invoice Row**: Shows "A$132.00 paid" in memo column
- **Payment Row**: Shows "Applied to: #2155: A$132.00" in memo column
- **Status**: Invoice shows "Partial" since balance due > 0

---

## 📋 **UNIFIED TRANSACTION LIST**

### **Combined Display** (matching your QB screenshot):
```
DATE     TYPE     NO.   CUSTOMER           MEMO                    AMOUNT     STATUS
8/2/26   Payment   —    Cloudbreak Roofing Applied to: #2133     A$132.00   ✅ Closed
1/2/26   Invoice   2155 Cloudbreak Roofing                       A$231.00   ⚠️ Overdue 4 days  
26/1/26  Payment   —    Cloudbreak Roofing Applied to: #2142     A$66.00    ✅ Closed
26/1/26  Invoice   2142 Cloudbreak Roofing Roof inspection       A$313.50   ⚠️ Overdue 10 days
```

### **API Endpoint**: `GET /api/invoices/transactions`
- Returns unified list of invoices AND payments 
- Sorted by date (most recent first)
- Includes all QB metadata and linkage information
- Supports filtering by date range, status, customer

---

## 🔄 **SYNC SCHEDULE**

### **Automatic Syncing**:
- **Weekly Full Sync**: Every Sunday 2 AM - All invoices & payments
- **Daily Incremental**: Every day 6 AM - Recent changes only
- **Manual Sync**: "🔄 Sync QB" button - On-demand full sync

### **Sync Results Example**:
```javascript
{
  totalInvoices: 15,
  newInvoices: 3,
  updatedInvoices: 2, 
  totalPayments: 8,
  newPayments: 1,
  updatedPayments: 0
}
```

---

## ✅ **SECURITY & PERFORMANCE BENEFITS**

1. **🔒 Data Control**: Your invoice/payment data stored securely in your MongoDB
2. **⚡ Fast Queries**: No QB API calls for viewing - instant local queries 
3. **💰 Cost Effective**: Reduces QB API usage from every page load to weekly sync
4. **📊 Enhanced Reporting**: Local data enables custom analytics and reporting
5. **🛡️ Risk Reduction**: No direct QB API access in frontend - safer architecture

**🎯 You now have complete QuickBooks invoice AND payment data with precise linkage, displayed in the exact same format as your QB transaction list!**