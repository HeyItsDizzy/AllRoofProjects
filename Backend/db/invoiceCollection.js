/**
 * Invoice Database Collection Setup
 * MongoDB collection configuration for invoice management
 */

const { MongoClient, ObjectId } = require('mongodb');

let invoiceCollection;

/**
 * Initialize invoice collection with proper indexes
 */
async function initializeInvoiceCollection() {
  try {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    invoiceCollection = db.collection('invoices');

    // Create indexes for optimal performance
    await Promise.all([
      // Unique invoice number index
      invoiceCollection.createIndex(
        { "invoiceNumber": 1 }, 
        { unique: true, name: "idx_invoice_number" }
      ),
      
      // Customer and status index for filtering
      invoiceCollection.createIndex(
        { "customerId": 1, "status": 1 }, 
        { name: "idx_customer_status" }
      ),
      
      // Project reference index
      invoiceCollection.createIndex(
        { "projectId": 1 }, 
        { name: "idx_project_id", sparse: true }
      ),
      
      // QuickBooks integration index
      invoiceCollection.createIndex(
        { "quickbooks.id": 1 }, 
        { name: "idx_quickbooks_id", sparse: true }
      ),
      
      // Date range queries
      invoiceCollection.createIndex(
        { "invoiceDate": -1 }, 
        { name: "idx_invoice_date" }
      ),
      
      // Due date for overdue calculation
      invoiceCollection.createIndex(
        { "dueDate": 1, "status": 1 }, 
        { name: "idx_due_date_status" }
      ),
      
      // Text search index
      invoiceCollection.createIndex({
        "invoiceNumber": "text",
        "customerName": "text", 
        "projectNumber": "text",
        "invoiceMessage": "text"
      }, { name: "idx_text_search" }),
      
      // Compound index for dashboard queries
      invoiceCollection.createIndex(
        { "customerId": 1, "invoiceDate": -1, "status": 1 }, 
        { name: "idx_customer_date_status" }
      )
    ]);

    console.log('✅ Invoice collection indexes created successfully');
    
  } catch (error) {
    console.error('❌ Error initializing invoice collection:', error);
    throw error;
  }
}

/**
 * Get invoice collection instance
 */
async function getInvoiceCollection() {
  if (!invoiceCollection) {
    await initializeInvoiceCollection();
  }
  return invoiceCollection;
}

/**
 * Invoice collection utilities
 */
const invoiceCollectionUtils = {
  // Generate next invoice number
  generateNextInvoiceNumber: async () => {
    const collection = await getInvoiceCollection();
    const lastInvoice = await collection.findOne(
      {}, 
      { sort: { createdAt: -1 }, projection: { invoiceNumber: 1 } }
    );
    
    const nextNumber = lastInvoice ? 
      parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) + 1 : 
      1000;
      
    return nextNumber.toString().padStart(4, '0');
  },

  // Get overdue invoices
  getOverdueInvoices: async (customerId = null) => {
    const collection = await getInvoiceCollection();
    const query = {
      status: { $nin: ['Paid', 'Void'] },
      dueDate: { $lt: new Date() }
    };
    
    if (customerId) {
      query.customerId = new ObjectId(customerId);
    }
    
    return await collection.find(query)
      .sort({ dueDate: 1 })
      .toArray();
  },

  // Get unpaid invoice total for customer
  getCustomerOutstanding: async (customerId) => {
    const collection = await getInvoiceCollection();
    const result = await collection.aggregate([
      {
        $match: {
          customerId: new ObjectId(customerId),
          status: { $nin: ['Paid', 'Void'] }
        }
      },
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: '$balanceDue' },
          overdueAmount: {
            $sum: {
              $cond: [
                { $lt: ['$dueDate', new Date()] },
                '$balanceDue',
                0
              ]
            }
          },
          invoiceCount: { $sum: 1 }
        }
      }
    ]).toArray();
    
    return result[0] || {
      totalOutstanding: 0,
      overdueAmount: 0,
      invoiceCount: 0
    };
  },

  // Mark invoice as paid
  markAsPaid: async (invoiceId, paymentInfo = {}) => {
    const collection = await getInvoiceCollection();
    const updateData = {
      status: 'Paid',
      paidAt: new Date(),
      balanceDue: 0,
      updatedAt: new Date()
    };
    
    if (paymentInfo.amount || paymentInfo.method || paymentInfo.reference) {
      updateData.$push = {
        payments: {
          amount: paymentInfo.amount,
          date: new Date(),
          method: paymentInfo.method || 'Unknown',
          reference: paymentInfo.reference || '',
          quickbooksPaymentId: paymentInfo.quickbooksPaymentId
        }
      };
    }
    
    return await collection.updateOne(
      { _id: new ObjectId(invoiceId) },
      { $set: updateData, ...(updateData.$push && { $push: updateData.$push }) }
    );
  },

  // Update QuickBooks sync status
  updateQuickBooksSync: async (invoiceId, qbData) => {
    const collection = await getInvoiceCollection();
    return await collection.updateOne(
      { _id: new ObjectId(invoiceId) },
      {
        $set: {
          'quickbooks.id': qbData.id,
          'quickbooks.syncToken': qbData.syncToken,
          'quickbooks.status': qbData.status || 'synced',
          'quickbooks.lastSynced': new Date(),
          'quickbooks.docNumber': qbData.docNumber,
          updatedAt: new Date()
        }
      }
    );
  },

  // Bulk status update
  bulkUpdateStatus: async (invoiceIds, newStatus) => {
    const collection = await getInvoiceCollection();
    return await collection.updateMany(
      { _id: { $in: invoiceIds.map(id => new ObjectId(id)) } },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date(),
          ...(newStatus === 'Sent' && { sentAt: new Date() })
        }
      }
    );
  },

  // Get invoice statistics for dashboard
  getInvoiceStatistics: async (dateFrom = null, dateTo = null, customerId = null) => {
    const collection = await getInvoiceCollection();
    const matchStage = {};
    
    if (dateFrom || dateTo) {
      matchStage.invoiceDate = {};
      if (dateFrom) matchStage.invoiceDate.$gte = new Date(dateFrom);
      if (dateTo) matchStage.invoiceDate.$lte = new Date(dateTo);
    }
    
    if (customerId) {
      matchStage.customerId = new ObjectId(customerId);
    }
    
    const stats = await collection.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$total', 0] }
          },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $nin: ['$status', ['Paid', 'Void']] },
                    { $lt: ['$dueDate', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          overdueAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $nin: ['$status', ['Paid', 'Void']] },
                    { $lt: ['$dueDate', new Date()] }
                  ]
                },
                '$balanceDue',
                0
              ]
            }
          },
          outstandingAmount: {
            $sum: { 
              $cond: [
                { $nin: ['$status', ['Paid', 'Void']] }, 
                '$balanceDue', 
                0
              ] 
            }
          }
        }
      }
    ]).toArray();
    
    return stats[0] || {
      totalCount: 0,
      totalAmount: 0,
      paidCount: 0,
      paidAmount: 0,
      overdueCount: 0,
      overdueAmount: 0,
      outstandingAmount: 0
    };
  },

  // Clean up draft invoices older than specified days
  cleanupDraftInvoices: async (daysOld = 30) => {
    const collection = await getInvoiceCollection();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await collection.deleteMany({
      status: 'Draft',
      createdAt: { $lt: cutoffDate }
    });
    
    console.log(`🧹 Cleaned up ${result.deletedCount} old draft invoices`);
    return result.deletedCount;
  }
};

module.exports = {
  collection: getInvoiceCollection,
  initializeInvoiceCollection,
  utils: invoiceCollectionUtils
};