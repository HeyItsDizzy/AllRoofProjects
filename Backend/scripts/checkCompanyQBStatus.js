/**
 * Company QuickBooks Status Checker
 * Check status of single-company QB integration
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models and services
const CompanyQBSettings = require('../models/CompanyQBSettings');
const Client = require('../config/Client');
const Invoice = require('../models/Invoice');
const companyQBService = require('../services/companyQBService');

async function checkCompanyQBStatus() {
  try {
    console.log('🔍 Checking Company QuickBooks Integration Status...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get company settings
    const settings = await CompanyQBSettings.getDefault();
    
    console.log('📋 COMPANY QB SETTINGS');
    console.log('='.repeat(50));
    console.log(`Company Name: ${settings.companyName}`);
    console.log(`QB Connected: ${settings.isConnected()}`);
    console.log(`Needs Token Refresh: ${settings.needsTokenRefresh()}`);
    console.log(`Realm ID: ${settings.quickbooks?.realmId || 'Not set'}`);
    console.log(`Last Connected: ${settings.quickbooks?.lastConnected || 'Never'}`);
    console.log(`Last Sync: ${settings.quickbooks?.lastSync || 'Never'}`);
    console.log(`Auto Sync: ${settings.quickbooks?.autoSyncEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Sync Frequency: ${settings.quickbooks?.syncFrequency || 'Not set'}`);
    
    if (settings.quickbooks?.lastSyncError) {
      console.log(`⚠️ Last Sync Error: ${settings.quickbooks.lastSyncError}`);
    }
    
    console.log('\n📊 CLIENT MAPPINGS');
    console.log('='.repeat(50));
    console.log(`Total Mappings: ${settings.customerMappings?.length || 0}`);
    
    if (settings.customerMappings?.length > 0) {
      const verified = settings.customerMappings.filter(m => m.verified).length;
      const autoMapped = settings.customerMappings.filter(m => m.autoMapped).length;
      
      console.log(`Verified Mappings: ${verified}`);
      console.log(`Auto-mapped: ${autoMapped}`);
      console.log(`Manual Mappings: ${settings.customerMappings.length - autoMapped}`);
      
      console.log('\nTop 5 Mappings:');
      settings.customerMappings.slice(0, 5).forEach((mapping, index) => {
        const status = mapping.verified ? '✅' : mapping.autoMapped ? '🤖' : '👤';
        console.log(`  ${index + 1}. ${status} Client → QB Customer (${mapping.mappedAt?.toDateString()})`);
      });
    }
    
    console.log('\n📈 DATABASE STATISTICS');
    console.log('='.repeat(50));
    
    const totalClients = await Client.countDocuments();
    const totalInvoices = await Invoice.countDocuments();
    const qbInvoices = await Invoice.countDocuments({
      'integrationStatus.quickbooks.qbInvoiceId': { $exists: true, $ne: null }
    });
    const csvInvoices = await Invoice.countDocuments({
      'integrationStatus.quickbooks.sourceSystem': 'csv'
    });
    const webappInvoices = await Invoice.countDocuments({
      'integrationStatus.quickbooks.sourceSystem': 'webapp'
    });
    const draftInvoices = await Invoice.countDocuments({
      status: 'draft'
    });
    const paidInvoices = await Invoice.countDocuments({
      status: 'paid'
    });
    
    console.log(`Total Clients: ${totalClients}`);
    console.log(`Total Invoices: ${totalInvoices}`);
    console.log(`QB Synced Invoices: ${qbInvoices}`);
    console.log(`CSV Imported: ${csvInvoices}`);
    console.log(`WebApp Created: ${webappInvoices}`);
    console.log(`Draft Invoices: ${draftInvoices}`);
    console.log(`Paid Invoices: ${paidInvoices}`);
    
    const syncCoverage = totalInvoices > 0 ? Math.round((qbInvoices / totalInvoices) * 100) : 0;
    console.log(`QB Sync Coverage: ${syncCoverage}%`);
    
    console.log('\n🔧 SERVICE STATUS');
    console.log('='.repeat(50));
    
    try {
      const serviceStatus = await companyQBService.getConnectionStatus();
      console.log(`Service Connected: ${serviceStatus.connected}`);
      console.log(`Service Initialized: ${companyQBService.isInitialized}`);
      
      if (serviceStatus.connected) {
        console.log('Testing QB connection...');
        const testResult = await companyQBService.getAllQBCustomers();
        console.log(`✅ Connection test successful: ${testResult.length} QB customers found`);
      } else {
        console.log('⚠️ Service not connected to QuickBooks');
      }
    } catch (error) {
      console.log(`❌ Service test failed: ${error.message}`);
    }
    
    console.log('\n💡 RECOMMENDATIONS');
    console.log('='.repeat(50));
    
    const recommendations = [];
    
    if (!settings.isConnected()) {
      recommendations.push('🔗 Connect QuickBooks via /admin/quickbooks');
    }
    
    if (settings.customerMappings?.length === 0) {
      recommendations.push('👥 Run customer sync to map clients to QB customers');
    }
    
    if (settings.customerMappings?.length > 0) {
      const unverified = settings.customerMappings.filter(m => !m.verified).length;
      if (unverified > 0) {
        recommendations.push(`✅ Verify ${unverified} client-customer mappings`);
      }
    }
    
    if (syncCoverage < 90 && qbInvoices < csvInvoices) {
      recommendations.push('🔄 Run full invoice sync from QuickBooks');
    }
    
    if (draftInvoices > 0) {
      recommendations.push(`📝 Review ${draftInvoices} draft invoices for QB creation`);
    }
    
    if (recommendations.length === 0) {
      console.log('✅ System appears to be properly configured!');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n🎯 NEXT STEPS');
    console.log('='.repeat(50));
    console.log('1. Visit /admin/quickbooks for QB management');
    console.log('2. Visit /invoices for invoice creation');
    console.log('3. Use /invoices endpoint for viewing synced data');
    console.log('4. Monitor sync logs in the admin panel');
    
  } catch (error) {
    console.error('❌ Status check failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from MongoDB');
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Company QuickBooks Status Checker');
    console.log('');
    console.log('Usage: node checkCompanyQBStatus.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('');
    console.log('This script checks the status of the single-company QB integration.');
    process.exit(0);
  }
  
  checkCompanyQBStatus();
}

module.exports = checkCompanyQBStatus;