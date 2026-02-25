#!/usr/bin/env node

/**
 * Sync Line Items Script
 * Updates CSV-imported invoices with accurate line item data from QuickBooks API
 * 
 * Usage:
 *   npm run sync:line-items
 *   node scripts/syncCSVLineItems.js
 *   node scripts/syncCSVLineItems.js --client=CLIENT_ID
 */

require('dotenv').config();
const mongoose = require('mongoose');
const QuickBooksInvoiceSyncService = require('../services/quickbooksInvoiceSyncService');

async function main() {
  console.log('🚀 QuickBooks Line Item Sync Utility');
  console.log('=====================================');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const clientIdArg = args.find(arg => arg.startsWith('--client='));
  const clientId = clientIdArg ? clientIdArg.split('=')[1] : null;

  if (clientId) {
    console.log(`🎯 Syncing line items for specific client: ${clientId}`);
  } else {
    console.log('🌐 Syncing line items for all clients');
  }

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Run the sync
    console.log('🔄 Starting line item sync...');
    const startTime = Date.now();
    
    const results = await QuickBooksInvoiceSyncService.syncCSVInvoiceLineItems(clientId);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Display results
    console.log('\n📊 Sync Results:');
    console.log('================');
    console.log(`• Total CSV invoices found: ${results.totalCsvInvoices}`);
    console.log(`• Successfully updated: ${results.updatedInvoices}`);
    console.log(`• Skipped (no QB connection): ${results.skippedInvoices}`);
    console.log(`• Errors: ${results.errors.length}`);
    console.log(`• Duration: ${duration}s`);

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(error => {
        console.log(`  - Invoice ${error.invoiceNumber}: ${error.error}`);
      });
    }

    if (results.updatedInvoices > 0) {
      console.log('\n✨ Line item sync completed successfully!');
      console.log('Your CSV-imported invoices now have accurate line item details from QuickBooks.');
    } else if (results.totalCsvInvoices === 0) {
      console.log('\n📝 No CSV-imported invoices found to sync.');
    } else {
      console.log('\n⚠️  Some invoices could not be synced. Check the errors above.');
    }

  } catch (error) {
    console.error('\n💥 Sync failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled Rejection:', error);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = main;