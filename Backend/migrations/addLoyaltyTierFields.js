// migrations/addLoyaltyTierFields.js
/**
 * MIGRATION SCRIPT: Add Loyalty Tier System Fields to Existing Clients
 * 
 * Run this once to initialize loyalty tier fields for all existing clients.
 * Does NOT enroll clients in the system - that happens during rollout.
 */

const mongoose = require('mongoose');
const Client = require('../config/Client');
require('dotenv').config();

async function migrateLoyaltyTierFields() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔧 MIGRATION: Adding Loyalty Tier Fields to Clients');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Connect to database
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not found in environment variables');
    }
    
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to database\n');
    
    // Find all clients that don't have loyalty tier fields
    const clients = await Client.find({
      loyaltyTier: { $exists: false }
    });
    
    console.log(`Found ${clients.length} clients to migrate\n`);
    
    if (clients.length === 0) {
      console.log('ℹ️  No clients need migration. All clients already have loyalty tier fields.\n');
      await mongoose.connection.close();
      return;
    }
    
    // Update each client with default loyalty tier values
    let updatedCount = 0;
    
    for (const client of clients) {
      await Client.findByIdAndUpdate(client._id, {
        // Tier status
        loyaltyTier: 'standard',
        tierEffectiveDate: null,
        previousTier: null,
        
        // Protection
        tierProtectionType: 'none',
        tierProtectionQty: 0,
        tierProtectionPoints: 0,
        protectionPointsHistory: [],
        
        // Cashback
        cashbackCredits: 0,
        cashbackHistory: [],
        
        // Tokens
        estimateTokens: 0,
        
        // Monthly tracking
        currentMonthEstimateUnits: 0,
        monthlyCounterResetDate: null,
        monthlyUsageHistory: [],
        
        // Rollout tracking
        loyaltySystemEnrolledDate: null,
        isLoyaltyEliteRollout: false,
        
        // Billing requirements
        totalUnitsBilledAllTime: 0,
        hasMetMinimumBillingRequirement: false
      });
      
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`   Migrated ${updatedCount}/${clients.length} clients...`);
      }
    }
    
    console.log(`\n✅ Migration complete: Updated ${updatedCount} clients`);
    console.log('\nDefault values set:');
    console.log('   • loyaltyTier: standard');
    console.log('   • tierProtectionType: none');
    console.log('   • tierProtectionQty: 0');
    console.log('   • tierProtectionPoints: 0');
    console.log('   • cashbackCredits: 0');
    console.log('   • currentMonthEstimateUnits: 0');
    console.log('   • loyaltySystemEnrolledDate: null (not enrolled yet)');
    
    console.log('\nℹ️  Note: Clients are NOT yet enrolled in the loyalty system.');
    console.log('   Run the rollout endpoint on Feb 2, 2026 to enroll all clients.');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateLoyaltyTierFields();
}

module.exports = { migrateLoyaltyTierFields };
