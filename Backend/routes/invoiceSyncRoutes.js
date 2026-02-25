/**
 * QuickBooks Invoice Sync Routes
 * API endpoints for triggering syncs and fetching local invoice data
 */

const express = require('express');
const router = express.Router();
const qbSyncService = require('../services/quickbooksInvoiceSyncService');
const companyQBService = require('../services/companyQBService');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const { authenticateToken } = require('../middleware/auth');
const cron = require('node-cron');

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manual sync trigger - Sync all connected clients
 * POST /api/invoices/sync
 */
router.post('/sync', authenticateToken(), async (req, res) => {
  try {
    console.log('📤 Manual sync triggered by user:', req.user?.email);
    
    const options = {
      forceFullSync: req.body.fullSync || false,
      dateFrom: req.body.dateFrom,
      dateTo: req.body.dateTo
    };

    const results = await qbSyncService.syncAllClientInvoices(options);
    
    res.json({
      success: true,
      message: 'Invoice sync completed successfully',
      data: results
    });

  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    res.status(500).json({
      success: false,
      message: 'Sync failed: ' + error.message
    });
  }
});

/**
 * Sync specific client invoices
 * POST /api/invoices/sync/:clientId
 */
router.post('/sync/:clientId', authenticateToken(), async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`📤 Manual client sync triggered for: ${clientId}`);
    
    const options = {
      forceFullSync: req.body.fullSync || false,
      dateFrom: req.body.dateFrom,
      dateTo: req.body.dateTo
    };

    const results = await qbSyncService.syncSpecificClient(clientId, options);
    
    res.json({
      success: true,
      message: `Client sync completed successfully`,
      data: results
    });

  } catch (error) {
    console.error('❌ Client sync failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get sync status for all clients
 * GET /api/invoices/sync/status
 */
router.get('/sync/status', authenticateToken(), async (req, res) => {
  try {
    const Client = require('../config/Client');
    
    const clients = await Client.find(
      { 'quickbooks.access_token': { $exists: true, $ne: null } },
      { 
        name: 1, 
        'quickbooks.lastInvoiceSync': 1,
        'quickbooks.lastSyncStatus': 1,
        'quickbooks.lastSyncError': 1
      }
    ).lean();

    // Get invoice counts for each client
    const clientsWithCounts = await Promise.all(
      clients.map(async (client) => {
        const invoiceCount = await Invoice.countDocuments({ customerId: client._id });
        const recentInvoices = await Invoice.countDocuments({ 
          customerId: client._id,
          invoiceDate: { $gte: new Date(Date.now() - 30*24*60*60*1000) } // Last 30 days
        });
        
        return {
          ...client,
          invoiceCount,
          recentInvoices
        };
      })
    );

    res.json({
      success: true,
      data: clientsWithCounts
    });

  } catch (error) {
    console.error('❌ Failed to get sync status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get unified transaction list (invoices + payments) for current user's linked client
 * This matches your QuickBooks transaction list format
 * GET /api/invoices/transactions
 */
router.get('/transactions', authenticateToken(), async (req, res) => {
  try {
    // Get client ID from user (same logic as before)
    let clientId = req.user?.linkedClient;
    
    if (!clientId && req.user?.linkedClients?.length > 0) {
      clientId = req.user.linkedClients[0];
    }
    
    if (!clientId && req.user?.company) {
      const Client = require('../config/Client');
      const matchingClient = await Client.findOne({ name: req.user.company });
      clientId = matchingClient?._id;
    }

    if (!clientId) {
      return res.status(404).json({
        success: false,
        message: 'No linked client found for user'
      });
    }

    // Parse query options
    const options = {
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    // Build common date filter
    const dateFilter = {};
    if (options.dateFrom || options.dateTo) {
      if (options.dateFrom) dateFilter.$gte = new Date(options.dateFrom);
      if (options.dateTo) dateFilter.$lte = new Date(options.dateTo);
    }

    // Get invoices
    const invoiceQuery = { customerId: clientId };
    if (options.status && options.status !== 'all') {
      invoiceQuery.status = options.status;
    }
    if (Object.keys(dateFilter).length > 0) {
      invoiceQuery.invoiceDate = dateFilter;
    }

    const invoices = await Invoice.find(invoiceQuery)
      .sort({ invoiceDate: -1 })
      .limit(options.limit)
      .lean();

    // Get payments  
    const paymentQuery = { customerId: clientId };
    if (Object.keys(dateFilter).length > 0) {
      paymentQuery.paymentDate = dateFilter;
    }

    const payments = await Payment.find(paymentQuery)
      .sort({ paymentDate: -1 })
      .limit(options.limit)
      .lean();

    // Transform to unified transaction format matching QB screenshot
    const transactions = [];
    
    // Add invoices
    invoices.forEach(invoice => {
      transactions.push({
        _id: invoice._id,
        date: invoice.invoiceDate,
        type: 'Invoice',
        number: invoice.invoiceNumber,
        customer: invoice.customerName,
        memo: invoice.memo || '',
        amount: invoice.total,
        status: invoice.status,
        qbId: invoice.quickbooks.id,
        balanceDue: invoice.balanceDue,
        
        // Additional fields for detailed view
        dueDate: invoice.dueDate,
        lineItems: invoice.lineItems,
        payments: invoice.payments,
        quickbooks: invoice.quickbooks,
        
        // Action flags
        isOverdue: invoice.dueDate < new Date() && invoice.balanceDue > 0,
        canReceivePayment: invoice.balanceDue > 0
      });
    });
    
    // Add payments with invoice linkage
    payments.forEach(payment => {
      transactions.push({
        _id: payment._id,
        date: payment.paymentDate,
        type: 'Payment', 
        number: payment.paymentNumber,
        customer: payment.customerName,
        memo: payment.memo || '',
        amount: payment.totalAmount,
        status: payment.status,
        qbId: payment.quickbooks.id,
        
        // Payment-specific fields
        paymentMethod: payment.paymentMethod,
        unappliedAmount: payment.unappliedAmount,
        invoiceApplications: payment.invoiceApplications, // KEY: shows which invoices this payment is applied to
        quickbooks: payment.quickbooks,
        
        // Action flags  
        hasUnapplied: payment.unappliedAmount > 0,
        appliedInvoices: payment.invoiceApplications.length
      });
    });
    
    // Sort all transactions by date (most recent first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Apply pagination to combined results
    const paginatedTransactions = transactions.slice(options.offset, options.offset + options.limit);

    res.json({
      success: true,
      data: paginatedTransactions,
      pagination: {
        total: transactions.length,
        limit: options.limit,
        offset: options.offset,
        hasMore: (options.offset + options.limit) < transactions.length
      },
      metadata: {
        source: 'local_mongodb_unified',
        invoiceCount: invoices.length,
        paymentCount: payments.length,
        totalTransactions: transactions.length
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch unified transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get payment details with invoice linkage
 * GET /api/invoices/payments/:paymentId
 */
router.get('/payments/:paymentId', authenticateToken(), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('invoiceApplications.invoiceId', 'invoiceNumber invoiceDate total balanceDue')
      .lean();
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('❌ Failed to fetch payment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get specific invoice with linked payments
 * GET /api/invoices/local/:invoiceId/with-payments
 */
router.get('/local/:invoiceId/with-payments', authenticateToken(), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId).lean();
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Find all payments applied to this invoice
    const linkedPayments = await Payment.find({
      'invoiceApplications.qbInvoiceId': invoice.quickbooks.id
    }).lean();

    res.json({
      success: true,
      data: {
        invoice,
        linkedPayments: linkedPayments.map(payment => ({
          _id: payment._id,
          paymentDate: payment.paymentDate,
          totalAmount: payment.totalAmount,
          paymentMethod: payment.paymentMethod,
          memo: payment.memo,
          appliedAmount: payment.invoiceApplications
            .filter(app => app.qbInvoiceId === invoice.quickbooks.id)
            .reduce((sum, app) => sum + app.appliedAmount, 0)
        }))
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch invoice with payments:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL TRANSACTION DATA ENDPOINTS (INVOICES + PAYMENTS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get invoices for current user's linked client (fast local query)
 * GET /api/invoices/local
 */
router.get('/local', authenticateToken(), async (req, res) => {
  try {
    // Get client ID from user (same logic as InvoiceFeed.jsx)
    let clientId = req.user?.linkedClient;
    
    if (!clientId && req.user?.linkedClients?.length > 0) {
      clientId = req.user.linkedClients[0];
    }
    
    if (!clientId && req.user?.company) {
      const Client = require('../config/Client');
      const matchingClient = await Client.findOne({ name: req.user.company });
      clientId = matchingClient?._id;
    }

    if (!clientId) {
      return res.status(404).json({
        success: false,
        message: 'No linked client found for user'
      });
    }

    // Parse query options
    const options = {
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    // Get invoices from local MongoDB
    const invoices = await qbSyncService.getClientInvoices(clientId, options);
    
    // Get total count for pagination
    const query = { customerId: clientId };
    if (options.status && options.status !== 'all') {
      query.status = options.status;
    }
    if (options.dateFrom || options.dateTo) {
      query.invoiceDate = {};
      if (options.dateFrom) query.invoiceDate.$gte = new Date(options.dateFrom);
      if (options.dateTo) query.invoiceDate.$lte = new Date(options.dateTo);
    }
    
    const totalCount = await Invoice.countDocuments(query);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        total: totalCount,
        limit: options.limit,
        offset: options.offset,
        hasMore: (options.offset + options.limit) < totalCount
      },
      metadata: {
        source: 'local_mongodb',
        lastSync: invoices[0]?.quickbooks?.lastSynced,
        totalInvoices: invoices.length,
        totalPayments: await Payment.countDocuments({ customerId: clientId })
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch local invoices:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get specific invoice by ID
 * GET /api/invoices/local/:invoiceId
 */
router.get('/local/:invoiceId', authenticateToken(), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId).lean();
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('❌ Failed to fetch invoice:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get invoice statistics for client
 * GET /api/invoices/local/stats/:clientId?
 */
router.get('/local/stats/:clientId?', authenticateToken(), async (req, res) => {
  try {
    let clientId = req.params.clientId;
    
    // Use user's linked client if no clientId provided
    if (!clientId) {
      clientId = req.user?.linkedClient || req.user?.linkedClients?.[0];
    }

    if (!clientId) {
      return res.status(404).json({
        success: false,
        message: 'No client specified'
      });
    }

    // Aggregate invoice statistics
    const stats = await Invoice.aggregate([
      { $match: { customerId: clientId } },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          totalPaid: { $sum: { $subtract: ['$total', '$balanceDue'] } },
          totalOutstanding: { $sum: '$balanceDue' },
          avgInvoiceAmount: { $avg: '$total' },
          statusCounts: {
            $push: '$status'
          }
        }
      },
      {
        $project: {
          totalInvoices: 1,
          totalAmount: { $round: ['$totalAmount', 2] },
          totalPaid: { $round: ['$totalPaid', 2] },
          totalOutstanding: { $round: ['$totalOutstanding', 2] },
          avgInvoiceAmount: { $round: ['$avgInvoiceAmount', 2] }
        }
      }
    ]);

    // Count by status
    const statusCounts = await Invoice.aggregate([
      { $match: { customerId: clientId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusMap = {};
    statusCounts.forEach(item => {
      statusMap[item._id] = item.count;
    });

    // Recent invoices (last 30 days)
    const recentCount = await Invoice.countDocuments({
      customerId: clientId,
      invoiceDate: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
    });

    res.json({
      success: true,
      data: {
        ...(stats[0] || {}),
        statusBreakdown: statusMap,
        recentInvoices30Days: recentCount
      }
    });

  } catch (error) {
    console.error('❌ Failed to get invoice stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULED SYNC (CRON JOB)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Weekly automatic sync
 * Runs every Sunday at 2 AM
 */
cron.schedule('0 2 * * 0', async () => {
  try {
    console.log('⏰ Starting scheduled weekly QB invoice sync...');
    const results = await qbSyncService.syncAllClientInvoices();
    console.log('✅ Scheduled sync completed:', results);
  } catch (error) {
    console.error('💥 Scheduled sync failed:', error);
  }
});

/**
 * Daily incremental sync 
 * Runs every day at 6 AM (smaller sync for recent changes)
 */
cron.schedule('0 6 * * *', async () => {
  try {
    console.log('⏰ Starting daily incremental QB invoice sync...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const results = await qbSyncService.syncAllClientInvoices({
      dateFrom: yesterday.toISOString().split('T')[0]
    });
    console.log('✅ Daily sync completed:', results);
  } catch (error) {
    console.error('💥 Daily sync failed:', error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE CREATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create invoice in QuickBooks and save to MongoDB
 * POST /api/invoices/create-qb-invoice
 */
router.post('/create-qb-invoice', authenticateToken(), async (req, res) => {
  try {
    const { 
      clientId, 
      invoiceNumber, 
      items, 
      dueDate, 
      notes, 
      sendToClient = false 
    } = req.body;
    
    if (!clientId || !items || !items.length) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: clientId and items are required'
      });
    }
    
    console.log('🔄 Creating QB invoice...', { clientId, invoiceNumber });
    
    // Prepare invoice data
    const invoiceData = {
      client: clientId,
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      date: new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      items: items.map(item => ({
        description: item.description || 'Service',
        quantity: parseFloat(item.quantity || 1),
        rate: parseFloat(item.rate || 0),
        amount: parseFloat(item.amount || item.rate || 0)
      })),
      notes: notes || '',
      status: 'sent',
      createdBy: req.user?.id,
      sendToClient
    };
    
    // Calculate totals
    invoiceData.subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
    invoiceData.tax = invoiceData.subtotal * 0.1; // 10% tax
    invoiceData.amount = invoiceData.subtotal + invoiceData.tax;
    
    // Create in QuickBooks via company service
    const qbResult = await companyQBService.createInvoiceInQB(invoiceData);
    
    if (!qbResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create invoice in QuickBooks: ' + qbResult.error
      });
    }
    
    // Save to MongoDB if not already saved by the service
    let mongoInvoice;
    if (qbResult.mongoInvoiceId) {
      mongoInvoice = await Invoice.findById(qbResult.mongoInvoiceId);
    } else {
      // Add QB integration details
      invoiceData.integrationStatus = {
        quickbooks: {
          qbInvoiceId: qbResult.qbInvoiceId,
          qbDocNumber: qbResult.qbDocNumber,
          qbSyncStatus: 'synced',
          qbLastSync: new Date(),
          createdInQB: true,
          sourceSystem: 'webapp'
        }
      };
      
      mongoInvoice = new Invoice(invoiceData);
      await mongoInvoice.save();
    }
    
    console.log('✅ Invoice created successfully in QB and MongoDB');
    
    res.json({
      success: true,
      message: 'Invoice created successfully in QuickBooks',
      data: {
        mongoInvoice: mongoInvoice,
        qbInvoiceId: qbResult.qbInvoiceId,
        qbDocNumber: qbResult.qbDocNumber
      }
    });
    
  } catch (error) {
    console.error('❌ Invoice creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Invoice creation failed: ' + error.message
    });
  }
});

/**
 * Create invoice in MongoDB only (draft mode)
 * POST /api/invoices/create-draft
 */
router.post('/create-draft', authenticateToken(), async (req, res) => {
  try {
    const { 
      clientId, 
      invoiceNumber, 
      items, 
      dueDate, 
      notes 
    } = req.body;
    
    if (!clientId || !items || !items.length) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: clientId and items are required'
      });
    }
    
    // Prepare invoice data
    const invoiceData = {
      client: clientId,
      invoiceNumber: invoiceNumber || `DRAFT-${Date.now()}`,
      date: new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: items.map(item => ({
        description: item.description || 'Service',
        quantity: parseFloat(item.quantity || 1),
        rate: parseFloat(item.rate || 0),
        amount: parseFloat(item.amount || item.rate || 0)
      })),
      notes: notes || '',
      status: 'draft',
      createdBy: req.user?.id,
      integrationStatus: {
        quickbooks: {
          qbSyncStatus: 'pending',
          sourceSystem: 'webapp'
        }
      }
    };
    
    // Calculate totals
    invoiceData.subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
    invoiceData.tax = invoiceData.subtotal * 0.1; // 10% tax
    invoiceData.amount = invoiceData.subtotal + invoiceData.tax;
    
    // Save to MongoDB
    const mongoInvoice = new Invoice(invoiceData);
    await mongoInvoice.save();
    
    console.log('✅ Draft invoice created in MongoDB');
    
    res.json({
      success: true,
      message: 'Draft invoice created successfully',
      data: mongoInvoice
    });
    
  } catch (error) {
    console.error('❌ Draft invoice creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Draft invoice creation failed: ' + error.message
    });
  }
});

module.exports = router;