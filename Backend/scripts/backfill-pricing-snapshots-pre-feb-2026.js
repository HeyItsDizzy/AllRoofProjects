/**
 * CRITICAL PRICING SNAPSHOT BACKFILL - Pre-February 2026
 * 
 * Purpose: Lock ALL existing project pricing to current rates BEFORE switching to new pricing system
 * 
 * Problem: The pricing snapshot system was added recently, so older projects don't have pricing locked.
 *          When we switch to new pricing (Elite 30% vs 40% off), old projects would incorrectly
 *          recalculate at new rates if they don't have snapshots.
 * 
 * Solution: Backfill pricing snapshots for ALL projects that:
 *          1. Don't have a pricing snapshot yet
 *          2. Have a linked client (so we can determine their pricing tier)
 *          3. Lock them to LEGACY pricing (40% off Elite) since that was the system in use
 * 
 * Safety: This script is idempotent - projects with existing snapshots are skipped
 * 
 * Run BEFORE: migrate-to-new-pricing-feb-2026.js
 * Run: node scripts/backfill-pricing-snapshots-pre-feb-2026.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function backfillPricingSnapshots() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📸 PRICING SNAPSHOT BACKFILL - Pre-February 2026');
    console.log('═══════════════════════════════════════════════════════════\n');

    await client.connect();
    console.log('✅ Connected to database\n');

    const db = client.db();
    const projectsCol = db.collection('Projects');
    const clientsCol = db.collection('Clients');

    // ==========================
    // 1. ANALYZE CURRENT STATE
    // ==========================
    console.log('📊 Analyzing current state...\n');

    const totalProjects = await projectsCol.countDocuments();
    const projectsWithSnapshots = await projectsCol.countDocuments({
      'pricingSnapshot.capturedAt': { $ne: null }
    });
    const projectsWithoutSnapshots = await projectsCol.countDocuments({
      $or: [
        { pricingSnapshot: { $exists: false } },
        { 'pricingSnapshot.capturedAt': null }
      ]
    });

    console.log('📈 CURRENT STATE:');
    console.log(`   Total projects: ${totalProjects}`);
    console.log(`   With pricing snapshots: ${projectsWithSnapshots}`);
    console.log(`   WITHOUT pricing snapshots: ${projectsWithoutSnapshots}\n`);

    if (projectsWithoutSnapshots === 0) {
      console.log('✅ All projects already have pricing snapshots!');
      console.log('   Nothing to backfill. Exiting...\n');
      await client.close();
      process.exit(0);
    }

    // ==========================
    // 2. CONFIRM BACKFILL
    // ==========================
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      readline.question(`⚠️  Backfill pricing snapshots for ${projectsWithoutSnapshots} projects? (yes/no): `, resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Backfill cancelled by user');
      await client.close();
      process.exit(0);
    }

    // ==========================
    // 3. BACKFILL SNAPSHOTS
    // ==========================
    console.log('\n🔄 Starting backfill process...\n');

    // Get all projects without snapshots
    const projectsNeedingSnapshots = await projectsCol.find({
      $or: [
        { pricingSnapshot: { $exists: false } },
        { 'pricingSnapshot.capturedAt': null }
      ]
    }).toArray();

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const project of projectsNeedingSnapshots) {
      try {
        // Find the linked client
        let clientData = null;
        
        if (project.linkedClient) {
          clientData = await clientsCol.findOne({ _id: new ObjectId(project.linkedClient) });
        }

        // Determine pricing tier (map old 'Standard' to new 'Casual')
        let pricingTier = clientData?.pricingTier || 'Casual';
        if (pricingTier === 'Standard') pricingTier = 'Casual'; // Normalize old tier name
        
        // IMPORTANT: Lock to LEGACY pricing (useNewPricing: false)
        // This ensures old projects keep the pricing they were quoted at
        const useNewPricing = false; // Force legacy pricing for backfill
        
        // Calculate multiplier based on legacy pricing
        let priceMultiplier;
        if (pricingTier === 'Elite') priceMultiplier = 0.6; // Legacy 40% off
        else if (pricingTier === 'Pro') priceMultiplier = 0.8; // 20% off
        else priceMultiplier = 1.0; // Casual - full price

        // Create snapshot
        const pricingSnapshot = {
          capturedAt: new Date('2026-01-31T23:59:59Z'), // Day before new pricing
          clientPricingTier: pricingTier,
          clientUseNewPricing: useNewPricing, // Always false for backfill
          priceMultiplier: priceMultiplier,
          exchangeRate: null,
          backfilled: true // Flag to indicate this was backfilled
        };

        // Update project
        await projectsCol.updateOne(
          { _id: project._id },
          { $set: { pricingSnapshot } }
        );

        successCount++;
        
        if (successCount % 100 === 0) {
          console.log(`   Processed ${successCount} projects...`);
        }

      } catch (error) {
        console.error(`❌ Error processing project ${project._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n✅ BACKFILL COMPLETE!\n');

    // ==========================
    // 4. VERIFY RESULTS
    // ==========================
    console.log('📊 BACKFILL RESULTS:');
    console.log(`   Successfully backfilled: ${successCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}\n`);

    const finalWithSnapshots = await projectsCol.countDocuments({
      'pricingSnapshot.capturedAt': { $ne: null }
    });
    const finalWithoutSnapshots = await projectsCol.countDocuments({
      $or: [
        { pricingSnapshot: { $exists: false } },
        { 'pricingSnapshot.capturedAt': null }
      ]
    });

    console.log('📈 FINAL STATE:');
    console.log(`   Total projects: ${totalProjects}`);
    console.log(`   With pricing snapshots: ${finalWithSnapshots}`);
    console.log(`   WITHOUT pricing snapshots: ${finalWithoutSnapshots}\n`);

    // ==========================
    // 5. BREAKDOWN BY TIER
    // ==========================
    console.log('💰 PRICING TIER BREAKDOWN:');
    
    const eliteCount = await projectsCol.countDocuments({
      'pricingSnapshot.clientPricingTier': 'Elite',
      'pricingSnapshot.backfilled': true
    });
    const proCount = await projectsCol.countDocuments({
      'pricingSnapshot.clientPricingTier': 'Pro',
      'pricingSnapshot.backfilled': true
    });
    // Count both 'Casual' and legacy 'Standard' together
    const casualCount = await projectsCol.countDocuments({
      'pricingSnapshot.clientPricingTier': { $in: ['Casual', 'Standard'] },
      'pricingSnapshot.backfilled': true
    });

    console.log(`   Elite (40% off): ${eliteCount} projects`);
    console.log(`   Pro (20% off): ${proCount} projects`);
    console.log(`   Casual (full price): ${casualCount} projects (includes legacy 'Standard')\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ IMPORTANT NOTES:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All projects now have pricing snapshots');
    console.log('✅ Backfilled projects locked to LEGACY pricing (40% Elite)');
    console.log('✅ Pricing is now protected from future changes');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Run: node scripts/migrate-to-new-pricing-feb-2026.js');
    console.log('2. This will switch clients to new pricing (30% Elite)');
    console.log('3. New estimates will use new rates, old ones stay locked');
    console.log('═══════════════════════════════════════════════════════════\n');

    await client.close();
    console.log('✅ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error during backfill:', error);
    await client.close();
    process.exit(1);
  }
}

// Run backfill
backfillPricingSnapshots();
