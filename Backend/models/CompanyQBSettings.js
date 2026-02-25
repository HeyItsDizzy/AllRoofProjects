/**
 * Company QuickBooks Settings Schema
 * Single company-level QuickBooks integration (not per-client)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const companyQBSettingsSchema = new Schema({
  // Company identification
  companyName: {
    type: String,
    required: true,
    default: 'All Roof Takeoffs'
  },
  
  // QuickBooks OAuth credentials
  quickbooks: {
    // OAuth tokens
    access_token: { type: String },
    refresh_token: { type: String },
    token_type: { type: String, default: 'Bearer' },
    expires_in: { type: Number },
    access_token_expires_at: { type: Date },
    
    // QB Company info
    realmId: { type: String }, // QB Company ID
    base_uri: { type: String },
    
    // Connection status
    connected: { type: Boolean, default: false },
    lastConnected: { type: Date },
    lastSync: { type: Date },
    
    // Sync settings
    syncFrequency: { type: String, enum: ['manual', 'hourly', 'daily'], default: 'daily' },
    autoSyncEnabled: { type: Boolean, default: true },
    
    // Error tracking
    lastSyncError: { type: String },
    consecutiveFailures: { type: Number, default: 0 }
  },
  
  // Client-to-Customer mapping
  customerMappings: [{
    mongoClientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    qbCustomerId: { type: String }, // QB Customer ID
    qbCustomerName: { type: String }, // QB Customer display name
    mappedAt: { type: Date, default: Date.now },
    autoMapped: { type: Boolean, default: false }, // Was this auto-mapped by name?
    verified: { type: Boolean, default: false } // Has this mapping been verified?
  }],
  
  // Sync statistics
  syncStats: {
    totalInvoices: { type: Number, default: 0 },
    lastSyncDuration: { type: Number }, // milliseconds
    invoicesCreated: { type: Number, default: 0 },
    invoicesUpdated: { type: Number, default: 0 },
    customersCreated: { type: Number, default: 0 },
    customersUpdated: { type: Number, default: 0 }
  },
  
  // Default QB settings for invoice creation
  defaultSettings: {
    // Default terms for new invoices
    terms: { type: String, default: '7 Days' },
    
    // Default tax settings
    taxable: { type: Boolean, default: true },
    taxRate: { type: Number, default: 0.10 },
    
    // Default accounts
    incomeAccount: { type: String },
    taxAccount: { type: String },
    
    // Invoice template settings
    templateId: { type: String },
    emailSettings: {
      sendAutomatically: { type: Boolean, default: false },
      ccEmails: [{ type: String }],
      customMessage: { type: String }
    }
  }
}, {
  timestamps: true
});

// Indexes
companyQBSettingsSchema.index({ companyName: 1 });
companyQBSettingsSchema.index({ 'customerMappings.mongoClientId': 1 });
companyQBSettingsSchema.index({ 'customerMappings.qbCustomerId': 1 });

// Instance methods
companyQBSettingsSchema.methods.isConnected = function() {
  return !!(this.quickbooks?.access_token && this.quickbooks?.realmId);
};

companyQBSettingsSchema.methods.needsTokenRefresh = function() {
  if (!this.quickbooks?.access_token_expires_at) return true;
  return new Date() >= new Date(this.quickbooks.access_token_expires_at);
};

companyQBSettingsSchema.methods.getClientMapping = function(clientId) {
  return this.customerMappings.find(m => m.mongoClientId.toString() === clientId.toString());
};

companyQBSettingsSchema.methods.getQBCustomerMapping = function(qbCustomerId) {
  return this.customerMappings.find(m => m.qbCustomerId === qbCustomerId);
};

// Static methods
companyQBSettingsSchema.statics.getDefault = async function() {
  let settings = await this.findOne({ companyName: 'All Roof Takeoffs' });
  
  if (!settings) {
    settings = new this({
      companyName: 'All Roof Takeoffs'
    });
    await settings.save();
  }
  
  return settings;
};

const CompanyQBSettings = mongoose.model('CompanyQBSettings', companyQBSettingsSchema);

module.exports = CompanyQBSettings;