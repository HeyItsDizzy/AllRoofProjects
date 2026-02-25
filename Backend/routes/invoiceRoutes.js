/**
 * Invoice Routes - Complete CRUD & QuickBooks Integration
 * Reference implementation for invoice management system
 */

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { authenticateToken } = require('../middleware/auth');
const { InvoiceBuilder, QuickBooksInvoiceFormatter, invoiceValidation } = require('../references/InvoiceReference');

// Import your existing database connections
const { collection: invoiceCollection } = require('../db/invoiceCollection'); // You'll create this
const { collection: projectsCollection } = require('../db/projectsCollection');
const { collection: clientCollection } = require('../db/clientCollection');

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create new invoice
 * POST /api/invoices
 */
router.post('/', authenticateToken(), async (req, res) => {
  try {
    const { projectId, customerId, lineItems, ...invoiceData } = req.body;

    // Validate required fields
    const validation = invoiceValidation.validateInvoice(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice data',
        errors: validation.errors
      });
    }

    // Generate invoice number
    const invoiceCol = await invoiceCollection();
    const lastInvoice = await invoiceCol.findOne({}, { sort: { createdAt: -1 } });
    const nextNumber = lastInvoice ? 
      parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) + 1 : 
      1000;
    const invoiceNumber = nextNumber.toString().padStart(4, '0');

    // Build invoice object
    let invoiceBuilder = new InvoiceBuilder();
    
    // Set basic invoice data
    Object.assign(invoiceBuilder.invoice, {
      ...invoiceData,
      invoiceNumber,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add line items
    if (lineItems && lineItems.length > 0) {
      lineItems.forEach(item => {
        invoiceBuilder.addLineItem(
          item.productService,
          item.description,
          item.quantity,
          item.rate,
          item.taxable
        );
      });
    }

    const invoice = invoiceBuilder.calculateTotals().invoice;

    // Save to database
    const result = await invoiceCol.insertOne(invoice);
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: {
        ...invoice,
        _id: result.insertedId
      }
    });

  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice'
    });
  }
});

/**
 * Create invoice from project
 * POST /api/invoices/from-project/:projectId
 */
router.post('/from-project/:projectId', authenticateToken(), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { forceCreate = false } = req.body;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    // Get project data
    const projectsCol = await projectsCollection();
    const project = await projectsCol.findOne({ _id: new ObjectId(projectId) });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if already invoiced
    if (project.ARTInvNumber && !forceCreate) {
      return res.status(400).json({
        success: false,
        message: 'Project already invoiced',
        code: 'ALREADY_INVOICED'
      });
    }

    // Check if estimate sent
    if (!project.estimateSent || project.estimateSent.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Estimate not sent to client',
        code: 'ESTIMATE_NOT_SENT'
      });
    }

    // Check if estimate status is "Sent"
    if (project.estimateStatus !== 'Sent') {
      return res.status(400).json({
        success: false,
        message: 'Estimate status must be "Sent"',
        code: 'ESTIMATE_NOT_READY'
      });
    }

    // Get client data
    const clientsCol = await clientCollection();
    const clientId = project.linkedClients?.[0];
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'No client linked to project',
        code: 'NO_CLIENT'
      });
    }

    const client = await clientsCol.findOne({ _id: new ObjectId(clientId) });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check pricing data
    if (!project.pricingSnapshot) {
      return res.status(400).json({
        success: false,
        message: 'No pricing snapshot available',
        code: 'NO_PRICING_SNAPSHOT'
      });
    }

    // Create invoice using builder
    const invoiceData = {
      customerId: client._id,
      customerName: client.name,
      customerEmail: client.email,
      projectId: project._id,
      projectNumber: project.projectNumber,
      billingAddress: client.billingAddress || {},
      invoiceMessage: `Thanks for your business!\n\nProject: ${project.projectNumber}\n${project.name}\n\nAll Roof Take-offs\nProfessional Takeoff Services`
    };

    const invoice = new InvoiceBuilder()
      .setCustomer(client._id, client.name, client.email)
      .setBillingAddress(client.billingAddress || {})
      .setDates(new Date(), client.paymentTerms || "7 Days")
      .addProjectLineItems(project)
      .setMessage(invoiceData.invoiceMessage)
      .setPaymentOptions(true, true, [])
      .build();

    // Add project reference
    invoice.projectId = project._id;
    invoice.projectNumber = project.projectNumber;

    // Generate invoice number
    const invoiceCol = await invoiceCollection();
    const lastInvoice = await invoiceCol.findOne({}, { sort: { createdAt: -1 } });
    const nextNumber = lastInvoice ? 
      parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) + 1 : 
      1000;
    invoice.invoiceNumber = nextNumber.toString().padStart(4, '0');

    // Save invoice
    const result = await invoiceCol.insertOne(invoice);

    // Update project with invoice number
    await projectsCol.updateOne(
      { _id: new ObjectId(projectId) },
      { 
        $set: { 
          ARTInvNumber: invoice.invoiceNumber,
          invoicedAt: new Date(),
          invoiceId: result.insertedId
        } 
      }
    );

    res.status(201).json({
      success: true,
      message: 'Invoice created from project successfully',
      data: {
        ...invoice,
        _id: result.insertedId
      }
    });

  } catch (error) {
    console.error('Error creating invoice from project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice from project'
    });
  }
});

/**
 * Get all invoices
 * GET /api/invoices
 */
router.get('/', authenticateToken(), async (req, res) => {
  try {
    const { 
      status, 
      customerId, 
      projectId, 
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 25,
      search 
    } = req.query;

    const invoiceCol = await invoiceCollection();
    
    // Build query
    const query = {};
    
    if (status) query.status = status;
    if (customerId && ObjectId.isValid(customerId)) query.customerId = new ObjectId(customerId);
    if (projectId && ObjectId.isValid(projectId)) query.projectId = new ObjectId(projectId);
    
    if (dateFrom || dateTo) {
      query.invoiceDate = {};
      if (dateFrom) query.invoiceDate.$gte = new Date(dateFrom);
      if (dateTo) query.invoiceDate.$lte = new Date(dateTo);
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { projectNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [invoices, total] = await Promise.all([
      invoiceCol
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray(),
      invoiceCol.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices'
    });
  }
});

/**
 * Get invoice by ID
 * GET /api/invoices/:id
 */
router.get('/:id', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID'
      });
    }

    const invoiceCol = await invoiceCollection();
    const invoice = await invoiceCol.findOne({ _id: new ObjectId(id) });

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
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice'
    });
  }
});

/**
 * Update invoice
 * PUT /api/invoices/:id
 */
router.put('/:id', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID'
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.invoiceNumber;

    // Add updated timestamp
    updates.updatedAt = new Date();

    // Recalculate totals if line items changed
    if (updates.lineItems) {
      const builder = new InvoiceBuilder();
      builder.invoice.lineItems = updates.lineItems;
      builder.invoice.taxRate = updates.taxRate || 0.10;
      builder.calculateTotals();
      
      updates.subtotal = builder.invoice.subtotal;
      updates.taxAmount = builder.invoice.taxAmount;
      updates.total = builder.invoice.total;
      updates.balanceDue = builder.invoice.balanceDue;
    }

    const invoiceCol = await invoiceCollection();
    const result = await invoiceCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const updatedInvoice = await invoiceCol.findOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: updatedInvoice
    });

  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice'
    });
  }
});

/**
 * Delete invoice
 * DELETE /api/invoices/:id
 */
router.delete('/:id', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID'
      });
    }

    const invoiceCol = await invoiceCollection();
    
    // Get invoice first to check if it's linked to a project
    const invoice = await invoiceCol.findOne({ _id: new ObjectId(id) });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if invoice is already sent/paid
    if (invoice.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete invoice that has been sent or paid'
      });
    }

    // Delete invoice
    const result = await invoiceCol.deleteOne({ _id: new ObjectId(id) });

    // Remove invoice reference from project if exists
    if (invoice.projectId) {
      const projectsCol = await projectsCollection();
      await projectsCol.updateOne(
        { _id: new ObjectId(invoice.projectId) },
        { 
          $unset: { 
            ARTInvNumber: "",
            invoicedAt: "",
            invoiceId: ""
          } 
        }
      );
    }

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete invoice'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUICKBOOKS INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sync invoice to QuickBooks
 * POST /api/invoices/:id/sync-to-quickbooks
 */
router.post('/:id/sync-to-quickbooks', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID'
      });
    }

    const invoiceCol = await invoiceCollection();
    const invoice = await invoiceCol.findOne({ _id: new ObjectId(id) });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Get client's QuickBooks connection
    const clientsCol = await clientCollection();
    const client = await clientsCol.findOne({ _id: new ObjectId(invoice.customerId) });

    if (!client?.quickbooks?.connected) {
      return res.status(400).json({
        success: false,
        message: 'Client QuickBooks not connected',
        code: 'QB_NOT_CONNECTED'
      });
    }

    // Format invoice for QuickBooks
    const qbInvoiceData = QuickBooksInvoiceFormatter.formatForQuickBooks(invoice);

    // Send to QuickBooks API (using your existing QB integration)
    const axios = require('axios');
    const qbResponse = await axios.post(
      `${process.env.API_BASE_URL}/quickbooks/create-invoice`,
      {
        access_token: client.quickbooks.access_token,
        realmId: client.quickbooks.realmId,
        invoice: qbInvoiceData
      }
    );

    // Update invoice with QuickBooks data
    const qbInvoice = qbResponse.data.data;
    await invoiceCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          'quickbooks.id': qbInvoice.Id,
          'quickbooks.syncToken': qbInvoice.SyncToken,
          'quickbooks.status': 'synced',
          'quickbooks.lastSynced': new Date(),
          'quickbooks.docNumber': qbInvoice.DocNumber,
          status: 'Sent',
          sentAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Invoice synced to QuickBooks successfully',
      data: {
        quickbooksId: qbInvoice.Id,
        docNumber: qbInvoice.DocNumber
      }
    });

  } catch (error) {
    console.error('Error syncing invoice to QuickBooks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync invoice to QuickBooks',
      error: error.response?.data?.message || error.message
    });
  }
});

/**
 * Get invoice financial summary
 * GET /api/invoices/summary
 */
router.get('/summary', authenticateToken(), async (req, res) => {
  try {
    const { customerId, dateFrom, dateTo } = req.query;
    
    const invoiceCol = await invoiceCollection();
    
    const matchStage = {};
    if (customerId && ObjectId.isValid(customerId)) {
      matchStage.customerId = new ObjectId(customerId);
    }
    if (dateFrom || dateTo) {
      matchStage.invoiceDate = {};
      if (dateFrom) matchStage.invoiceDate.$gte = new Date(dateFrom);
      if (dateTo) matchStage.invoiceDate.$lte = new Date(dateTo);
    }

    const summary = await invoiceCol.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          totalPaid: { 
            $sum: { 
              $cond: [{ $eq: ["$status", "Paid"] }, "$total", 0] 
            }
          },
          totalOutstanding: { 
            $sum: { 
              $cond: [{ $ne: ["$status", "Paid"] }, "$balanceDue", 0] 
            }
          },
          overdue: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $ne: ["$status", "Paid"] },
                    { $lt: ["$dueDate", new Date()] }
                  ]
                },
                "$balanceDue", 
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    const result = summary[0] || {
      totalInvoices: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      overdue: 0
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error getting invoice summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoice summary'
    });
  }
});

module.exports = router;