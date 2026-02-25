#!/usr/bin/env node

/**
 * Fix Customer ID Mapping Script
 * Corrects invoices that were linked to duplicate customer records during CSV import
 * 
 * Usage: node scripts/fixCustomerMapping.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

async function main() {
  console.log('🔧 Customer ID Mapping Fix Utility');
  console.log('===================================');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Define the mapping of incorrect customer IDs to correct client IDs
    const customerMappings = {
      // Incorrect customer ID -> Correct client ID
      "6995ae6251ead8bd1ccf7ad9": "6880a6a198a04402dafabc0f" // Acme Roof Plumbing
    };

    console.log('📋 Customer ID mappings to fix:');
    for (const [incorrect, correct] of Object.entries(customerMappings)) {
      console.log(`  • ${incorrect} → ${correct}`);
    }

    let totalUpdated = 0;

    // Fix each mapping
    for (const [incorrectId, correctId] of Object.entries(customerMappings)) {
      console.log(`\n🔍 Fixing mapping: ${incorrectId} → ${correctId}`);

      // Find invoices with incorrect customer ID
      const invoicesToUpdate = await Invoice.find({ customerId: incorrectId });
      console.log(`  📄 Found ${invoicesToUpdate.length} invoices to update`);

      if (invoicesToUpdate.length > 0) {
        // Update invoices
        const invoiceResult = await Invoice.updateMany(
          { customerId: incorrectId },
          { 
            customerId: correctId,
            updatedAt: new Date()
          }
        );

        console.log(`  ✅ Updated ${invoiceResult.modifiedCount} invoices`);
        totalUpdated += invoiceResult.modifiedCount;

        // List the invoice numbers for reference
        const invoiceNumbers = invoicesToUpdate.map(inv => inv.invoiceNumber).join(', ');
        console.log(`  📋 Invoice numbers: ${invoiceNumbers}`);
      }

      // Find payments with incorrect customer ID
      const paymentsToUpdate = await Payment.find({ customerId: incorrectId });
      console.log(`  💰 Found ${paymentsToUpdate.length} payments to update`);

      if (paymentsToUpdate.length > 0) {
        // Update payments
        const paymentResult = await Payment.updateMany(
          { customerId: incorrectId },
          { 
            customerId: correctId,
            updatedAt: new Date()
          }
        );

        console.log(`  ✅ Updated ${paymentResult.modifiedCount} payments`);
      }
    }

    console.log(`\n🎉 Mapping fix completed!`);
    console.log(`📊 Total invoices updated: ${totalUpdated}`);

    // Verification: Check if any documents still have the old IDs
    console.log('\n🔍 Verification - Checking for remaining incorrect IDs...');
    for (const incorrectId of Object.keys(customerMappings)) {
      const remainingInvoices = await Invoice.countDocuments({ customerId: incorrectId });
      const remainingPayments = await Payment.countDocuments({ customerId: incorrectId });
      
      if (remainingInvoices > 0 || remainingPayments > 0) {
        console.log(`❌ Still found ${remainingInvoices} invoices and ${remainingPayments} payments with ID ${incorrectId}`);
      } else {
        console.log(`✅ No documents found with incorrect ID ${incorrectId}`);
      }
    }

    console.log('\n📋 Summary of corrected data:');
    for (const correctId of Object.values(customerMappings)) {
      const invoiceCount = await Invoice.countDocuments({ customerId: correctId });
      const paymentCount = await Payment.countDocuments({ customerId: correctId });
      console.log(`  • Client ${correctId}: ${invoiceCount} invoices, ${paymentCount} payments`);
    }

  } catch (error) {
    console.error('\n💥 Fix failed:', error.message);
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