/**
 * QuickBooks Historical Data Import Script
 * Imports CSV export data into MongoDB invoices collection
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
require('dotenv').config();

class QuickBooksDataImporter {
  constructor() {
    // Statistics tracking
    this.stats = {
      totalRows: 0,
      invoicesProcessed: 0,
      paymentsProcessed: 0,
      customersCreated: 0,
      errors: []
    };
    
    // Customer mapping cache
    this.customerMap = new Map();
  }

  /**
   * Initialize MongoDB connection
   */
  async initialize() {
    try {
      // Connect via mongoose if not already connected
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database connection established');
      } else {
        console.log('✅ Using existing database connection');
      }
      
      // Ensure indexes exist
      await this.createIndexes();
      
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Create necessary database indexes
   */
  async createIndexes() {
    try {
      // Indexes are handled by the models themselves
      console.log('✅ Database indexes ready');
    } catch (error) {
      console.error('⚠️  Warning: Index creation failed:', error);
      // Continue anyway - indexes may already exist
    }
  }

  /**
   * Parse CSV file and import data
   */
  async importFromCSV(csvFilePath) {
    console.log(`📁 Starting import from: ${csvFilePath}`);
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }

    return new Promise((resolve, reject) => {
      const records = [];
      
      fs.createReadStream(csvFilePath)
        .pipe(csv({
          headers: [
            'date', 'transaction_type', 'invoice_number', 'amount', 
            'due_date', 'customer', 'split', 'terms', 
            'ar_paid', 'open_balance', 'sent', 'delivery_address'
          ],
          skipEmptyLines: true
        }))
        .on('data', (record) => {
          this.stats.totalRows++;
          
          // Skip header rows and empty rows
          if (record.date === 'Date' || record.date === '' || !record.customer) {
            return;
          }
          
          records.push(record);
        })
        .on('end', async () => {
          try {
            await this.processRecords(records);
            await this.generateReport();
            resolve(this.stats);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Process all CSV records
   */
  async processRecords(records) {
    console.log(`📊 Processing ${records.length} records...`);
    
    // Group records by customer for batch processing
    const customerGroups = {};
    
    for (const record of records) {
      const customerName = record.customer.trim();
      if (!customerGroups[customerName]) {
        customerGroups[customerName] = [];
      }
      customerGroups[customerName].push(record);
    }

    // Process each customer's data
    for (const [customerName, customerRecords] of Object.entries(customerGroups)) {
      await this.processCustomerRecords(customerName, customerRecords);
    }
    
    console.log('✅ All records processed');
  }

  /**
   * Process records for a specific customer
   */
  async processCustomerRecords(customerName, records) {
    try {
      // Ensure customer exists
      const customerId = await this.ensureCustomerExists(customerName, records[0]);
      
      // Group by invoice number to match invoices with payments
      const invoiceGroups = {};
      
      for (const record of records) {
        const invoiceNumber = record.invoice_number?.trim();
        if (!invoiceNumber) continue;
        
        if (!invoiceGroups[invoiceNumber]) {
          invoiceGroups[invoiceNumber] = {
            invoice: null,
            payments: []
          };
        }
        
        if (record.transaction_type === 'Invoice') {
          invoiceGroups[invoiceNumber].invoice = record;
        } else if (record.transaction_type === 'Payment') {
          invoiceGroups[invoiceNumber].payments.push(record);
        }
      }

      // Process each invoice group
      for (const [invoiceNumber, group] of Object.entries(invoiceGroups)) {
        await this.processInvoiceGroup(customerId, customerName, invoiceNumber, group);
      }
      
    } catch (error) {
      console.error(`❌ Error processing customer ${customerName}:`, error);
      this.stats.errors.push({
        customer: customerName,
        error: error.message
      });
    }
  }

  /**
   * Process an invoice and its associated payments
   */
  async processInvoiceGroup(customerId, customerName, invoiceNumber, group) {
    try {
      // Process invoice if it exists
      if (group.invoice) {
        await this.processInvoice(customerId, customerName, invoiceNumber, group.invoice);
      }
      
      // Process all payments for this invoice
      for (const payment of group.payments) {
        await this.processPayment(customerId, customerName, invoiceNumber, payment);
      }
      
    } catch (error) {
      console.error(`❌ Error processing invoice ${invoiceNumber}:`, error);
      this.stats.errors.push({
        invoice: invoiceNumber,
        customer: customerName,
        error: error.message
      });
    }
  }

  /**
   * Process individual invoice record
   */
  async processInvoice(customerId, customerName, invoiceNumber, record) {
    try {
      // Check if invoice already exists
      const existingInvoice = await Invoice.findOne({ 
        qb_invoice_number: invoiceNumber 
      });
      
      if (existingInvoice) {
        console.log(`⚠️  Invoice ${invoiceNumber} already exists - skipping`);
        return;
      }

      // Create invoice using mongoose model
      const invoiceData = {
        // QuickBooks reference
        qb_invoice_number: invoiceNumber,
        qb_source: 'csv_import',
        dataSource: 'quickbooks_csv',
        
        // Required invoice fields
        invoiceNumber: invoiceNumber, // Use QB number as internal number too
        
        // Customer reference  
        customerId: customerId,
        customerName: customerName,
        customerEmail: record.delivery_address || '',
        
        // Invoice details
        invoiceDate: this.parseDate(record.date),
        dueDate: this.parseDate(record.due_date) || this.parseDate(record.date),
        terms: record.terms || '7 Days',
        
        // Financial details
        subtotal: this.parseAmount(record.amount),
        taxAmount: 0, // Will be calculated if needed
        total: this.parseAmount(record.amount),
        balanceDue: this.parseAmount(record.open_balance),
        
        // Status tracking
        status: this.determineInvoiceStatus(record),
        ar_paid_status: record.ar_paid || '',
        sent_status: record.sent || '',
        open_balance: this.parseAmount(record.open_balance),
        
        // Line items (required by schema)
        lineItems: [{
          lineNumber: 1,
          productService: `Service - ${customerName}`,
          description: `Professional services for ${customerName}`,
          quantity: 1,
          rate: this.parseAmount(record.amount),
          amount: this.parseAmount(record.amount),
          taxable: true,
          taxCode: 'GST'
        }],
        
        // Import metadata
        imported_from: 'quickbooks_csv',
        import_date: new Date()
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();
      
      this.stats.invoicesProcessed++;
      console.log(`✅ Imported invoice ${invoiceNumber} for ${customerName}`);
      
    } catch (error) {
      console.error(`❌ Failed to process invoice ${invoiceNumber}:`, error);
      this.stats.errors.push({
        invoice: invoiceNumber,
        customer: customerName,
        error: error.message
      });
    }
  }

  /**
   * Process individual payment record
   */
  async processPayment(customerId, customerName, invoiceNumber, record) {
    try {
      // Create payment using mongoose model
      const paymentData = {
        // Payment identification
        paymentNumber: `PAY-${invoiceNumber}-${Date.now()}`,
        
        // Customer reference
        customerId: customerId,
        customerName: customerName,
        
        // Payment details
        paymentDate: this.parseDate(record.date),
        totalAmount: this.parseAmount(record.amount),
        memo: `Payment for Invoice ${invoiceNumber}`,
        paymentMethod: 'Electronic Transfer',
        
        // Status
        status: 'Deposited',
        
        // Invoice applications
        invoiceApplications: [{
          invoiceNumber: invoiceNumber,
          appliedAmount: this.parseAmount(record.amount),
          applicationDate: this.parseDate(record.date)
        }],
        
        // Source tracking
        dataSource: 'quickbooks_csv',
        qb_invoice_number: invoiceNumber,
        qb_source: 'csv_import',
        imported_from: 'quickbooks_csv',
        import_date: new Date()
      };

      const payment = new Payment(paymentData);
      await payment.save();
      
      this.stats.paymentsProcessed++;
      console.log(`✅ Imported payment for invoice ${invoiceNumber}`);
      
    } catch (error) {
      console.error(`❌ Failed to process payment for ${invoiceNumber}:`, error);
      this.stats.errors.push({
        invoice: invoiceNumber,
        customer: customerName,
        error: error.message
      });
    }
  }

  /**
   * Ensure customer exists in database
   */
  async ensureCustomerExists(customerName, sampleRecord) {
    // Check cache first
    if (this.customerMap.has(customerName)) {
      return this.customerMap.get(customerName);
    }

    // For now, create a simple ObjectId for customers
    // In a full implementation, you'd want to integrate with your Client model
    const mongoose = require('mongoose');
    const customerId = new mongoose.Types.ObjectId();
    
    // Cache customer ID  
    this.customerMap.set(customerName, customerId);
    this.stats.customersCreated++;
    
    console.log(`✅ Mapped customer: ${customerName}`);
    return customerId;
  }

  /**
   * Utility functions
   */
  parseDate(dateString) {
    if (!dateString || dateString.trim() === '') return null;
    
    // Handle DD/MM/YYYY format
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    
    // Fallback to standard parsing
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  parseAmount(amountString) {
    if (!amountString) return 0;
    
    // Remove currency symbols, spaces, and commas
    const cleaned = amountString.toString()
      .replace(/[$,\s]/g, '')
      .replace(/[""]/g, ''); // Remove quotes
    
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  }

  determineInvoiceStatus(record) {
    if (record.ar_paid === 'Paid') {
      return 'Paid';
    } else if (record.open_balance && this.parseAmount(record.open_balance) > 0) {
      // Check if overdue
      const dueDate = this.parseDate(record.due_date);
      if (dueDate && dueDate < new Date()) {
        return 'Overdue';
      }
      return 'Sent';
    } else if (record.sent === 'Sent') {
      return 'Sent';
    } else {
      return 'Draft';
    }
  }

  /**
   * Generate import report
   */
  async generateReport() {
    console.log('\n📊 IMPORT SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Total CSV rows processed: ${this.stats.totalRows}`);
    console.log(`Customers processed: ${this.stats.customersCreated}`);
    console.log(`Invoices imported: ${this.stats.invoicesProcessed}`);
    console.log(`Payments imported: ${this.stats.paymentsProcessed}`);
    console.log(`Errors encountered: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.customer || error.invoice}: ${error.error}`);
      });
    }
    
    console.log('═'.repeat(50));
  }

  /**
   * Clean up resources
   */
  async close() {
    // Mongoose connection will be handled by the main application
    console.log('✅ Import process completed');
  }
}

/**
 * Main execution function
 */
async function main() {
  const importer = new QuickBooksDataImporter();
  
  try {
    // Check for required environment variables
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required. Please check your .env file.');
    }
    
    await importer.initialize();
    
    // Get CSV file path from command line or use default
    const csvFilePath = process.argv[2] || 
      path.join(__dirname, '../../Invoices up til Jan 2026/All Invoice from Jun22-Jan26.csv');
    
    console.log(`\n🚀 QUICKBOOKS DATA IMPORT STARTED`);
    console.log(`📁 Source file: ${csvFilePath}`);
    console.log('═'.repeat(60));
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      console.log(`⚠️  CSV file not found at: ${csvFilePath}`);
      console.log(`\nTo import your CSV data, you can:`);
      console.log(`1. Place your CSV file at: ${csvFilePath}`);
      console.log(`2. Or specify the path: npm run import:invoices -- "/path/to/your/file.csv"`);
      console.log(`3. Or use the web interface at /invoices (Admin -> Import CSV)`);
      return;
    }
    
    const results = await importer.importFromCSV(csvFilePath);
    
    console.log('\n🎉 IMPORT COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('\n💥 IMPORT FAILED:', error.message);
    
    if (error.message.includes('MONGODB_URI')) {
      console.log('\n💡 SOLUTION: Make sure your .env file contains:');
      console.log('MONGODB_URI=your_mongodb_connection_string');
    }
    
    process.exit(1);
  } finally {
    await importer.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = QuickBooksDataImporter;