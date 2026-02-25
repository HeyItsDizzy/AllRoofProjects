/**
 * Payment Schema - MongoDB Model for QB Payment Records
 * Links payments to specific invoices for complete transaction tracking
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
  // Payment Identification
  paymentNumber: { 
    type: String, 
    required: true 
  },
  
  // Customer Information
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client', 
    required: true 
  },
  customerName: { 
    type: String, 
    required: true 
  },
  
  // Payment Details
  paymentDate: { 
    type: Date, 
    required: true 
  },
  totalAmount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  memo: { 
    type: String, 
    default: '' 
  },
  
  // Payment Method
  paymentMethod: { 
    type: String, 
    enum: ['Cash', 'Check', 'Credit Card', 'Bank Transfer', 'Electronic Transfer', 'PayPal', 'Other'],
    default: 'Other'
  },
  paymentReference: { 
    type: String, 
    default: '' 
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['Deposited', 'Pending', 'Cleared', 'Bounced', 'Void'],
    default: 'Deposited'
  },
  
  // Invoice Applications (which invoices this payment applies to)
  invoiceApplications: [{
    invoiceId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Invoice' 
    },
    qbInvoiceId: String,    // QuickBooks Invoice ID
    invoiceNumber: String,  // For easy reference
    appliedAmount: Number,  // Amount applied to this specific invoice
    applicationDate: Date
  }],
  
  // Unapplied amount (credit on account)
  unappliedAmount: { 
    type: Number, 
    default: 0 
  },
  
  // QuickBooks Integration Data
  quickbooks: {
    id: String,              // QB Payment ID
    syncToken: String,       // QB sync token
    txnDate: Date,          // QB transaction date
    docNumber: String,      // QB document number
    lastSynced: Date,       // Last sync timestamp
    privateNote: String,    // QB private note/memo
    customerMemo: String,   // Customer-facing memo
    depositToAccountRef: {  // Which account payment was deposited to
      value: String,
      name: String
    },
    linkedTxn: [{           // All linked transactions from QB
      txnId: String,
      txnType: String,      // 'Invoice', etc.
      txnLineId: String,
      amount: Number
    }]
  },
  
  // Source tracking and CSV import compatibility  
  dataSource: {
    type: String,
    enum: ['local', 'quickbooks_api', 'quickbooks_csv', 'manual'],
    default: 'local'
  },
  qb_invoice_number: {     // Original QB invoice number from CSV
    type: String,
    sparse: true
  },
  qb_source: String,       // Source indicator for QB imports
  imported_from: String,   // Source of import
  import_date: Date,       // When it was imported
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Indexes for performance
paymentSchema.index({ customerId: 1, paymentDate: -1 });
paymentSchema.index({ 'quickbooks.id': 1 });
paymentSchema.index({ qb_invoice_number: 1 }, { sparse: true });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ 'invoiceApplications.invoiceId': 1 });
paymentSchema.index({ dataSource: 1, status: 1 });

// Auto-update timestamp
paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for total applied amount
paymentSchema.virtual('totalAppliedAmount').get(function() {
  return this.invoiceApplications.reduce((sum, app) => sum + app.appliedAmount, 0);
});

module.exports = mongoose.model('Payment', paymentSchema);