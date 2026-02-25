/**
 * QuickBooks Invoice Sync Service
 * Handles syncing QB invoices to MongoDB with client organization
 */

const IntuitOAuth = require('intuit-oauth');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Client = require('../config/Client'); // Reference client schema from config

class QuickBooksInvoiceSyncService {
  constructor() {
    this.oauthClient = new IntuitOAuth({
      clientId: process.env.QB_CLIENT_ID,
      clientSecret: process.env.QB_CLIENT_SECRET,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      redirectUri: process.env.QB_REDIRECT_URI,
    });
  }

  /**
   * Main sync function - syncs all invoices for all connected clients
   * @param {Object} options - Sync options
   * @returns {Object} Sync results
   */
  async syncAllClientInvoices(options = {}) {
    console.log('🔄 Starting QuickBooks invoice sync...');
    
    const results = {
      totalClients: 0,
      successfulClients: 0,
      totalInvoices: 0,
      newInvoices: 0,
      updatedInvoices: 0,
      errors: []
    };

    try {
      // Find all clients with QB connection
      const connectedClients = await Client.find({
        'quickbooks.access_token': { $exists: true, $ne: null },
        'quickbooks.realmId': { $exists: true, $ne: null }
      });

      results.totalClients = connectedClients.length;
      console.log(`📊 Found ${connectedClients.length} connected QB clients`);

      // Sync invoices for each client
      for (const client of connectedClients) {
        try {
          const clientResult = await this.syncClientInvoices(client, options);
          results.successfulClients++;
          results.totalInvoices += clientResult.totalInvoices;
          results.newInvoices += clientResult.newInvoices;
          results.updatedInvoices += clientResult.updatedInvoices;
          
          console.log(`✅ Synced ${clientResult.totalInvoices} invoices for ${client.name}`);
        } catch (error) {
          console.error(`❌ Failed to sync client ${client.name}:`, error);
          results.errors.push({
            clientId: client._id,
            clientName: client.name,
            error: error.message
          });
        }
      }

      console.log('🏁 Sync completed:', results);
      return results;

    } catch (error) {
      console.error('💥 Critical sync error:', error);
      throw error;
    }
  }

  /**
   * Sync invoices for a specific client
   * @param {Object} client - Client document with QB credentials
   * @param {Object} options - Sync options
   */
  async syncClientInvoices(client, options = {}) {
    const { forceFullSync = false, dateFrom = null, dateTo = null } = options;
    
    // Set up OAuth client with this client's tokens
    this.oauthClient.token.access_token = client.quickbooks.access_token;
    this.oauthClient.token.refresh_token = client.quickbooks.refresh_token;
    this.oauthClient.token.realmId = client.quickbooks.realmId;

    // Refresh token if needed
    if (this.isTokenExpired(client.quickbooks)) {
      await this.refreshClientToken(client);
    }

    const results = {
      clientId: client._id,
      clientName: client.name,
      totalInvoices: 0,
      newInvoices: 0,
      updatedInvoices: 0,
      totalPayments: 0,
      newPayments: 0,
      updatedPayments: 0
    };

    try {
      // Sync invoices
      const invoiceResults = await this.syncClientInvoicesOnly(client, options);
      results.totalInvoices = invoiceResults.totalInvoices;
      results.newInvoices = invoiceResults.newInvoices;
      results.updatedInvoices = invoiceResults.updatedInvoices;

      // Sync payments 
      const paymentResults = await this.syncClientPayments(client, options);
      results.totalPayments = paymentResults.totalPayments;
      results.newPayments = paymentResults.newPayments;
      results.updatedPayments = paymentResults.updatedPayments;

      // Update client's last sync time
      await Client.updateOne(
        { _id: client._id },
        { 
          'quickbooks.lastInvoiceSync': new Date(),
          'quickbooks.lastSyncStatus': 'success'
        }
      );

      return results;

    } catch (error) {
      console.error(`💥 Error syncing data for ${client.name}:`, error);
      
      // Update client sync status with error
      await Client.updateOne(
        { _id: client._id },
        { 
          'quickbooks.lastSyncStatus': 'error',
          'quickbooks.lastSyncError': error.message
        }
      );
      
      throw error;
    }
  }

  /**
   * Sync invoices only (separated for clarity)
   */
  async syncClientInvoicesOnly(client, options = {}) {
    const { forceFullSync = false, dateFrom = null, dateTo = null } = options;

    try {
      // Build QB query
      let query = "SELECT * FROM Invoice WHERE Active = true";
      
      // Add date filters if provided
      if (dateFrom && dateTo) {
        query += ` AND TxnDate >= '${dateFrom}' AND TxnDate <= '${dateTo}'`;
      } else if (!forceFullSync) {
        // Only get invoices from last sync or last 30 days
        const lastSync = client.quickbooks.lastInvoiceSync || new Date(Date.now() - 30*24*60*60*1000);
        const lastSyncDate = lastSync.toISOString().split('T')[0];
        query += ` AND MetaData.LastUpdatedTime >= '${lastSyncDate}'`;
      }

      query += " ORDER BY TxnDate DESC";

      // Fetch invoices from QuickBooks
      console.log(`🔍 Fetching QB invoices for ${client.name}...`);
      const qbResponse = await this.oauthClient.makeApiCall({
        url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${client.quickbooks.realmId}/query?query=${encodeURIComponent(query)}`,
        method: 'GET'
      });

      const qbInvoices = qbResponse?.json?.QueryResponse?.Invoice || [];
      const results = {
        totalInvoices: qbInvoices.length,
        newInvoices: 0,
        updatedInvoices: 0
      };

      console.log(`📥 Processing ${qbInvoices.length} invoices for ${client.name}...`);

      // Process each QB invoice
      for (const qbInvoice of qbInvoices) {
        try {
          const result = await this.processQBInvoice(qbInvoice, client);
          if (result.isNew) {
            results.newInvoices++;
          } else if (result.isUpdated) {
            results.updatedInvoices++;
          }
        } catch (error) {
          console.error(`❌ Failed to process invoice ${qbInvoice.DocNumber}:`, error);
        }
      }

      return results;

    } catch (error) {
      console.error(`💥 Error syncing invoices for ${client.name}:`, error);
      throw error;
    }
  }

  /**
   * Sync payments for a specific client
   */ 
  async syncClientPayments(client, options = {}) {
    const { forceFullSync = false, dateFrom = null, dateTo = null } = options;

    try {
      // Build QB query for payments
      let query = "SELECT * FROM Payment WHERE Active = true";
      
      // Add date filters if provided
      if (dateFrom && dateTo) {
        query += ` AND TxnDate >= '${dateFrom}' AND TxnDate <= '${dateTo}'`;
      } else if (!forceFullSync) {
        // Only get payments from last sync or last 30 days
        const lastSync = client.quickbooks.lastInvoiceSync || new Date(Date.now() - 30*24*60*60*1000);
        const lastSyncDate = lastSync.toISOString().split('T')[0];
        query += ` AND MetaData.LastUpdatedTime >= '${lastSyncDate}'`;
      }

      query += " ORDER BY TxnDate DESC";

      // Fetch payments from QuickBooks
      console.log(`🔍 Fetching QB payments for ${client.name}...`);
      const qbResponse = await this.oauthClient.makeApiCall({
        url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${client.quickbooks.realmId}/query?query=${encodeURIComponent(query)}`,
        method: 'GET'
      });

      const qbPayments = qbResponse?.json?.QueryResponse?.Payment || [];
      const results = {
        totalPayments: qbPayments.length,
        newPayments: 0,
        updatedPayments: 0
      };

      console.log(`📥 Processing ${qbPayments.length} payments for ${client.name}...`);

      // Process each QB payment
      for (const qbPayment of qbPayments) {
        try {
          const result = await this.processQBPayment(qbPayment, client);
          if (result.isNew) {
            results.newPayments++;
          } else if (result.isUpdated) {
            results.updatedPayments++;
          }
        } catch (error) {
          console.error(`❌ Failed to process payment ${qbPayment.DocNumber || qbPayment.Id}:`, error);
        }
      }

      return results;

    } catch (error) {
      console.error(`💥 Error syncing payments for ${client.name}:`, error);
      throw error;
    }
  }

  /**
   * Process a single QB payment and save/update in MongoDB
   * ENHANCED: Handles both live API and CSV imported data
   */
  async processQBPayment(qbPayment, client) {
    const qbPaymentId = qbPayment.Id;
    const qbDocNumber = qbPayment.DocNumber;
    
    // Check multiple ways a payment might exist:
    // 1. By QuickBooks API ID
    // 2. By QuickBooks reference from CSV import
    let existingPayment = await Payment.findOne({
      $or: [
        { 'quickbooks.id': qbPaymentId, customerId: client._id },
        { qb_invoice_number: qbDocNumber, dataSource: 'quickbooks_csv' }
      ]
    });

    // Transform QB payment to our format
    const mongoPayment = this.transformQBPaymentToMongo(qbPayment, client);

    let result = { isNew: false, isUpdated: false };

    if (existingPayment) {
      // Handle different scenarios for existing payments
      if (existingPayment.dataSource === 'quickbooks_csv') {
        // This is a CSV imported payment - upgrade it to live API data
        console.log(`🔄 Upgrading CSV payment ${qbDocNumber} to live API data for ${client.name}`);
        
        await Payment.updateOne(
          { _id: existingPayment._id },
          {
            ...mongoPayment,
            dataSource: 'quickbooks_api', // Upgrade the data source
            // Preserve import history
            csv_imported_date: existingPayment.import_date,
            csv_import_source: existingPayment.imported_from
          }
        );
        result.isUpdated = true;
        
      } else if (existingPayment.quickbooks?.id === qbPaymentId) {
        // This is already a live API payment - update if newer
        if (qbPayment.MetaData.LastUpdatedTime > existingPayment.quickbooks.lastSynced) {
          await Payment.updateOne(
            { _id: existingPayment._id },
            mongoPayment
          );
          result.isUpdated = true;
          console.log(`🔄 Updated live payment ${qbDocNumber || qbPaymentId} for ${client.name}`); 
        }
      }
    } else {
      // Create new payment
      const newPayment = new Payment(mongoPayment);
      await newPayment.save();
      result.isNew = true;
      console.log(`✅ Created new payment ${qbDocNumber || qbPaymentId} for ${client.name}`);
    }

    return result;
  }

  /**
   * Process a single QB invoice and save/update in MongoDB
   * ENHANCED: Handles both live API and CSV imported data
   */
  async processQBInvoice(qbInvoice, client) {
    const qbInvoiceId = qbInvoice.Id;
    const qbDocNumber = qbInvoice.DocNumber;
    
    // Check multiple ways an invoice might exist:
    // 1. By QuickBooks API ID
    // 2. By QuickBooks invoice number from CSV import
    // 3. By invoice number (fallback)
    let existingInvoice = await Invoice.findOne({
      $or: [
        { 'quickbooks.id': qbInvoiceId, customerId: client._id },
        { qb_invoice_number: qbDocNumber, dataSource: 'quickbooks_csv' },
        { invoiceNumber: qbDocNumber, customerId: client._id }
      ]
    });

    // Transform QB invoice to our format
    const mongoInvoice = this.transformQBInvoiceToMongo(qbInvoice, client);

    let result = { isNew: false, isUpdated: false };

    if (existingInvoice) {
      // Handle different scenarios for existing invoices
      if (existingInvoice.dataSource === 'quickbooks_csv') {
        // This is a CSV imported invoice - upgrade it to live API data
        console.log(`🔄 Upgrading CSV invoice ${qbDocNumber} to live API data for ${client.name}`);
        
        await Invoice.updateOne(
          { _id: existingInvoice._id },
          {
            ...mongoInvoice,
            dataSource: 'quickbooks_api', // Upgrade the data source
            // Preserve import history
            csv_imported_date: existingInvoice.import_date,
            csv_import_source: existingInvoice.imported_from
          }
        );
        result.isUpdated = true;
        
      } else if (existingInvoice.quickbooks?.id === qbInvoiceId) {
        // This is already a live API invoice - update if newer
        if (qbInvoice.MetaData.LastUpdatedTime > existingInvoice.quickbooks.lastSynced) {
          await Invoice.updateOne(
            { _id: existingInvoice._id },
            mongoInvoice
          );
          result.isUpdated = true;
          console.log(`🔄 Updated live invoice ${qbDocNumber} for ${client.name}`);
        }
      } else {
        // Different underlying invoice - this shouldn't happen often
        console.log(`⚠️  Found duplicate invoice ${qbDocNumber} - updating to live data`);
        await Invoice.updateOne(
          { _id: existingInvoice._id },
          mongoInvoice
        );
        result.isUpdated = true;
      }
    } else {
      // Create new invoice
      const newInvoice = new Invoice(mongoInvoice);
      await newInvoice.save();
      result.isNew = true;
      console.log(`✅ Created new invoice ${qbDocNumber} for ${client.name}`);
    }

    return result;
  }

  /**
   * Transform QB invoice data to MongoDB format - ENHANCED with all QB fields
   */
  transformQBInvoiceToMongo(qbInvoice, client) {
    // Extract line items with full detail
    const lineItems = (qbInvoice.Line || [])
      .filter(line => line.DetailType === 'SalesItemLineDetail')
      .map((line, index) => ({
        lineNumber: index + 1,
        productService: line.SalesItemLineDetail?.ItemRef?.name || 'Service',
        description: line.Description || '',
        quantity: parseFloat(line.SalesItemLineDetail?.Qty || 1),
        rate: parseFloat(line.SalesItemLineDetail?.UnitPrice || 0),
        amount: parseFloat(line.Amount || 0),
        taxable: line.SalesItemLineDetail?.TaxCodeRef?.value !== 'NON',
        taxCode: line.SalesItemLineDetail?.TaxCodeRef?.name || 'GST',
        itemRef: {
          value: line.SalesItemLineDetail?.ItemRef?.value,
          name: line.SalesItemLineDetail?.ItemRef?.name
        }
      }));

    // Extract payments with QB linking
    const payments = qbInvoice.LinkedTxn?.filter(txn => txn.TxnType === 'Payment')?.map(payment => ({
      amount: parseFloat(payment.Amount || 0),
      date: new Date(payment.TxnDate),
      method: 'QuickBooks Payment',
      reference: payment.DocNumber,
      quickbooksPaymentId: payment.TxnId
    })) || [];

    // Calculate amounts
    const subtotal = parseFloat(qbInvoice.TotalAmt || 0);
    const taxAmount = parseFloat(qbInvoice.TxnTaxDetail?.TotalTax || 0);
    const total = subtotal;
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const balanceDue = parseFloat(qbInvoice.Balance || 0);

    // Enhanced status mapping based on QB fields
    let status = 'Draft';
    if (qbInvoice.PrintStatus === 'NeedToPrint' || qbInvoice.EmailStatus === 'NotSent') {
      status = 'Draft';
    } else if (balanceDue === 0) {
      status = 'Paid';
    } else if (balanceDue > 0 && balanceDue < total) {
      status = 'Partial';
    } else if (qbInvoice.EmailStatus === 'EmailSent') {
      status = 'Sent';
    }
    
    // Check if overdue
    const dueDate = new Date(qbInvoice.DueDate);
    if (balanceDue > 0 && dueDate < new Date()) {
      status = 'Overdue';
    }

    return {
      // Basic invoice identification 
      invoiceNumber: qbInvoice.DocNumber || qbInvoice.Id,
      
      // Customer information
      customerId: client._id,
      customerName: client.name,
      customerEmail: client.email,
      
      // Dates & terms - matching QB transaction list
      invoiceDate: new Date(qbInvoice.TxnDate),
      dueDate: new Date(qbInvoice.DueDate),
      terms: qbInvoice.SalesTermRef?.name || '7 Days',
      
      // Enhanced fields matching your QB screenshot
      type: 'Invoice', // For transaction list integration
      memo: qbInvoice.PrivateNote || qbInvoice.CustomerMemo?.value || '',
      
      // Billing information
      billingAddress: {
        street: qbInvoice.BillAddr?.Line1,
        city: qbInvoice.BillAddr?.City,
        state: qbInvoice.BillAddr?.CountrySubDivisionCode,
        postalCode: qbInvoice.BillAddr?.PostalCode,
        country: qbInvoice.BillAddr?.Country || 'Australia'
      },
      
      // Line items and calculations
      lineItems,
      subtotal,
      taxRate: 0.10,
      taxAmount,
      total,
      balanceDue,
      
      // Status
      status,
      
      // Source tracking - IMPORTANT for multi-source integration
      dataSource: 'quickbooks_api',
      qb_invoice_number: qbInvoice.DocNumber,
      qb_source: 'live_api',
      
      // Payments
      payments,
      
      // Enhanced QuickBooks sync data - ALL QB fields preserved
      quickbooks: {
        id: qbInvoice.Id,
        syncToken: qbInvoice.SyncToken,
        status: qbInvoice.PrintStatus,
        lastSynced: new Date(),
        txnDate: new Date(qbInvoice.TxnDate),
        docNumber: qbInvoice.DocNumber,
        balance: parseFloat(qbInvoice.Balance || 0),
        
        // Additional QB metadata
        emailStatus: qbInvoice.EmailStatus,
        printStatus: qbInvoice.PrintStatus,
        allowipeQualification: qbInvoice.AllowIPNPayment,
        allowOnlinePayment: qbInvoice.AllowOnlinePayment,
        allowOnlineCreditCardPayment: qbInvoice.AllowOnlineCreditCardPayment,
        allowOnlineACHPayment: qbInvoice.AllowOnlineACHPayment,
        
        // Customer reference from QB
        customerRef: {
          value: qbInvoice.CustomerRef?.value,
          name: qbInvoice.CustomerRef?.name
        },
        
        // Currency info
        currencyRef: {
          value: qbInvoice.CurrencyRef?.value,
          name: qbInvoice.CurrencyRef?.name
        },
        
        // Full QB object for debugging (can be removed in production)
        rawQBData: process.env.NODE_ENV === 'development' ? qbInvoice : undefined,
        
        // Exchange rate for multi-currency
        exchangeRate: qbInvoice.ExchangeRate,
        
        // Invoice delivery details
        deliveryInfo: {
          deliveryType: qbInvoice.DeliveryInfo?.DeliveryType,
          deliveryTime: qbInvoice.DeliveryInfo?.DeliveryTime
        },
        
        // Deposit information
        deposit: qbInvoice.Deposit,
        depositToAccountRef: {
          value: qbInvoice.DepositToAccountRef?.value,
          name: qbInvoice.DepositToAccountRef?.name  
        },
        
        // Linked transactions (payments, etc.)
        linkedTxn: qbInvoice.LinkedTxn || [],
        
        // Metadata from QB
        metaData: {
          createTime: qbInvoice.MetaData?.CreateTime,
          lastUpdatedTime: qbInvoice.MetaData?.LastUpdatedTime
        },
        
        // Invoice message and private notes
        privateNote: qbInvoice.PrivateNote,
        customerMemo: qbInvoice.CustomerMemo?.value,
        
        // Class and department references
        classRef: {
          value: qbInvoice.ClassRef?.value,
          name: qbInvoice.ClassRef?.name
        },
        departmentRef: {
          value: qbInvoice.DepartmentRef?.value,
          name: qbInvoice.DepartmentRef?.name
        }
      },
      
      // Payments
      payments,
      
      // Update timestamp
      updatedAt: new Date()
    };
  }

  /**
   * Transform QB payment data to MongoDB format - NEW
   */
  transformQBPaymentToMongo(qbPayment, client) {
    // Extract invoice applications (which invoices this payment applies to)
    const invoiceApplications = (qbPayment.LinK || qbPayment.Line || [])
      .filter(line => line.LinkedTxn?.some(txn => txn.TxnType === 'Invoice'))
      .map(line => {
        const linkedInvoice = line.LinkedTxn?.find(txn => txn.TxnType === 'Invoice');
        return linkedInvoice ? {
          qbInvoiceId: linkedInvoice.TxnId,
          invoiceNumber: linkedInvoice.DocNumber || linkedInvoice.TxnId,
          appliedAmount: parseFloat(line.Amount || 0),
          applicationDate: new Date(qbPayment.TxnDate)
        } : null;
      })
      .filter(Boolean);

    const totalAmount = parseFloat(qbPayment.TotalAmt || 0);
    const totalApplied = invoiceApplications.reduce((sum, app) => sum + app.appliedAmount, 0);
    const unappliedAmount = totalAmount - totalApplied;

    return {
      // Payment identification - matching QB transaction list format
      paymentNumber: qbPayment.DocNumber || qbPayment.Id,
      
      // Customer information
      customerId: client._id,
      customerName: client.name,
      
      // Payment details - matching your QB screenshot fields
      paymentDate: new Date(qbPayment.TxnDate), // DATE column
      totalAmount, // AMOUNT column
      memo: qbPayment.PrivateNote || qbPayment.Memo || '', // MEMO column
      
      // Payment method
      paymentMethod: qbPayment.PaymentMethodRef?.name || 'Other',
      paymentReference: qbPayment.PaymentRefNum || '',
      
      // Status - derived from QB data
      status: 'Deposited', // Most payments are deposited by default in QB
      
      // Invoice applications (KEY: links payments to specific invoices)
      invoiceApplications,
      
      // Unapplied amount (customer credit)
      unappliedAmount,
      
      // Enhanced QuickBooks sync data - ALL QB payment fields
      quickbooks: {
        id: qbPayment.Id,
        syncToken: qbPayment.SyncToken,
        txnDate: new Date(qbPayment.TxnDate),
        docNumber: qbPayment.DocNumber,
        lastSynced: new Date(),
        
        // Payment method details
        paymentMethodRef: {
          value: qbPayment.PaymentMethodRef?.value,
          name: qbPayment.PaymentMethodRef?.name
        },
        
        // Deposit account information 
        depositToAccountRef: {
          value: qbPayment.DepositToAccountRef?.value,
          name: qbPayment.DepositToAccountRef?.name
        },
        
        // Customer reference
        customerRef: {
          value: qbPayment.CustomerRef?.value,
          name: qbPayment.CustomerRef?.name
        },
        
        // Currency information
        currencyRef: {
          value: qbPayment.CurrencyRef?.value,
          name: qbPayment.CurrencyRef?.name
        },
        exchangeRate: qbPayment.ExchangeRate,
        
        // Payment reference number
        paymentRefNum: qbPayment.PaymentRefNum,
        
        // All linked transactions from QB
        linkedTxn: qbPayment.Line?.map(line => ({
          amount: parseFloat(line.Amount || 0),
          linkedTxn: line.LinkedTxn || []
        })) || [],
        
        // Notes and metadata
        privateNote: qbPayment.PrivateNote,
        customerMemo: qbPayment.Memo,
        
        // QB metadata
        metaData: {
          createTime: qbPayment.MetaData?.CreateTime,
          lastUpdatedTime: qbPayment.MetaData?.LastUpdatedTime
        }
      },
      
      // Update timestamp
      updatedAt: new Date()
    };
  }

  /**
   * Check if QB token is expired
   */
  isTokenExpired(qbData) {
    const expiryTime = new Date(qbData.access_token_expires_at || 0);
    const now = new Date();
    return now >= expiryTime;
  }

  /**
   * Refresh QB access token for a client
   */
  async refreshClientToken(client) {
    try {
      this.oauthClient.token.refresh_token = client.quickbooks.refresh_token;
      const authResponse = await this.oauthClient.refresh();

      // Update client with new tokens
      await Client.updateOne(
        { _id: client._id },
        {
          'quickbooks.access_token': authResponse.token.access_token,
          'quickbooks.refresh_token': authResponse.token.refresh_token,
          'quickbooks.access_token_expires_at': new Date(Date.now() + (3600 * 1000)) // 1 hour
        }
      );

      console.log(`🔄 Refreshed QB token for ${client.name}`);
    } catch (error) {
      console.error(`❌ Failed to refresh QB token for ${client.name}:`, error);
      throw error;
    }
  }

  /**
   * Get invoices for a client from MongoDB (fast local query)
   */
  async getClientInvoices(clientId, options = {}) {
    const { status, dateFrom, dateTo, limit = 50, offset = 0 } = options;
    
    const query = { customerId: clientId };
    
    // Add filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (dateFrom || dateTo) {
      query.invoiceDate = {};
      if (dateFrom) query.invoiceDate.$gte = new Date(dateFrom);
      if (dateTo) query.invoiceDate.$lte = new Date(dateTo);
    }

    return await Invoice.find(query)
      .sort({ invoiceDate: -1 })
      .limit(limit)
      .skip(offset)
      .lean(); // Return plain objects for better performance
  }

  /** 
   * Trigger immediate sync for a specific client
   */
  async syncSpecificClient(clientId, options = {}) {
    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    if (!client.quickbooks?.access_token || !client.quickbooks?.realmId) {
      throw new Error(`Client ${client.name} is not connected to QuickBooks`);
    }

    return await this.syncClientInvoices(client, options);
  }

  /**
   * Sync line items for CSV-imported invoices from QuickBooks API
   * @param {String} clientId - Optional client ID to sync specific client
   * @returns {Object} Sync results
   */
  async syncCSVInvoiceLineItems(clientId = null) {
    console.log('🔄 Starting CSV invoice line item sync from QuickBooks API...');
    
    const results = {
      totalCsvInvoices: 0,
      updatedInvoices: 0,
      skippedInvoices: 0,
      errors: []
    };

    try {
      // Find CSV-imported invoices that need line item updates
      const csvInvoiceQuery = {
        dataSource: 'quickbooks_csv',
        qb_invoice_number: { $exists: true, $ne: null },
        customerId: { $exists: true, $ne: null } // Ensure customer relationship exists
      };

      // Add client filter if specified
      if (clientId) {
        csvInvoiceQuery.customerId = clientId;
      }

      const csvInvoices = await Invoice.find(csvInvoiceQuery)
        .populate({
          path: 'customerId', 
          select: 'name quickbooks',
          match: { 
            'quickbooks.access_token': { $exists: true, $ne: null },
            'quickbooks.realmId': { $exists: true, $ne: null }
          }
        })
        .limit(100); // Process in batches to avoid overwhelming QB API

      // Filter out invoices where populate failed (no QB connection)
      const validInvoices = csvInvoices.filter(invoice => invoice.customerId);
      
      results.totalCsvInvoices = validInvoices.length;
      console.log(`📊 Found ${validInvoices.length} CSV invoices with QB connections to sync line items for`);

      // Group invoices by client to efficiently use QB API
      const invoicesByClient = {};
      validInvoices.forEach(invoice => {
        // Double-check customer data (should be redundant after filtering above)
        if (!invoice.customerId || !invoice.customerId._id) {
          console.warn(`⚠️ Skipping invoice ${invoice.qb_invoice_number} - no valid customer data`);
          return;
        }
        
        const clientId = invoice.customerId._id.toString();
        if (!invoicesByClient[clientId]) {
          invoicesByClient[clientId] = {
            client: invoice.customerId,
            invoices: []
          };
        }
        invoicesByClient[clientId].invoices.push(invoice);
      });

      // Process each client's invoices
      for (const [clientId, clientData] of Object.entries(invoicesByClient)) {
        const { client, invoices } = clientData;
        
        // Skip if client data is invalid
        if (!client || !client._id) {
          console.log(`⚠️ Skipping client group - invalid client data`);
          results.skippedInvoices += invoices.length;
          continue;
        }
        
        // Skip if client doesn't have QB connection
        if (!client.quickbooks?.access_token || !client.quickbooks?.realmId) {
          console.log(`⚠️ Skipping client ${client.name} - not connected to QuickBooks`);
          results.skippedInvoices += invoices.length;
          continue;
        }

        console.log(`🔍 Processing ${invoices.length} invoices for client: ${client.name}`);

        // Set up OAuth client with this client's tokens
        this.oauthClient.token.access_token = client.quickbooks.access_token;
        this.oauthClient.token.refresh_token = client.quickbooks.refresh_token;
        this.oauthClient.token.realmId = client.quickbooks.realmId;

        // Refresh token if needed
        if (this.isTokenExpired(client.quickbooks)) {
          await this.refreshClientToken(client);
        }

        // Process each invoice for this client
        for (const invoice of invoices) {
          try {
            await this.syncSingleCSVInvoiceLineItems(invoice, client);
            results.updatedInvoices++;
            console.log(`✅ Updated line items for invoice ${invoice.qb_invoice_number}`);
          } catch (error) {
            console.error(`❌ Failed to sync line items for invoice ${invoice.qb_invoice_number}:`, error.message);
            results.errors.push({
              invoiceNumber: invoice.qb_invoice_number,
              error: error.message
            });
          }

          // Add small delay to respect QB API rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log('🏁 CSV line item sync completed:', results);
      return results;

    } catch (error) {
      console.error('💥 Critical CSV line item sync error:', error);
      throw error;
    }
  }

  /**
   * Sync line items for a single CSV-imported invoice
   * @param {Object} csvInvoice - The CSV-imported invoice document
   * @param {Object} client - The client document with QB credentials
   */
  async syncSingleCSVInvoiceLineItems(csvInvoice, client) {
    try {
      // Query QuickBooks for this specific invoice by DocNumber
      const query = `SELECT * FROM Invoice WHERE DocNumber = '${csvInvoice.qb_invoice_number}'`;
      
      const qbResponse = await this.oauthClient.makeApiCall({
        url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${client.quickbooks.realmId}/query?query=${encodeURIComponent(query)}`,
        method: 'GET'
      });

      const qbInvoices = qbResponse?.json?.QueryResponse?.Invoice || [];
      
      if (qbInvoices.length === 0) {
        throw new Error(`Invoice ${csvInvoice.qb_invoice_number} not found in QuickBooks`);
      }

      if (qbInvoices.length > 1) {
        console.warn(`⚠️ Multiple invoices found for ${csvInvoice.qb_invoice_number}, using first match`);
      }

      const qbInvoice = qbInvoices[0];

      // Extract detailed line items from QB invoice
      const qbLineItems = (qbInvoice.Line || [])
        .filter(line => line.DetailType === 'SalesItemLineDetail')
        .map((line, index) => ({
          lineNumber: index + 1,
          productService: line.SalesItemLineDetail?.ItemRef?.name || 'Service',
          description: line.Description || '',
          quantity: parseFloat(line.SalesItemLineDetail?.Qty || 1),
          rate: parseFloat(line.SalesItemLineDetail?.UnitPrice || 0),
          amount: parseFloat(line.Amount || 0),
          taxable: line.SalesItemLineDetail?.TaxCodeRef?.value !== 'NON',
          taxCode: line.SalesItemLineDetail?.TaxCodeRef?.name || 'GST',
          serviceDate: new Date(qbInvoice.TxnDate),
          itemRef: {
            value: line.SalesItemLineDetail?.ItemRef?.value,
            name: line.SalesItemLineDetail?.ItemRef?.name
          }
        }));

      // Update the invoice with QB line items and upgrade status
      const updateData = {
        lineItems: qbLineItems,
        dataSource: 'quickbooks_api', // Upgrade from CSV to API
        qb_source: 'api_upgraded',
        'quickbooks.id': qbInvoice.Id,
        'quickbooks.syncToken': qbInvoice.SyncToken,
        'quickbooks.lastSynced': new Date(),
        'quickbooks.docNumber': qbInvoice.DocNumber,
        updatedAt: new Date()
      };

      await Invoice.updateOne(
        { _id: csvInvoice._id },
        { $set: updateData }
      );

      console.log(`✨ Upgraded CSV invoice ${csvInvoice.qb_invoice_number} with ${qbLineItems.length} QB line items`);

    } catch (error) {
      console.error(`💥 Error syncing line items for invoice ${csvInvoice.qb_invoice_number}:`, error);
      throw error;
    }
  }
}

module.exports = new QuickBooksInvoiceSyncService();