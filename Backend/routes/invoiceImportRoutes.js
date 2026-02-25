/**
 * Invoice Import Routes
 * API endpoints for importing historical QuickBooks data
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const QuickBooksDataImporter = require('../scripts/importQuickbooksData');
const QuickBooksInvoiceSyncService = require('../services/quickbooksInvoiceSyncService');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../storage/uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, 'invoice-import-' + Date.now() + '.csv');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'text/csv' && !file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

/**
 * Import QuickBooks CSV data
 * POST /api/invoices/import/csv
 */
router.post('/csv', authenticateToken(), upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file provided'
      });
    }

    console.log('📁 Starting CSV import from:', req.file.path);

    // Initialize importer
    const importer = new QuickBooksDataImporter();
    await importer.initialize();

    // Import the data
    const results = await importer.importFromCSV(req.file.path);

    // Clean up uploaded file
    const fs = require('fs');
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: 'CSV import completed successfully',
      data: results
    });

  } catch (error) {
    console.error('❌ CSV import failed:', error);
    res.status(500).json({
      success: false,
      message: 'Import failed: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Import from default CSV file location
 * POST /api/invoices/import/default
 */
router.post('/default', authenticateToken(), async (req, res) => {
  try {
    const defaultCsvPath = path.join(__dirname, '../../Invoices up til Jan 2026/All Invoice from Jun22-Jan26.csv');
    
    console.log('📁 Starting default CSV import from:', defaultCsvPath);

    // Initialize importer
    const importer = new QuickBooksDataImporter();
    await importer.initialize();

    // Import the data
    const results = await importer.importFromCSV(defaultCsvPath);

    res.json({
      success: true,
      message: 'Default CSV import completed successfully',
      data: results
    });

  } catch (error) {
    console.error('❌ Default CSV import failed:', error);
    res.status(500).json({
      success: false,
      message: 'Import failed: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get import status/history
 * GET /api/invoices/import/status
 */
router.get('/status', authenticateToken(), async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    // Get import statistics
    const invoicesCollection = db.collection('invoices');
    const paymentsCollection = db.collection('payments');
    
    const [
      totalInvoices,
      csvInvoices,
      apiInvoices,
      totalPayments,
      csvPayments,
      importedCustomers
    ] = await Promise.all([
      invoicesCollection.countDocuments(),
      invoicesCollection.countDocuments({ dataSource: 'quickbooks_csv' }),
      invoicesCollection.countDocuments({ dataSource: 'quickbooks_api' }),
      paymentsCollection.countDocuments(),
      paymentsCollection.countDocuments({ dataSource: 'quickbooks_csv' }),
      invoicesCollection.distinct('customer_name', { imported_from: 'quickbooks_csv' })
    ]);

    // Get date ranges
    const dateRange = await invoicesCollection.aggregate([
      { $match: { dataSource: 'quickbooks_csv' } },
      { 
        $group: {
          _id: null,
          earliest: { $min: '$invoice_date' },
          latest: { $max: '$invoice_date' }
        }
      }
    ]).toArray();

    await client.close();

    res.json({
      success: true,
      data: {
        statistics: {
          totalInvoices,
          csvInvoices,
          apiInvoices,
          totalPayments,
          csvPayments,
          uniqueCustomers: importedCustomers.length
        },
        dateRange: dateRange[0] || { earliest: null, latest: null },
        lastImportDate: new Date() // This could be tracked in a separate collection
      }
    });

  } catch (error) {
    console.error('❌ Failed to get import status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve import status'
    });
  }
});

/**
 * Sync line items for CSV-imported invoices from QuickBooks API
 * POST /api/invoices/import/sync-line-items
 */
router.post('/sync-line-items', authenticateToken(), async (req, res) => {
  try {
    const { clientId } = req.body; // Optional: sync specific client only

    console.log('🔄 Starting CSV invoice line item sync...');
    
    const results = await QuickBooksInvoiceSyncService.syncCSVInvoiceLineItems(clientId);

    res.json({
      success: true,
      message: 'Line item sync completed',
      data: results
    });

  } catch (error) {
    console.error('❌ CSV line item sync failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync line items from QuickBooks',
      error: error.message
    });
  }
});

/**
 * Clear imported data (for re-import)
 * DELETE /api/invoices/import/clear
 */
router.delete('/clear', authenticateToken(), async (req, res) => {
  try {
    const { confirmClear } = req.body;
    
    if (confirmClear !== 'YES_DELETE_ALL_IMPORTED_DATA') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Send { "confirmClear": "YES_DELETE_ALL_IMPORTED_DATA" }'
      });
    }

    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    const invoicesCollection = db.collection('invoices');
    const paymentsCollection = db.collection('payments');
    
    // Delete all CSV imported data
    const [invoiceResult, paymentResult] = await Promise.all([
      invoicesCollection.deleteMany({ dataSource: 'quickbooks_csv' }),
      paymentsCollection.deleteMany({ dataSource: 'quickbooks_csv' })
    ]);

    await client.close();

    res.json({
      success: true,
      message: 'Imported data cleared successfully',
      data: {
        invoicesDeleted: invoiceResult.deletedCount,
        paymentsDeleted: paymentResult.deletedCount
      }
    });

  } catch (error) {
    console.error('❌ Failed to clear imported data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear imported data'
    });
  }
});

module.exports = router;