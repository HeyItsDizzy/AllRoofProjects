#!/usr/bin/env node

/**
 * Debug and Fix Customer-Client Mapping
 * Finds existing clients and maps CSV invoices to the correct ones
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Client = require('../config/Client');

async function main() {
  console.log('🔧 Comprehensive Customer-Client Mapping Fix');
  console.log('============================================');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // First, let's see what clients actually exist
    console.log('\n🏢 Finding all existing clients...');
    const allClients = await Client.find({}, 'name email quickbooks').lean();
    console.log(`Found ${allClients.length} total clients:`);
    
    // Show clients with QB connections
    const qbClients = allClients.filter(c => c.quickbooks?.access_token);
    console.log(`\n🔗 Clients with QuickBooks connections (${qbClients.length}):`);
    qbClients.forEach(client => {
      console.log(`  • ${client.name} (ID: ${client._id})`);
      console.log(`    Email: ${client.email || 'N/A'}`);
      console.log(`    QB Realm: ${client.quickbooks?.realmId || 'N/A'}\n`);
    });

    // Get customer names from CSV invoices
    console.log('\n📋 Finding unique customer names from CSV invoices...');
    const csvCustomers = await Invoice.aggregate([
      { $match: { dataSource: 'quickbooks_csv' } },
      { $group: { _id: '$customerName', count: { $sum: 1 }, sampleCustomerId: { $first: '$customerId' } } },
      { $sort: { count: -1 } }
    ]);

    console.log(`\nFound ${csvCustomers.length} unique customer names in CSV invoices:`);
    csvCustomers.forEach(customer => {
      console.log(`  • ${customer._id}: ${customer.count} invoices (Current ID: ${customer.sampleCustomerId})`);
    });

    // Try to match customer names to existing clients
    console.log('\n🔍 Attempting to match customers to existing clients...');
    const mappings = {};
    let matches = 0;

    for (const csvCustomer of csvCustomers) {
      const customerName = csvCustomer._id;
      
      // Try exact name match first
      let matchedClient = allClients.find(c => c.name === customerName);
      
      // Try case-insensitive match
      if (!matchedClient) {
        matchedClient = allClients.find(c => 
          c.name.toLowerCase() === customerName.toLowerCase()
        );
      }
      
      // Try partial match (contains)
      if (!matchedClient) {
        matchedClient = allClients.find(c => 
          c.name.toLowerCase().includes(customerName.toLowerCase()) ||
          customerName.toLowerCase().includes(c.name.toLowerCase())
        );
      }

      if (matchedClient) {
        mappings[csvCustomer.sampleCustomerId] = matchedClient._id;
        matches++;
        console.log(`  ✅ MATCH: "${customerName}" → "${matchedClient.name}" (${matchedClient._id})`);
        console.log(`      Has QB Connection: ${matchedClient.quickbooks?.access_token ? 'YES' : 'NO'}`);
      } else {
        console.log(`  ❌ NO MATCH: "${customerName}"`);
      }
    }

    console.log(`\n📊 Matching Summary: ${matches}/${csvCustomers.length} customers matched`);

    if (Object.keys(mappings).length === 0) {
      console.log('❌ No mappings found. You may need to:');
      console.log('  1. Create client records for these customers');
      console.log('  2. Set up QuickBooks connections');
      console.log('  3. Manually map customer names to client IDs');
      return;
    }

    // Show proposed mappings
    console.log('\n📋 Proposed Customer ID Mappings:');
    for (const [oldId, newId] of Object.entries(mappings)) {
      const invoiceCount = await Invoice.countDocuments({ customerId: oldId });
      const paymentCount = await Payment.countDocuments({ customerId: oldId });
      console.log(`  • ${oldId} → ${newId} (${invoiceCount} invoices, ${paymentCount} payments)`);
    }

    // Ask for confirmation (in a real scenario)
    console.log('\n🔧 Applying mappings...');
    
    let totalUpdated = 0;
    for (const [oldId, newId] of Object.entries(mappings)) {
      // Update invoices
      const invoiceResult = await Invoice.updateMany(
        { customerId: oldId },
        { 
          customerId: newId,
          updatedAt: new Date()
        }
      );

      // Update payments
      const paymentResult = await Payment.updateMany(
        { customerId: oldId },
        { 
          customerId: newId,
          updatedAt: new Date()
        }
      );

      console.log(`  ✅ Updated ${invoiceResult.modifiedCount} invoices, ${paymentResult.modifiedCount} payments for ${oldId} → ${newId}`);
      totalUpdated += invoiceResult.modifiedCount;
    }

    console.log(`\n🎉 Mapping update completed! ${totalUpdated} invoices updated`);

    // Verify the results
    console.log('\n🔍 Verification - Checking updated connections...');
    const updatedInvoices = await Invoice.find({ dataSource: 'quickbooks_csv' })
      .populate('customerId', 'name quickbooks')
      .limit(5);

    updatedInvoices.forEach(invoice => {
      const hasQB = invoice.customerId?.quickbooks?.access_token ? 'YES' : 'NO';
      console.log(`  • Invoice ${invoice.invoiceNumber}: Client "${invoice.customerId?.name}" - QB Connection: ${hasQB}`);
    });

  } catch (error) {
    console.error('💥 Fix failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB disconnected');
  }
}

if (require.main === module) {
  main();
}

module.exports = main;