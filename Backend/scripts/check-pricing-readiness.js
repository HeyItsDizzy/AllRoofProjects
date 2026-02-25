/**
 * Quick pre-flight check for pricing migration
 * Run: node scripts/check-pricing-readiness.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function check() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 PRICING MIGRATION PRE-FLIGHT CHECK');
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Database connection: SUCCESS\n');
    
    const db = client.db();
    const projectsCol = db.collection('Projects');
    const clientsCol = db.collection('Clients');
    
    // Check 1: Project snapshot coverage
    console.log('📸 PRICING SNAPSHOT COVERAGE:');
    const totalProjects = await projectsCol.countDocuments();
    const withSnapshots = await projectsCol.countDocuments({ 
      'pricingSnapshot.capturedAt': { $ne: null } 
    });
    const withoutSnapshots = totalProjects - withSnapshots;
    
    console.log(`   Total projects: ${totalProjects}`);
    console.log(`   With snapshots: ${withSnapshots}`);
    console.log(`   Without snapshots: ${withoutSnapshots}`);
    
    if (withoutSnapshots > 0) {
      console.log('   ⚠️  ACTION REQUIRED: Run backfill script');
      console.log('      → node scripts/backfill-pricing-snapshots-pre-feb-2026.js\n');
    } else {
      console.log('   ✅ All projects have snapshots\n');
    }
    
    // Check 2: Client pricing status
    console.log('👥 CLIENT PRICING STATUS:');
    const totalClients = await clientsCol.countDocuments();
    const newPricing = await clientsCol.countDocuments({ useNewPricing: true });
    const legacyPricing = await clientsCol.countDocuments({ useNewPricing: false });
    
    console.log(`   Total clients: ${totalClients}`);
    console.log(`   On new pricing (30% Elite): ${newPricing}`);
    console.log(`   On legacy pricing (40% Elite): ${legacyPricing}`);
    
    if (legacyPricing === totalClients) {
      console.log('   ℹ️  All clients still on legacy pricing');
      console.log('      Ready to run: node scripts/migrate-to-new-pricing-feb-2026.js\n');
    } else if (newPricing === totalClients) {
      console.log('   ✅ All clients migrated to new pricing\n');
    } else {
      console.log('   ⚠️  WARNING: Mixed pricing state!\n');
    }
    
    // Check 3: Backfill statistics
    console.log('📈 BACKFILL STATISTICS:');
    const backfilled = await projectsCol.countDocuments({ 
      'pricingSnapshot.backfilled': true 
    });
    const natural = await projectsCol.countDocuments({ 
      'pricingSnapshot.backfilled': { $ne: true },
      'pricingSnapshot.capturedAt': { $ne: null }
    });
    
    console.log(`   Backfilled snapshots: ${backfilled}`);
    console.log(`   Natural snapshots: ${natural}`);
    
    if (backfilled > 0) {
      console.log('   ✅ Backfill has been run\n');
    } else {
      console.log('   ℹ️  No backfilled snapshots yet\n');
    }
    
    // Check 4: Pricing tier distribution
    console.log('💰 PRICING TIER DISTRIBUTION:');
    const elite06 = await projectsCol.countDocuments({ 
      'pricingSnapshot.priceMultiplier': 0.6 
    });
    const elite07 = await projectsCol.countDocuments({ 
      'pricingSnapshot.priceMultiplier': 0.7 
    });
    const pro = await projectsCol.countDocuments({ 
      'pricingSnapshot.priceMultiplier': 0.8 
    });
    const standard = await projectsCol.countDocuments({ 
      'pricingSnapshot.priceMultiplier': 1.0 
    });
    
    console.log(`   Elite Legacy (0.6 / 40% off): ${elite06}`);
    console.log(`   Elite New (0.7 / 30% off): ${elite07}`);
    console.log(`   Pro (0.8 / 20% off): ${pro}`);
    console.log(`   Standard (1.0 / full price): ${standard}`);
    console.log('');
    
    // Check 5: Recent projects (Feb 2026+)
    const feb2026Projects = await projectsCol.countDocuments({
      'pricingSnapshot.capturedAt': { $gte: new Date('2026-02-01') }
    });
    const feb2026New = await projectsCol.countDocuments({
      'pricingSnapshot.capturedAt': { $gte: new Date('2026-02-01') },
      'pricingSnapshot.clientUseNewPricing': true
    });
    
    console.log('📅 FEBRUARY 2026+ PROJECTS:');
    console.log(`   Total: ${feb2026Projects}`);
    console.log(`   Using new pricing: ${feb2026New}`);
    console.log('');
    
    // Final recommendation
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 RECOMMENDATION:');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (withoutSnapshots > 0) {
      console.log('❌ NOT READY - Missing snapshots');
      console.log('');
      console.log('NEXT STEP:');
      console.log('1. Run: node scripts/backfill-pricing-snapshots-pre-feb-2026.js');
      console.log('2. Re-run this check');
    } else if (legacyPricing === totalClients && newPricing === 0) {
      console.log('✅ READY FOR MIGRATION');
      console.log('');
      console.log('NEXT STEP:');
      console.log('1. Backup database first!');
      console.log('2. Run: node scripts/migrate-to-new-pricing-feb-2026.js');
    } else if (newPricing === totalClients) {
      console.log('✅ MIGRATION COMPLETE');
      console.log('');
      console.log('System is running on new pricing (Elite 30% off).');
      console.log('Old projects protected by snapshots (Elite 40% off).');
    } else {
      console.log('⚠️  UNEXPECTED STATE - Manual review needed');
    }
    console.log('═══════════════════════════════════════════════════════════');
    
    await client.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.close();
    process.exit(1);
  }
}

check();
