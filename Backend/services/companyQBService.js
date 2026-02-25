/**
 * Company-Level QuickBooks Integration Service
 * Single QB account for All Roof Takeoffs with client-to-customer mapping
 */

const QuickBooks = require('node-quickbooks');
const CompanyQBSettings = require('../models/CompanyQBSettings');
const Client = require('../config/Client');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

class CompanyQBService {
  constructor() {
    this.qbo = null;
    this.settings = null;
    this.isInitialized = false;
  }

  /**
   * Initialize QB connection using company settings
   */
  async initialize() {
    try {
      this.settings = await CompanyQBSettings.getDefault();
      
      if (this.settings.isConnected() && !this.settings.needsTokenRefresh()) {
        this.qbo = new QuickBooks(
          process.env.QB_CLIENT_ID,
          process.env.QB_CLIENT_SECRET,
          this.settings.quickbooks.access_token,
          false, // not sandbox
          this.settings.quickbooks.realmId,
          process.env.QB_ENVIRONMENT === 'sandbox', // use sandbox based on env
          true, // debug
          null, // minor version
          '2.0', // oauth version
          this.settings.quickbooks.refresh_token
        );
        
        this.isInitialized = true;
        console.log('[QB SERVICE] Company QB Service initialized successfully');
        return true;
      } else {
        console.log('[QB SERVICE] QB not connected or token needs refresh');
        return false;
      }
    } catch (error) {
      console.error('[QB SERVICE] Failed to initialize QB service:', error.message);
      return false;
    }
  }

  /**
   * Get QuickBooks connection status
   */
  async getConnectionStatus() {
    try {
      if (!this.settings) {
        console.log('[QB SERVICE] Settings not loaded, initializing...');
        await this.initialize();
      }
      
      if (!this.settings) {
        console.log('[QB SERVICE] No settings found after initialization');
        return {
          connected: false,
          needsRefresh: true,
          lastSync: null,
          realmId: null,
          mappedClients: 0,
          syncStats: {}
        };
      }
      
      return {
        connected: this.settings.isConnected() || false,
        needsRefresh: this.settings.needsTokenRefresh() || true,
        lastSync: this.settings.quickbooks?.lastSync,
        realmId: this.settings.quickbooks?.realmId,
        mappedClients: this.settings.customerMappings?.length || 0,
        syncStats: this.settings.syncStats || {}
      };
    } catch (error) {
      console.error('[QB SERVICE] Error in getConnectionStatus:', error);
      throw error;
    }
  }

  /**
   * Sync all QB customers and map to MongoDB clients
   */
  async syncCustomersWithClients() {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) throw new Error('QB not connected');
    }

    try {
      console.log('🔄 Starting customer-to-client sync...');
      
      // Get all QB customers
      const qbCustomers = await this.getAllQBCustomers();
      console.log(`📊 Found ${qbCustomers.length} QB customers`);
      
      // Get all MongoDB clients
      const mongoClients = await Client.find({});
      console.log(`📊 Found ${mongoClients.length} MongoDB clients`);
      
      let mappingsFound = 0;
      let newMappings = 0;
      
      // Auto-map by name matching
      for (const client of mongoClients) {
        const existingMapping = this.settings.getClientMapping(client._id);
        
        if (!existingMapping) {
          // Try to find matching QB customer by name
          const matchingCustomer = this.findBestCustomerMatch(client, qbCustomers);
          
          if (matchingCustomer) {
            this.settings.customerMappings.push({
              mongoClientId: client._id,
              qbCustomerId: matchingCustomer.Id,
              qbCustomerName: matchingCustomer.Name,
              autoMapped: true,
              verified: false
            });
            newMappings++;
            console.log(`✅ Auto-mapped: ${client.name} → ${matchingCustomer.Name}`);
          } else {
            console.log(`⚠️ No QB customer found for client: ${client.name}`);
          }
        } else {
          mappingsFound++;
        }
      }
      
      // Save updated mappings
      await this.settings.save();
      
      console.log(`✅ Customer sync complete: ${mappingsFound} existing, ${newMappings} new mappings`);
      
      return {
        existingMappings: mappingsFound,
        newMappings: newMappings,
        unmappedClients: mongoClients.length - mappingsFound - newMappings,
        totalQBCustomers: qbCustomers.length
      };
      
    } catch (error) {
      console.error('❌ Customer sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Sync all invoices from QB to MongoDB
   */
  async syncAllInvoicesFromQB() {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) throw new Error('QB not connected');
    }

    try {
      console.log('🔄 Starting QB → MongoDB invoice sync...');
      const startTime = Date.now();
      
      // Get all QB invoices
      const qbInvoices = await this.getAllQBInvoices();
      console.log(`📊 Found ${qbInvoices.length} QB invoices to sync`);
      
      let created = 0;
      let updated = 0;
      let skipped = 0;
      
      for (const qbInvoice of qbInvoices) {
        try {
          const result = await this.syncSingleInvoiceFromQB(qbInvoice);
          
          if (result.created) created++;
          else if (result.updated) updated++;
          else skipped++;
          
        } catch (error) {
          console.error(`❌ Failed to sync invoice ${qbInvoice.Id}:`, error.message);
          skipped++;
        }
      }
      
      // Update sync stats
      const duration = Date.now() - startTime;
      this.settings.quickbooks.lastSync = new Date();
      this.settings.syncStats.lastSyncDuration = duration;
      this.settings.syncStats.totalInvoices = await Invoice.countDocuments();
      await this.settings.save();
      
      console.log(`✅ QB sync complete: ${created} created, ${updated} updated, ${skipped} skipped (${duration}ms)`);
      
      return { created, updated, skipped, duration };
      
    } catch (error) {
      console.error('❌ QB invoice sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Create invoice in QB from MongoDB data
   */
  async createInvoiceInQB(mongoInvoiceData) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) throw new Error('QB not connected');
    }

    try {
      console.log('🔄 Creating invoice in QB...', mongoInvoiceData.invoiceNumber);
      
      // Get client mapping
      const clientMapping = this.settings.getClientMapping(mongoInvoiceData.client);
      if (!clientMapping) {
        throw new Error(`Client ${mongoInvoiceData.client} not mapped to QB customer`);
      }
      
      // Build QB invoice object
      const qbInvoice = {
        CustomerRef: {
          value: clientMapping.qbCustomerId,
          name: clientMapping.qbCustomerName
        },
        DocNumber: mongoInvoiceData.invoiceNumber,
        TxnDate: mongoInvoiceData.date || new Date().toISOString().split('T')[0],
        DueDate: mongoInvoiceData.dueDate,
        
        Line: await this.buildQBLineItems(mongoInvoiceData.items),
        
        ...(this.settings.defaultSettings.terms && {
          SalesTermRef: { value: this.settings.defaultSettings.terms }
        }),
        
        CustomField: [{
          DefinitionId: "1",
          Name: "MongoDB ID",
          StringValue: mongoInvoiceData._id?.toString()
        }]
      };
      
      // Create in QB
      const createdInvoice = await new Promise((resolve, reject) => {
        this.qbo.createInvoice(qbInvoice, (err, invoice) => {
          if (err) reject(err);
          else resolve(invoice);
        });
      });
      
      console.log(`✅ Invoice created in QB: ${createdInvoice.DocNumber} (ID: ${createdInvoice.Id})`);
      
      // Update MongoDB with QB details
      if (mongoInvoiceData._id) {
        await Invoice.findByIdAndUpdate(mongoInvoiceData._id, {
          $set: {
            'integrationStatus.quickbooks': {
              qbInvoiceId: createdInvoice.Id,
              qbDocNumber: createdInvoice.DocNumber,
              qbSyncStatus: 'synced',
              qbLastSync: new Date(),
              createdInQB: true
            }
          }
        });
      }
      
      return {
        success: true,
        qbInvoiceId: createdInvoice.Id,
        qbDocNumber: createdInvoice.DocNumber,
        mongoInvoiceId: mongoInvoiceData._id
      };
      
    } catch (error) {
      console.error('❌ Failed to create QB invoice:', error.message);
      throw error;
    }
  }

  /**
   * Get all QB customers
   */
  async getAllQBCustomers() {
    return new Promise((resolve, reject) => {
      this.qbo.findCustomers((err, customers) => {
        if (err) reject(err);
        else resolve(customers?.QueryResponse?.Customer || []);
      });
    });
  }

  /**
   * Get all QB invoices
   */
  async getAllQBInvoices() {
    return new Promise((resolve, reject) => {
      this.qbo.findInvoices((err, invoices) => {
        if (err) reject(err);
        else resolve(invoices?.QueryResponse?.Invoice || []);
      });
    });
  }

  /**
   * Sync single QB invoice to MongoDB
   */
  async syncSingleInvoiceFromQB(qbInvoice) {
    // Get customer mapping
    const customerMapping = this.settings.getQBCustomerMapping(qbInvoice.CustomerRef?.value);
    
    if (!customerMapping) {
      console.warn(`⚠️ No client mapping for QB customer ${qbInvoice.CustomerRef?.name}`);
      return { skipped: true };
    }
    
    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({
      $or: [
        { 'integrationStatus.quickbooks.qbInvoiceId': qbInvoice.Id },
        { invoiceNumber: qbInvoice.DocNumber }
      ]
    });
    
    const invoiceData = {
      client: customerMapping.mongoClientId,
      invoiceNumber: qbInvoice.DocNumber || `QB-${qbInvoice.Id}`,
      date: qbInvoice.TxnDate ? new Date(qbInvoice.TxnDate) : new Date(),
      dueDate: qbInvoice.DueDate ? new Date(qbInvoice.DueDate) : null,
      
      amount: parseFloat(qbInvoice.TotalAmt || 0),
      subtotal: parseFloat(qbInvoice.TotalAmt || 0) / 1.1, // Assume 10% tax
      tax: parseFloat(qbInvoice.TotalAmt || 0) * 0.1,
      
      items: this.parseQBLineItems(qbInvoice.Line),
      
      status: this.mapQBStatus(qbInvoice),
      
      integrationStatus: {
        quickbooks: {
          qbInvoiceId: qbInvoice.Id,
          qbDocNumber: qbInvoice.DocNumber,
          qbSyncStatus: 'synced',
          qbLastSync: new Date(),
          sourceSystem: 'quickbooks'
        }
      }
    };
    
    if (existingInvoice) {
      await Invoice.findByIdAndUpdate(existingInvoice._id, { $set: invoiceData });
      return { updated: true, invoiceId: existingInvoice._id };
    } else {
      const newInvoice = new Invoice(invoiceData);
      await newInvoice.save();
      return { created: true, invoiceId: newInvoice._id };
    }
  }

  /**
   * Find best QB customer match for MongoDB client
   */
  findBestCustomerMatch(client, qbCustomers) {
    const clientName = client.name?.toLowerCase() || '';
    
    // Exact match first
    let match = qbCustomers.find(c => 
      c.Name?.toLowerCase() === clientName
    );
    
    // Fuzzy match if no exact match
    if (!match) {
      match = qbCustomers.find(c => {
        const qbName = c.Name?.toLowerCase() || '';
        return qbName.includes(clientName) || clientName.includes(qbName);
      });
    }
    
    return match;
  }

  /**
   * Parse QB line items to MongoDB format
   */
  parseQBLineItems(qbLines) {
    if (!Array.isArray(qbLines)) return [];
    
    return qbLines
      .filter(line => line.DetailType === 'SalesItemLineDetail')
      .map(line => ({
        description: line.SalesItemLineDetail?.ItemRef?.name || 'Service',
        quantity: parseFloat(line.SalesItemLineDetail?.Qty || 1),
        rate: parseFloat(line.SalesItemLineDetail?.UnitPrice || 0),
        amount: parseFloat(line.Amount || 0)
      }));
  }

  /**
   * Build QB line items from MongoDB format
   */
  async buildQBLineItems(mongoItems) {
    if (!Array.isArray(mongoItems)) {
      return [{
        Amount: 100.00,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: { value: "1", name: "Services" },
          Qty: 1,
          UnitPrice: 100.00
        }
      }];
    }
    
    return mongoItems.map((item, index) => ({
      LineNum: index + 1,
      Amount: parseFloat(item.amount || item.rate || 0),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: { value: "1", name: "Services" },
        Qty: parseFloat(item.quantity || 1),
        UnitPrice: parseFloat(item.rate || item.amount || 0)
      }
    }));
  }

  /**
   * Map QB invoice status to MongoDB status
   */
  mapQBStatus(qbInvoice) {
    const balance = parseFloat(qbInvoice.Balance || 0);
    const total = parseFloat(qbInvoice.TotalAmt || 0);
    
    if (balance === 0 && total > 0) return 'paid';
    if (balance > 0 && balance < total) return 'partially_paid';
    if (balance === total) return 'sent';
    return 'draft';
  }
}

module.exports = new CompanyQBService();