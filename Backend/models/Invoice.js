/**
 * Invoice Schema - MongoDB Model
 * Aligned with QuickBooks invoice structure for seamless integration
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const lineItemSchema = new Schema({
  lineNumber: { 
    type: Number, 
    required: true 
  },
  serviceDate: { 
    type: Date, 
    default: Date.now 
  },
  productService: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  rate: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  taxable: { 
    type: Boolean, 
    default: true 
  },
  taxCode: { 
    type: String, 
    enum: ['GST', 'Tax Free', 'Out of Scope'], 
    default: 'GST' 
  }
}, { _id: false });

const billingAddressSchema = new Schema({
  street: String,
  city: String,
  state: String,
  postalCode: String,
  country: { type: String, default: 'Australia' }
}, { _id: false });

const paymentOptionsSchema = new Schema({
  acceptCards: { type: Boolean, default: false },
  paypalEnabled: { type: Boolean, default: false },
  ccEmails: [String], // CC/BCC email addresses
}, { _id: false });

const invoiceSchema = new Schema({
  // Invoice Identification
  invoiceNumber: { 
    type: String, 
    required: true, 
    unique: true 
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
  customerEmail: { 
    type: String, 
    required: true 
  },
  
  // Dates & Terms
  invoiceDate: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  dueDate: { 
    type: Date, 
    required: true 
  },
  terms: { 
    type: String, 
    enum: ['Due on receipt', '7 Days', '14 Days', '30 Days', '60 Days', 'EOM', 'Net 30'], 
    default: '7 Days' 
  },
  
  // Address Information
  billingAddress: billingAddressSchema,
  
  // Payment Configuration
  paymentOptions: paymentOptionsSchema,
  
  // Line Items
  lineItems: {
    type: [lineItemSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Invoice must have at least one line item'
    }
  },
  
  // Financial Calculations
  subtotal: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  taxRate: { 
    type: Number, 
    default: 0.10 // 10% GST
  },
  taxAmount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  total: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  balanceDue: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  
  // Tax Configuration
  amountsAre: { 
    type: String, 
    enum: ['Exclusive of Tax', 'Inclusive of Tax'], 
    default: 'Exclusive of Tax' 
  },
  
  // Content & Messages
  invoiceMessage: { 
    type: String, 
    default: '' 
  },
  
  // Status Management
  status: { 
    type: String, 
    enum: ['Draft', 'Sent', 'Viewed', 'Partial', 'Paid', 'Overdue', 'Void'], 
    default: 'Draft' 
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  sentAt: Date,
  viewedAt: Date,
  paidAt: Date,
  
  // QuickBooks Integration & Source Tracking
  quickbooks: {
    id: String,           // QuickBooks Invoice ID
    syncToken: String,    // QB sync token for updates
    status: String,       // QB-specific status
    lastSynced: Date,     // Last sync with QB
    txnDate: Date,        // QB transaction date
    docNumber: String,    // QB document number
    balance: Number       // QB balance amount
  },
  
  // Source tracking for multi-source data
  dataSource: {
    type: String,
    enum: ['local', 'quickbooks_api', 'quickbooks_csv', 'manual'],
    default: 'local'
  },
  
  // CSV Import compatibility
  qb_invoice_number: {
    type: String,
    sparse: true         // Allows null/undefined values
  },
  qb_source: String,      // Source indicator for QB imports
  ar_paid_status: String, // A/R Paid status from QB
  sent_status: String,    // Sent status from QB
  open_balance: Number,   // Open balance from QB
  terms_text: String,     // Original terms text from QB
  
  // Import metadata
  imported_from: String,  // Source of import
  import_date: Date,      // When it was imported
  
  // Project Association
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project' 
  },
  projectNumber: String,
  
  // Payment Tracking
  payments: [{
    amount: Number,
    date: Date,
    method: String,       // 'Card', 'Bank Transfer', 'Cash', 'PayPal'
    reference: String,
    quickbooksPaymentId: String
  }]
});

// Index for performance
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ customerId: 1, status: 1 });
invoiceSchema.index({ projectId: 1 });
invoiceSchema.index({ 'quickbooks.id': 1 });
invoiceSchema.index({ qb_invoice_number: 1 }, { sparse: true });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ dataSource: 1, status: 1 });
invoiceSchema.index({ customer_name: 1 }, { sparse: true });

// Auto-update updatedAt on save
invoiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate totals before saving
invoiceSchema.pre('save', function(next) {
  if (this.lineItems && this.lineItems.length > 0) {
    // Calculate line item amounts
    this.lineItems.forEach(item => {
      item.amount = item.quantity * item.rate;
    });
    
    // Calculate subtotal
    this.subtotal = this.lineItems.reduce((sum, item) => sum + item.amount, 0);
    
    // Calculate tax amount (only on taxable items)
    const taxableAmount = this.lineItems
      .filter(item => item.taxable)
      .reduce((sum, item) => sum + item.amount, 0);
    
    this.taxAmount = Math.round(taxableAmount * this.taxRate * 100) / 100;
    
    // Calculate total
    this.total = this.subtotal + this.taxAmount;
    
    // Set balance due (subtract payments)
    const totalPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
    this.balanceDue = this.total - totalPaid;
  }
  next();
});

// Virtual for formatted invoice number
invoiceSchema.virtual('formattedNumber').get(function() {
  return `INV-${this.invoiceNumber}`;
});

// Virtual for overdue status
invoiceSchema.virtual('isOverdue').get(function() {
  return this.status !== 'Paid' && this.dueDate < new Date();
});

// Static method to generate next invoice number
invoiceSchema.statics.generateInvoiceNumber = async function() {
  const lastInvoice = await this.findOne({}, {}, { sort: { 'createdAt': -1 } });
  const nextNumber = lastInvoice ? 
    parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) + 1 : 
    1000;
  return nextNumber.toString().padStart(4, '0');
};

module.exports = mongoose.model('Invoice', invoiceSchema);