/**
 * PRICING MIGRATION SCRIPT - February 2026
 * 
 * Purpose: Switch all clients to new pricing system (Elite 30% off instead of 40%)
 * Starting: February 1, 2026
 * 
 * Safety: Existing projects are protected by pricing snapshots
 * - Projects sent before Feb 2026 keep legacy pricing (40% off Elite)
 * - Projects sent after Feb 2026 use new pricing (30% off Elite)
 * 
 * Run once: node scripts/migrate-to-new-pricing-feb-2026.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function migrateTonewPricing() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 PRICING SYSTEM MIGRATION - February 2026');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const Client = require('../config/Client');

    // Get current counts
    const totalClients = await Client.countDocuments();
    const currentNewPricing = await Client.countDocuments({ useNewPricing: true });
    const currentLegacyPricing = await Client.countDocuments({ useNewPricing: false });

    console.log('📈 CURRENT STATE:');
    console.log(`   Total clients: ${totalClients}`);
    console.log(`   Using new pricing (30% Elite): ${currentNewPricing}`);
    console.log(`   Using legacy pricing (40% Elite): ${currentLegacyPricing}\n`);

    // Confirm migration
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      readline.question('⚠️  Switch ALL clients to new pricing system? (yes/no): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Migration cancelled by user');
      process.exit(0);
    }

    console.log('\n🔄 Migrating clients to new pricing system...\n');

    // Update all clients to use new pricing
    const result = await Client.updateMany(
      {}, // All clients
      { 
        $set: { 
          useNewPricing: true,
          pricingMigrationDate: new Date('2026-02-01') // Record when they switched
        } 
      }
    );

    console.log('✅ MIGRATION COMPLETE!\n');
    console.log('📊 RESULTS:');
    console.log(`   Clients updated: ${result.modifiedCount}`);
    console.log(`   Total clients: ${totalClients}\n`);

    // Verify new counts
    const newPricingCount = await Client.countDocuments({ useNewPricing: true });
    const legacyPricingCount = await Client.countDocuments({ useNewPricing: false });

    console.log('📈 NEW STATE:');
    console.log(`   Using new pricing (30% Elite): ${newPricingCount}`);
    console.log(`   Using legacy pricing (40% Elite): ${legacyPricingCount}\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ IMPORTANT NOTES:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All existing projects retain their original pricing');
    console.log('   (Protected by pricing snapshots captured at send time)');
    console.log('');
    console.log('✅ New estimates sent after Feb 1, 2026 will use:');
    console.log('   - Elite tier: 30% off (was 40%)');
    console.log('   - Pro tier: 20% off (unchanged)');
    console.log('   - Standard: Full price (unchanged)');
    console.log('');
    console.log('✅ Website pricing calculator will reflect new rates');
    console.log('═══════════════════════════════════════════════════════════\n');

    await mongoose.disconnect();
    console.log('✅ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run migration
migrateTonewPricing();
