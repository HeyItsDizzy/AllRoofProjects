// quickbooksSyncService.js - Handles QB ↔ MongoDB synchronization
/* Ensures data consistency between QuickBooks and your MongoDB */

class QuickBooksSyncService {
  constructor() {
    this.lastSyncTime = localStorage.getItem('last_qb_sync') || null;
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
    this.webhookEnabled = true;
  }

  // STRATEGY 1: Real-time Webhooks (RECOMMENDED)
  async setupWebhooks() {
    try {
      const webhookUrl = `${process.env.REACT_APP_API_URL}/api/quickbooks/webhooks`;
      
      const webhookConfig = {
        eventTypes: [
          'Customer.Create',
          'Customer.Update',
          'Invoice.Create', 
          'Invoice.Update',
          'Payment.Create',
          'Payment.Update'
        ],
        callbackUrl: webhookUrl
      };

      const response = await fetch('/api/quickbooks/webhooks/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAccessToken()}`
        },
        body: JSON.stringify(webhookConfig)
      });

      if (response.ok) {
        console.log('✅ QuickBooks webhooks configured successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to setup QB webhooks:', error);
      return false;
    }
  }

  // STRATEGY 2: Polling Sync (Fallback)
  async startPollingSync() {
    setInterval(async () => {
      await this.performIncrementalSync();
    }, this.syncInterval);
  }

  // INCREMENTAL SYNC - Only sync changes since last sync
  async performIncrementalSync() {
    try {
      const lastSync = this.lastSyncTime ? new Date(this.lastSyncTime) : new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      console.log(`🔄 Starting incremental sync since ${lastSync.toISOString()}`);

      // Sync customers that changed since last sync
      await this.syncCustomers(lastSync);
      
      // Sync invoices that changed since last sync
      await this.syncInvoices(lastSync);
      
      // Sync payments that changed since last sync
      await this.syncPayments(lastSync);

      // Update last sync time
      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem('last_qb_sync', this.lastSyncTime);
      
      console.log('✅ Incremental sync completed successfully');
      
    } catch (error) {
      console.error('❌ Incremental sync failed:', error);
    }
  }

  // FULL SYNC - Complete data refresh
  async performFullSync() {
    try {
      console.log('🔄 Starting full sync...');
      
      await this.syncCustomers();
      await this.syncInvoices();
      await this.syncPayments();
      
      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem('last_qb_sync', this.lastSyncTime);
      
      console.log('✅ Full sync completed successfully');
      
    } catch (error) {
      console.error('❌ Full sync failed:', error);
    }
  }

  // SYNC INDIVIDUAL DATA TYPES
  async syncCustomers(since = null) {
    const query = since ? `?changedSince=${since.toISOString()}` : '';
    
    try {
      const response = await fetch(`/api/quickbooks/customers${query}`, {
        headers: { 'Authorization': `Bearer ${this.getAccessToken()}` }
      });
      
      const qbCustomers = await response.json();
      
      // Update MongoDB with QB customer data
      for (const customer of qbCustomers) {
        await fetch('/api/customers/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qbId: customer.Id,
            qbData: customer,
            lastSynced: new Date()
          })
        });
      }
      
      console.log(`✅ Synced ${qbCustomers.length} customers`);
      
    } catch (error) {
      console.error('❌ Customer sync failed:', error);
    }
  }

  async syncInvoices(since = null) {
    const query = since ? `?changedSince=${since.toISOString()}` : '';
    
    try {
      const response = await fetch(`/api/quickbooks/invoices${query}`, {
        headers: { 'Authorization': `Bearer ${this.getAccessToken()}` }
      });
      
      const qbInvoices = await response.json();
      
      // Update MongoDB with QB invoice data + project mappings
      for (const invoice of qbInvoices) {
        await fetch('/api/invoices/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qbId: invoice.Id,
            qbData: invoice,
            projectMapping: await this.findProjectMapping(invoice),
            lastSynced: new Date()
          })
        });
      }
      
      console.log(`✅ Synced ${qbInvoices.length} invoices`);
      
    } catch (error) {
      console.error('❌ Invoice sync failed:', error);
    }
  }

  async syncPayments(since = null) {
    const query = since ? `?changedSince=${since.toISOString()}` : '';
    
    try {
      const response = await fetch(`/api/quickbooks/payments${query}`, {
        headers: { 'Authorization': `Bearer ${this.getAccessToken()}` }
      });
      
      const qbPayments = await response.json();
      
      // Update MongoDB with QB payment data
      for (const payment of qbPayments) {
        await fetch('/api/payments/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qbId: payment.Id,
            qbData: payment,
            lastSynced: new Date()
          })
        });
      }
      
      console.log(`✅ Synced ${qbPayments.length} payments`);
      
    } catch (error) {
      console.error('❌ Payment sync failed:', error);
    }
  }

  // PROJECT MAPPING LOGIC
  async findProjectMapping(qbInvoice) {
    // Try to match QB invoice to your project
    const projectNumber = qbInvoice.CustomField?.find(f => f.Name === 'ProjectNumber')?.StringValue;
    
    if (projectNumber) {
      try {
        const response = await fetch(`/api/projects/by-number/${projectNumber}`);
        if (response.ok) {
          const project = await response.json();
          return {
            projectId: project._id,
            projectNumber: project.projectNumber,
            projectName: project.projectName
          };
        }
      } catch (error) {
        console.error('Error finding project mapping:', error);
      }
    }
    
    return null;
  }

  // WEBHOOK HANDLERS (for your backend)
  handleWebhook(event) {
    switch (event.eventType) {
      case 'Customer.Create':
      case 'Customer.Update':
        this.syncSpecificCustomer(event.entityId);
        break;
        
      case 'Invoice.Create':
      case 'Invoice.Update':
        this.syncSpecificInvoice(event.entityId);
        break;
        
      case 'Payment.Create':
      case 'Payment.Update':
        this.syncSpecificPayment(event.entityId);
        break;
    }
  }

  // CONFLICT RESOLUTION
  async resolveConflicts(localData, qbData) {
    // QuickBooks is always the source of truth for financial data
    // Your MongoDB is source of truth for project mappings and custom fields
    
    return {
      ...qbData,
      projectMapping: localData.projectMapping,
      customFields: localData.customFields,
      userNotes: localData.userNotes
    };
  }

  // UTILITY METHODS
  getAccessToken() {
    return localStorage.getItem('qb_access_token');
  }

  async checkSyncHealth() {
    const timeSinceLastSync = this.lastSyncTime ? 
      Date.now() - new Date(this.lastSyncTime).getTime() : 
      Infinity;
    
    return {
      isHealthy: timeSinceLastSync < this.syncInterval * 2,
      lastSyncTime: this.lastSyncTime,
      timeSinceLastSync: timeSinceLastSync,
      webhooksEnabled: this.webhookEnabled
    };
  }
}

export default new QuickBooksSyncService();