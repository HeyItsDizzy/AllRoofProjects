/**
 * MIGRATION: Backfill Pricing Snapshots with Hardcoded Historical Prices
 * Date: February 8, 2026
 * 
 * Purpose: Set immutable priceEach and totalPrice for ALL projects based on historical pricing
 * 
 * Historical Pricing Context:
 * - OLD pricing (before Feb 2026):
 *   • Basic (ea) = $45
 *   • Standard (ea) = $60
 *   • Std Highest (ea) = $70
 *   • Complex (hr) = $60
 *   • Commercial (hr) = $60
 *   • Townhouses (hr) = $60
 *   • Hourly (hr) = $60
 *   • Wall Cladding (hr) = $60
 *   • Manual Price = Keep current price (no calculation)
 * 
 * - NEW pricing (Feb 2026+):
 *   • Standard = $100
 *   • Detailed = $130
 *   • Comprehensive = $160
 *   • Precision = $190
 * 
 * - SKIP for manual review:
 *   • Nearmap Rebate
 *   • Detailed (old)
 *   • Dtd Highest (old)
 * 
 * - Tier multipliers:
 *   • Elite: 0.6 (legacy) / 0.7 (new) - 40%/30% off
 *   • Pro: 0.8 (both) - 20% off
 *   • Casual/Standard: 1.0 (both) - Full price
 */

const { MongoClient, Double } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Historical pricing data - OLD SYSTEM (before Feb 2026)
const HISTORICAL_PRICING_OLD = {
  'Basic': 45,                  // ea
  'Standard': 60,               // ea
  'Std Highest': 70,            // ea
  'Complex': 60,                // hr
  'Commercial': 60,             // hr
  'Townhouses': 60,             // hr
  'Hourly': 60,                 // hr
  'Wall Cladding': 60          // hr
};

// Current pricing - NEW SYSTEM (Feb 2026+)
const CURRENT_PRICING_NEW = {
  'Standard': 100,
  'Detailed': 130,
  'Comprehensive': 160,
  'Precision': 190
};

// Plan types to SKIP - require manual review
const SKIP_PLAN_TYPES = [
  'Nearmap Rebate',
  'Detailed',
  'Dtd Highest'
];

// Tier multipliers
const TIER_MULTIPLIERS = {
  'Elite': { legacy: 0.6, new: 0.7 },  // 40% off legacy, 30% off new
  'Pro': { legacy: 0.8, new: 0.8 },     // 20% off (same for both)
  'Casual': { legacy: 1.0, new: 1.0 },  // Full price
  'Standard': { legacy: 1.0, new: 1.0 } // Old tier name (map to Casual)
};

/**
 * Calculate historical price for a project
 */
function calculateHistoricalPrice(project, pricingSnapshot) {
  const planType = project.PlanType || 'Standard';
  
  // Skip plan types that need manual review
  if (SKIP_PLAN_TYPES.includes(planType)) {
    return null; // Signal to skip this project
  }
  
  // For "Manual Price", use the current EstimatePrice or Price value
  if (planType === 'Manual Price') {
    const manualPrice = parseFloat(project.EstimatePrice || project.Price || 0);
    const qty = parseFloat(project.Qty || project.EstimateQty || 1);
    return {
      priceEach: manualPrice,
      totalPrice: manualPrice * qty,
      basePrice: manualPrice,
      multiplier: 1.0,
      isManual: true
    };
  }
  
  const tier = pricingSnapshot?.clientPricingTier || 'Casual';
  const useNewPricing = pricingSnapshot?.clientUseNewPricing || false;
  
  // Determine which pricing table to use
  let basePrice = 0;
  
  if (useNewPricing) {
    // Use new pricing system (Feb 2026+)
    basePrice = CURRENT_PRICING_NEW[planType] || CURRENT_PRICING_NEW['Standard'] || 100;
  } else {
    // Use old/historical pricing (before Feb 2026)
    basePrice = HISTORICAL_PRICING_OLD[planType] || HISTORICAL_PRICING_OLD['Standard'] || 60;
  }
  
  // Apply tier multiplier
  const tierKey = tier === 'Standard' ? 'Casual' : tier;
  const multiplierSet = TIER_MULTIPLIERS[tierKey] || TIER_MULTIPLIERS['Casual'];
  const multiplier = useNewPricing ? multiplierSet.new : multiplierSet.legacy;
  
  const priceEach = basePrice * multiplier;
  const qty = parseFloat(project.Qty || project.EstimateQty || 0);
  const totalPrice = priceEach * qty;
  
  return { priceEach, totalPrice, basePrice, multiplier, isManual: false };
}

async function backfillPricingSnapshots() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(process.env.DB_NAME);
    const projectsCollection = db.collection('Projects');  // Uppercase P
    
    // Find ALL projects from the very beginning
    const allProjects = await projectsCollection.find({}).toArray();
    console.log(`\n📊 Found ${allProjects.length} total projects in database\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let skippedManualReview = 0;
    let errorCount = 0;
    
    const manualReviewProjects = [];
    
    for (const project of allProjects) {
      try {
        const snapshot = project.pricingSnapshot || {};
        
        // Skip if it already has hardcoded prices
        if (snapshot.priceEach && snapshot.totalPrice) {
          console.log(`⏭️  Skipping ${project.ProjectName || project._id} - already has priceEach/totalPrice`);
          skippedCount++;
          continue;
        }
        
        // Calculate historical price
        const result = calculateHistoricalPrice(project, snapshot);
        
        // Skip if it needs manual review
        if (result === null) {
          console.log(`⚠️  Manual review needed: ${project.ProjectName || project._id} - PlanType: ${project.PlanType}`);
          manualReviewProjects.push({
            _id: project._id.toString(),
            projectId: project.ProjectId || 'N/A',
            projectName: project.ProjectName || 'Unnamed',
            planType: project.PlanType,
            currentPrice: project.EstimatePrice || project.Price || 0,
            qty: project.Qty || project.EstimateQty || 0,
            dateReceived: project.DateReceived || project.createdAt || null,
            linkedClients: project.linkedClients || []
          });
          skippedManualReview++;
          continue;
        }
        
        const { priceEach, totalPrice, basePrice, multiplier, isManual } = result;
        
        // Create or update the pricing snapshot with hardcoded values
        const updatedSnapshot = {
          ...snapshot,
          capturedAt: snapshot.capturedAt || new Date(project.createdAt || project.DateReceived || new Date()),
          clientPricingTier: snapshot.clientPricingTier || 'Casual',
          clientUseNewPricing: snapshot.clientUseNewPricing || false,
          priceEach: new Double(Math.round(priceEach * 100) / 100),  // Force Double type
          totalPrice: new Double(Math.round(totalPrice * 100) / 100),
          priceMultiplier: new Double(snapshot.priceMultiplier || multiplier),
          exchangeRate: snapshot.exchangeRate || null,
          // Add metadata about the backfill
          backfilled: true,
          backfilledAt: new Date(),
          historicalBasePrice: new Double(basePrice),
          isManualPrice: isManual || false
        };
        
        // Update the project
        await projectsCollection.updateOne(
          { _id: project._id },
          { $set: { pricingSnapshot: updatedSnapshot } }
        );
        
        const icon = isManual ? '🔧' : '✅';
        console.log(`${icon} ${project.ProjectName || project._id}:`, {
          planType: project.PlanType,
          tier: updatedSnapshot.clientPricingTier,
          useNew: updatedSnapshot.clientUseNewPricing,
          basePrice: `$${basePrice}`,
          multiplier: multiplier,
          priceEach: `$${updatedSnapshot.priceEach}`,
          qty: project.Qty || project.EstimateQty || 0,
          totalPrice: `$${updatedSnapshot.totalPrice}`,
          manual: isManual
        });
        
        updatedCount++;
        
      } catch (err) {
        console.error(`❌ Error processing project ${project._id}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total projects: ${allProjects.length}`);
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped (already had prices): ${skippedCount}`);
    console.log(`⚠️  Skipped (manual review needed): ${skippedManualReview}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(80));
    
    if (manualReviewProjects.length > 0) {
      console.log('\n⚠️  PROJECTS REQUIRING MANUAL REVIEW:');
      console.log('-'.repeat(80));
      manualReviewProjects.forEach(p => {
        console.log(`  - ${p.projectName} (ID: ${p.projectId})`);
        console.log(`    MongoDB _id: ${p._id}`);
        console.log(`    Plan Type: ${p.planType}`);
        console.log(`    Current Price: $${p.currentPrice || 0}`);
        console.log(`    Qty: ${p.qty}`);
        console.log('');
      });
      console.log('-'.repeat(80) + '\n');
      
      // Save to JSON file for reference
      const outputPath = path.join(__dirname, 'manual-review-projects.json');
      fs.writeFileSync(outputPath, JSON.stringify(manualReviewProjects, null, 2), 'utf-8');
      console.log(`📄 Manual review list saved to: ${outputPath}\n`);
    }
    console.log('');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  backfillPricingSnapshots()
    .then(() => {
      console.log('✅ Migration finished successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { backfillPricingSnapshots };
