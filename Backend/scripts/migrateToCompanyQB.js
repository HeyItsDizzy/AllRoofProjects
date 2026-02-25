/**
 * Migration Script: Multi-tenant QB to Single Company QB
 * Migrate from individual client QB connections to single company QB integration
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Client = require('../config/Client');
const CompanyQBSettings = require('../models/CompanyQBSettings');
const Invoice = require('../models/Invoice');

async function migrateToCompanyQB() {
  try {
    console.log('🔄 Starting migration from multi-tenant to company QB model...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Step 1: Initialize company QB settings
    console.log('📋 Step 1: Initializing company QB settings...');
    
    let companySettings = await CompanyQBSettings.findOne({ companyName: 'All Roof Takeoffs' });
    
    if (!companySettings) {
      companySettings = new CompanyQBSettings({
        companyName: 'All Roof Takeoffs',
        quickbooks: {
          connected: false,
          autoSyncEnabled: true,
          syncFrequency: 'daily'
        },
        defaultSettings: {
          terms: '7 Days',
          taxable: true,
          taxRate: 0.10,
          emailSettings: {
            sendAutomatically: false,
            ccEmails: ['admin@allrooftakeoffs.com.au']
          }
        }
      });
      
      await companySettings.save();
      console.log('✅ Company QB settings initialized');
    } else {
      console.log('✅ Company QB settings already exist');
    }
    
    // Step 2: Analyze existing client QB connections
    console.log('📋 Step 2: Analyzing existing client QB connections...');
    
    const clientsWithQB = await Client.find({
      'integrationStatus.quickbooks.connected': true
    });
    
    console.log(`📊 Found ${clientsWithQB.length} clients with QB connections`);
    
    if (clientsWithQB.length > 0) {
      console.log('⚠️ WARNING: Found existing client QB connections:');
      clientsWithQB.forEach(client => {
        console.log(`   - ${client.name}: Connected to realm ${client.integrationStatus?.quickbooks?.realmId}`);
      });
      console.log('');
      console.log('❗ IMPORTANT: The new system uses a single company QB connection.');
      console.log('   You will need to:');
      console.log('   1. Connect QuickBooks at the company level via /admin/quickbooks');
      console.log('   2. Run customer sync to map clients to QB customers');
      console.log('   3. Existing client QB tokens will be preserved but not used');
    }
    
    // Step 3: Update invoice integration status structure
    console.log('📋 Step 3: Updating invoice integration status...');
    
    const invoicesWithOldStructure = await Invoice.find({
      $or: [
        { 'integrationStatus.quickbooks': { $exists: true, $type: 'string' } },
        { 'integrationStatus.quickbooks.syncStatus': { $exists: true } }
      ]
    });
    
    let updatedInvoices = 0;
    
    for (const invoice of invoicesWithOldStructure) {
      const oldQbStatus = invoice.integrationStatus?.quickbooks;
      
      // Preserve existing QB data but update structure
      const newQbStatus = {
        qbSyncStatus: oldQbStatus?.syncStatus || (oldQbStatus === 'synced' ? 'synced' : 'pending'),
        qbLastSync: oldQbStatus?.lastSync || null,
        qbInvoiceId: oldQbStatus?.qbInvoiceId || null,
        qbDocNumber: oldQbStatus?.qbDocNumber || null,
        sourceSystem: oldQbStatus?.sourceSystem || 'csv', // Most existing are from CSV
        createdInQB: false, // Existing invoices were not created via web app
        migrated: true,
        migratedAt: new Date()
      };
      
      await Invoice.findByIdAndUpdate(
        invoice._id,
        { 
          $set: { 
            'integrationStatus.quickbooks': newQbStatus 
          }
        }
      );
      
      updatedInvoices++;
    }
    
    console.log(`✅ Updated ${updatedInvoices} invoices with new integration structure`);
    
    // Step 4: Generate migration report
    console.log('📋 Step 4: Generating migration report...');
    
    const totalClients = await Client.countDocuments();
    const totalInvoices = await Invoice.countDocuments();
    const csvInvoices = await Invoice.countDocuments({
      'integrationStatus.quickbooks.sourceSystem': 'csv'
    });
    const qbInvoices = await Invoice.countDocuments({
      'integrationStatus.quickbooks.qbInvoiceId': { $exists: true, $ne: null }
    });
    
    const report = {
      migration: {
        timestamp: new Date(),
        status: 'completed'
      },
      statistics: {
        totalClients,
        clientsWithQB: clientsWithQB.length,
        totalInvoices,
        csvInvoices,
        qbInvoices,
        invoicesUpdated: updatedInvoices
      },
      nextSteps: [
        'Connect QuickBooks at /admin/quickbooks',
        'Run customer sync to map clients to QB customers',
        'Test invoice sync from QB to MongoDB',
        'Test invoice creation from web app to QB'
      ]
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION REPORT');
    console.log('='.repeat(60));
    console.log(JSON.stringify(report, null, 2));
    console.log('='.repeat(60));
    
    // Save report to company settings
    companySettings.migrationReport = report;
    await companySettings.save();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('🎯 Next: Visit /admin/quickbooks to connect QuickBooks');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  migrateToCompanyQB();
}

module.exports = migrateToCompanyQB;