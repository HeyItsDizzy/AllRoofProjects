#!/usr/bin/env node

/**
 * Debug Script - Analyze Invoice Data Sources and Customer Links
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');

async function main() {
  console.log('🔍 Invoice Data Analysis');
  console.log('========================');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    // 1. Check total invoices by data source
    console.log('📊 Invoices by Data Source:');
    const byDataSource = await Invoice.aggregate([
      { $group: { _id: '$dataSource', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    byDataSource.forEach(item => {
      console.log(`  • ${item._id || 'undefined'}: ${item.count} invoices`);
    });

    // 2. Check CSV invoices specifically
    console.log('\n📋 CSV Invoices Details:');
    const csvInvoices = await Invoice.find({ 
      dataSource: 'quickbooks_csv' 
    }).limit(5).select('invoiceNumber customerName customerId dataSource');
    
    console.log(`Found ${csvInvoices.length} CSV invoices (showing first 5):`);
    csvInvoices.forEach(inv => {
      console.log(`  • Invoice ${inv.invoiceNumber}: Customer "${inv.customerName}" (ID: ${inv.customerId})`);
    });

    // 3. Check if customers have QB connections
    if (csvInvoices.length > 0) {
      console.log('\n🔗 Checking QuickBooks Connections:');
      const Client = require('../config/Client');
      
      for (const invoice of csvInvoices.slice(0, 3)) {
        const client = await Client.findById(invoice.customerId);
        if (client) {
          const hasQB = !!(client.quickbooks?.access_token && client.quickbooks?.realmId);
          console.log(`  • Client "${client.name}": QB Connected = ${hasQB}`);
          if (hasQB) {
            console.log(`    - RealmID: ${client.quickbooks.realmId}`);
            console.log(`    - Last Sync: ${client.quickbooks.lastInvoiceSync || 'Never'}`);
          }
        } else {
          console.log(`  • Customer ID ${invoice.customerId}: Client record not found`);
        }
      }
    }

    // 4. Check what the sync query would actually find
    console.log('\n🔍 Testing Sync Query:');
    const syncQuery = {
      dataSource: 'quickbooks_csv',
      qb_invoice_number: { $exists: true, $ne: null },
      customerId: { $exists: true, $ne: null }
    };
    
    const matchingInvoices = await Invoice.find(syncQuery)
      .populate({
        path: 'customerId', 
        select: 'name quickbooks',
        match: { 
          'quickbooks.access_token': { $exists: true, $ne: null },
          'quickbooks.realmId': { $exists: true, $ne: null }
        }
      })
      .limit(5);

    console.log(`Query found ${matchingInvoices.length} invoices with potential QB connections:`);
    matchingInvoices.forEach(inv => {
      console.log(`  • Invoice ${inv.invoiceNumber}: Customer ${inv.customerId ? 'connected' : 'missing/no QB'}`);
    });

    // 5. Find clients with QB connections
    console.log('\n🏢 Clients with QuickBooks Connections:');
    const Client = require('../config/Client');
    const connectedClients = await Client.find({
      'quickbooks.access_token': { $exists: true, $ne: null },
      'quickbooks.realmId': { $exists: true, $ne: null }
    }).select('name quickbooks');

    console.log(`Found ${connectedClients.length} connected clients:`);
    connectedClients.forEach(client => {
      console.log(`  • ${client.name} (ID: ${client._id})`);
      console.log(`    - RealmID: ${client.quickbooks.realmId}`);
    });

    // 6. Count invoices for connected clients
    console.log('\n📊 Invoices for Connected Clients:');
    for (const client of connectedClients) {
      const invoiceCount = await Invoice.countDocuments({ customerId: client._id });
      const csvInvoiceCount = await Invoice.countDocuments({ 
        customerId: client._id, 
        dataSource: 'quickbooks_csv' 
      });
      console.log(`  • ${client.name}: ${invoiceCount} total invoices (${csvInvoiceCount} CSV)`);
    }

  } catch (error) {
    console.error('💥 Analysis failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB disconnected');
  }
}

main();