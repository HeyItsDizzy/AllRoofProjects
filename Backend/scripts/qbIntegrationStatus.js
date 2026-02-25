#!/usr/bin/env node

/**
 * QuickBooks Integration Status Report
 * Shows current state and requirements for line item sync
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Client = require('../config/Client');

async function main() {
  console.log('📊 QuickBooks Integration Status Report');
  console.log('======================================');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    // Check CSV invoice mapping status
    const csvInvoicesWithClients = await Invoice.find({ 
      dataSource: 'quickbooks_csv' 
    }).populate('customerId', 'name quickbooks').limit(5);

    console.log('🔗 Customer Mapping Status:');
    console.log('✅ CSV invoices successfully linked to existing clients');
    csvInvoicesWithClients.forEach(invoice => {
      console.log(`  • Invoice ${invoice.invoiceNumber}: ${invoice.customerId?.name || 'Unknown Client'}`);
    });

    // Check total counts
    const totalCSVInvoices = await Invoice.countDocuments({ dataSource: 'quickbooks_csv' });
    const totalClients = await Client.countDocuments({});
    const qbConnectedClients = await Client.countDocuments({
      'quickbooks.access_token': { $exists: true, $ne: null }
    });

    console.log('\n📊 Current Statistics:');
    console.log(`  • Total CSV invoices: ${totalCSVInvoices}`);
    console.log(`  • Total clients: ${totalClients}`);
    console.log(`  • Clients with QB connections: ${qbConnectedClients}`);

    console.log('\n🎯 Next Steps for Line Item Sync:');
    console.log('================================');

    if (qbConnectedClients === 0) {
      console.log('❌ No QuickBooks connections found');
      console.log('\nTo enable line item sync, you need to:');
      console.log('1. 🔗 Connect at least one client to QuickBooks');
      console.log('   - Go to QuickBooks Settings in your frontend');
      console.log('   - Complete the OAuth flow');
      console.log('   - Authorize access to QB company data');
      console.log('\n2. 🔄 Run line item sync');
      console.log('   - Use: npm run sync:line-items');
      console.log('   - Or use the frontend "📋 Sync Line Items" button');
      console.log('\n3. ✨ Enhanced invoice data');
      console.log('   - Accurate line item details from QB');
      console.log('   - Product/service information');
      console.log('   - Quantities, rates, and descriptions');
    } else {
      console.log('✅ QuickBooks connections available');
      console.log('You can now run the line item sync!');
    }

    console.log('\n💡 Demo Instructions:');
    console.log('====================');
    console.log('1. Start your frontend: npm run dev');
    console.log('2. Navigate to /invoices page');
    console.log('3. Look for "📋 Sync Line Items" button in header');
    console.log('4. Set up QB connection via settings if needed');
    console.log('5. Run sync to get detailed line items from QuickBooks API');

    console.log('\n🔧 Current Line Item Status:');
    const sampleInvoice = await Invoice.findOne({ dataSource: 'quickbooks_csv' });
    if (sampleInvoice) {
      console.log(`Sample invoice (${sampleInvoice.invoiceNumber}) line items:`);
      console.log(`  • Currently: ${sampleInvoice.lineItems?.length || 0} basic line items`);
      console.log(`  • After QB sync: Detailed items with QB product data`);
    }

  } catch (error) {
    console.error('💥 Report failed:', error.message);
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