// services/loyaltyTierService.js
/**
 * LOYALTY TIER SYSTEM SERVICE
 * 
 * Point-based tier protection system with automatic monthly evaluation.
 * Tiers: Casual (0-5 units), Pro (6-10 units), Elite (10+ units)
 * Protection: Pro needs +5 points, Elite needs +10 points for 1 protection month
 * 
 * ELITE TIER PROTECTION POINTS:
 * - Elite clients must meet 10 units minimum per month
 * - For every unit AFTER the 10th unit, they earn 1 loyalty protection point
 * - Every 10 points = 1 month of tier protection (max 3 months)
 */

const Client = require('../config/Client');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const LOYALTY_TIER_CONFIG = {
  // Tier thresholds (units per month)
  TIERS: {
    CASUAL: {
      name: 'casual',
      minUnits: 0,
      maxUnits: 5,
      pricePerUnit: 100,
      discount: 0
    },
    PRO: {
      name: 'pro',
      minUnits: 6,
      maxUnits: 10,
      pricePerUnit: 80,
      discount: 20,
      protectionPointsRequired: 5  // +5 points = 1 protection month
    },
    ELITE: {
      name: 'elite',
      minUnits: 10,  // Elite minimum is 10 units
      maxUnits: Infinity,
      pricePerUnit: 70,
      discount: 30,
      protectionPointsRequired: 10 // +10 points = 1 protection month
    }
  },
  
  // Protection rules
  MAX_PROTECTION_MONTHS: 3,
  PRO_TO_ELITE_CONVERSION: 5, // 1 Pro protection = 5 Elite points
  
  // Cashback rules
  CASHBACK_AMOUNT: 100,
  MINIMUM_UNITS_FOR_CASHBACK: 5,
  
  // Rollout
  ROLLOUT_DATE: new Date('2026-02-02'),
  ROLLOUT_TIER: 'elite'
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIER CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine tier based on monthly unit count
 * @param {number} units - Number of estimate units submitted in the month
 * @returns {string} - 'casual', 'pro', or 'elite'
 */
function calculateTier(units) {
  const { TIERS } = LOYALTY_TIER_CONFIG;
  
  if (units >= TIERS.ELITE.minUnits) return TIERS.ELITE.name;
  if (units >= TIERS.PRO.minUnits) return TIERS.PRO.name;
  return TIERS.CASUAL.name;
}

/**
 * Get tier configuration by tier name
 * @param {string} tierName - 'casual', 'pro', or 'elite'
 * @returns {object} - Tier configuration object
 */
function getTierConfig(tierName) {
  const { TIERS } = LOYALTY_TIER_CONFIG;
  
  switch (tierName) {
    case 'elite': return TIERS.ELITE;
    case 'pro': return TIERS.PRO;
    case 'casual': return TIERS.CASUAL;
    default: return TIERS.CASUAL;
  }
}

/**
 * Get price per unit for a given tier
 * @param {string} tierName - 'casual', 'pro', or 'elite'
 * @returns {number} - Price per unit in dollars
 */
function getPricePerUnit(tierName) {
  return getTierConfig(tierName).pricePerUnit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROTECTION POINT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate protection points earned this month
 * @param {number} unitsSubmitted - Units submitted this month
 * @param {string} currentTier - Current tier name
 * @returns {number} - Points earned (units above tier minimum)
 */
function calculateProtectionPoints(unitsSubmitted, currentTier) {
  const tierConfig = getTierConfig(currentTier);
  const tierMinimum = tierConfig.minUnits;
  
  // Only Pro and Elite tiers earn protection points
  if (currentTier === 'casual') return 0;
  
  // Points = units submitted - tier minimum (can be negative or zero)
  const points = Math.max(0, unitsSubmitted - tierMinimum);
  
  return points;
}

/**
 * Check if points threshold is met and award protection months
 * @param {object} client - Client document
 * @param {number} pointsEarned - Points earned this month
 * @returns {object} - { protectionAwarded: boolean, newQty: number, newPoints: number }
 */
function processProtectionAward(client, pointsEarned) {
  const currentTier = client.loyaltyTier;
  const tierConfig = getTierConfig(currentTier);
  
  // Only Pro and Elite can earn protection
  if (currentTier === 'casual') {
    return { protectionAwarded: false, newQty: 0, newPoints: 0 };
  }
  
  const pointsRequired = tierConfig.protectionPointsRequired;
  const currentPoints = client.tierProtectionPoints || 0;
  const currentQty = client.tierProtectionQty || 0;
  
  // Add new points to existing balance
  let totalPoints = currentPoints + pointsEarned;
  let newQty = currentQty;
  let protectionAwarded = false;
  
  // Check if we've reached the threshold
  while (totalPoints >= pointsRequired && newQty < LOYALTY_TIER_CONFIG.MAX_PROTECTION_MONTHS) {
    totalPoints -= pointsRequired;
    newQty++;
    protectionAwarded = true;
  }
  
  return {
    protectionAwarded,
    newQty,
    newPoints: totalPoints
  };
}

/**
 * Award a protection month to client
 * @param {string} clientId - Client ID
 * @param {string} tierType - 'pro' or 'elite'
 * @param {number} newQty - New protection quantity
 * @param {number} newPoints - New points balance
 */
async function awardProtectionMonth(clientId, tierType, newQty, newPoints) {
  await Client.findByIdAndUpdate(clientId, {
    tierProtectionType: tierType,
    tierProtectionQty: newQty,
    tierProtectionPoints: newPoints
  });
  
  console.log(`✅ Awarded protection to client ${clientId}: ${newQty} month(s) of ${tierType} protection, ${newPoints} points remaining`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER PROMOTION & CONVERSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert protection when client is promoted from Pro to Elite
 * @param {string} clientId - Client ID
 * @param {object} client - Current client document
 */
async function convertProtectionOnPromotion(clientId, client) {
  const oldTier = client.previousTier;
  const newTier = client.loyaltyTier;
  
  // Only convert when promoting from Pro to Elite
  if (oldTier !== 'pro' || newTier !== 'elite') return;
  
  const currentProtectionQty = client.tierProtectionQty || 0;
  const currentProtectionPoints = client.tierProtectionPoints || 0;
  const currentProtectionType = client.tierProtectionType || 'none';
  
  // Only convert if they have Pro protections
  if (currentProtectionType !== 'pro') return;
  
  // Convert: 1 Pro protection = 5 Elite points
  const convertedPoints = currentProtectionQty * LOYALTY_TIER_CONFIG.PRO_TO_ELITE_CONVERSION;
  const totalElitePoints = convertedPoints + currentProtectionPoints;
  
  // Update client with converted protection
  await Client.findByIdAndUpdate(clientId, {
    tierProtectionType: 'elite',
    tierProtectionQty: 0, // Reset qty, converted to points
    tierProtectionPoints: totalElitePoints
  });
  
  console.log(`🔄 Converted Pro protection to Elite points for client ${clientId}:`);
  console.log(`   ${currentProtectionQty} Pro protection(s) + ${currentProtectionPoints} Pro points → ${totalElitePoints} Elite points`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER PROTECTION USAGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply tier protection when client drops below tier minimum
 * @param {object} client - Client document
 * @param {number} unitsSubmitted - Units submitted this month
 * @returns {object} - { protectionUsed: boolean, maintainTier: boolean, newQty: number }
 */
function applyTierProtection(client, unitsSubmitted) {
  const currentTier = client.loyaltyTier;
  const tierConfig = getTierConfig(currentTier);
  const tierMinimum = tierConfig.minUnits;
  
  // Check if client meets tier minimum
  const meetsTierMinimum = unitsSubmitted >= tierMinimum;
  
  if (meetsTierMinimum) {
    // No protection needed
    return { protectionUsed: false, maintainTier: true, newQty: client.tierProtectionQty || 0 };
  }
  
  // Client is below minimum - check for protection
  const protectionType = client.tierProtectionType;
  const protectionQty = client.tierProtectionQty || 0;
  
  // Check if protection type matches current tier
  const hasValidProtection = protectionType === currentTier && protectionQty > 0;
  
  if (hasValidProtection) {
    // Use 1 month of protection
    const newQty = protectionQty - 1;
    console.log(`🛡️ Using tier protection for client ${client._id}: ${protectionQty} → ${newQty} (maintaining ${currentTier} tier)`);
    
    return { protectionUsed: true, maintainTier: true, newQty };
  }
  
  // No protection available - tier will be downgraded
  console.log(`⬇️ Client ${client._id} dropping below ${currentTier} minimum with no protection available`);
  return { protectionUsed: false, maintainTier: false, newQty: 0 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASHBACK SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Award cashback credit when client requalifies for a higher tier
 * @param {string} clientId - Client ID
 * @param {string} oldTier - Previous tier
 * @param {string} newTier - New (higher) tier
 * @param {object} client - Current client document
 */
async function awardCashback(clientId, oldTier, newTier, client) {
  // Only award cashback if:
  // 1. Client has been billed for at least 5 units
  // 2. They're moving UP to a higher tier
  // 3. They haven't already received cashback for this tier transition
  
  if (!client.hasMetMinimumBillingRequirement) {
    console.log(`⏭️ Client ${clientId} hasn't met minimum billing requirement (5 units) - no cashback awarded`);
    return;
  }
  
  // Check if this is an upward tier movement
  const tierOrder = { standard: 0, pro: 1, elite: 2 };
  const isUpgrade = tierOrder[newTier] > tierOrder[oldTier];
  
  if (!isUpgrade) {
    console.log(`⏭️ Client ${clientId} tier change ${oldTier} → ${newTier} is not an upgrade - no cashback`);
    return;
  }
  
  // Check if cashback already awarded for this transition
  const cashbackHistory = client.cashbackHistory || [];
  const alreadyAwarded = cashbackHistory.some(
    entry => entry.fromTier === oldTier && entry.toTier === newTier
  );
  
  if (alreadyAwarded) {
    console.log(`⏭️ Client ${clientId} already received cashback for ${oldTier} → ${newTier} transition`);
    return;
  }
  
  // Award cashback
  const cashbackAmount = LOYALTY_TIER_CONFIG.CASHBACK_AMOUNT;
  const newCashbackBalance = (client.cashbackCredits || 0) + cashbackAmount;
  
  await Client.findByIdAndUpdate(clientId, {
    cashbackCredits: newCashbackBalance,
    $push: {
      cashbackHistory: {
        fromTier: oldTier,
        toTier: newTier,
        awardedDate: new Date(),
        amount: cashbackAmount
      }
    }
  });
  
  console.log(`💰 Awarded $${cashbackAmount} cashback to client ${clientId} for ${oldTier} → ${newTier} requalification`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONTHLY EVALUATION (Main Logic)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Evaluate a client's tier at the end of the month
 * This is the main function called by the monthly cron job
 * ONLY evaluates if all previous month's estimates have been finalized (have Qty)
 * @param {string} clientId - Client ID to evaluate
 */
async function evaluateMonthlyTier(clientId) {
  try {
    const client = await Client.findById(clientId);
    if (!client) {
      console.error(`❌ Client ${clientId} not found`);
      return;
    }
    
    console.log(`\n📊 Evaluating monthly tier for client: ${client.name} (${clientId})`);
    
    // ✅ CHECK: Verify all previous month estimates have Qty before evaluating
    const { projectsCollection } = require('../db');
    const projectsCol = await projectsCollection();
    
    // Get previous month date range
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${String(previousMonth.getFullYear()).slice(-2)}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
    
    // Find all previous month projects for this client
    const projectNumberRegex = new RegExp(`^${prevMonthStr}`, 'i');
    const previousMonthProjects = await projectsCol.find({
      linkedClients: clientId,
      projectNumber: projectNumberRegex
    }).toArray();
    
    console.log(`   Found ${previousMonthProjects.length} projects from previous month (${prevMonthStr})`);
    
    // Check if any projects are missing Qty
    const projectsWithoutQty = previousMonthProjects.filter(p => !p.Qty || p.Qty === 0);
    
    if (projectsWithoutQty.length > 0) {
      console.log(`   ⚠️ EVALUATION SKIPPED: ${projectsWithoutQty.length} projects still missing Qty:`);
      projectsWithoutQty.forEach(p => {
        console.log(`      - ${p.projectNumber} (${p.name || 'Unnamed'}): Qty = ${p.Qty || 'NOT SET'}`);
      });
      console.log(`   ⏸️ Client ${client.name} will be evaluated once all estimates are finalized`);
      return { skipped: true, reason: 'Projects missing Qty', pendingProjects: projectsWithoutQty.length };
    }
    
    console.log(`   ✅ All ${previousMonthProjects.length} projects have Qty - proceeding with evaluation`);
    
    // Get current month's units
    const unitsSubmitted = client.currentMonthEstimateUnits || 0;
    const currentTier = client.loyaltyTier || 'casual';
    const tierConfig = getTierConfig(currentTier);
    
    console.log(`   Current tier: ${currentTier}`);
    console.log(`   Units submitted this month: ${unitsSubmitted}`);
    console.log(`   Tier minimum: ${tierConfig.minUnits}`);
    
    // Calculate what tier they should be in based on units
    const calculatedTier = calculateTier(unitsSubmitted);
    const pricePerUnit = getPricePerUnit(calculatedTier);
    
    // Calculate protection points earned
    const pointsEarned = calculateProtectionPoints(unitsSubmitted, currentTier);
    console.log(`   Protection points earned: +${pointsEarned}`);
    
    // Check if protection is needed (only if staying in current tier or eligible for protection)
    const { protectionUsed, maintainTier, newQty } = applyTierProtection(client, unitsSubmitted);
    
    let finalTier = calculatedTier;
    
    // If protection was used, maintain current tier instead of downgrading
    if (protectionUsed) {
      finalTier = currentTier;
      await Client.findByIdAndUpdate(clientId, {
        tierProtectionQty: newQty
      });
    }
    
    // Process protection points and award if threshold met
    const { protectionAwarded, newQty: awardedQty, newPoints } = processProtectionAward(client, pointsEarned);
    
    if (protectionAwarded) {
      await awardProtectionMonth(clientId, finalTier, awardedQty, newPoints);
    } else if (pointsEarned > 0) {
      // Update points even if no protection awarded
      const updatedPoints = (client.tierProtectionPoints || 0) + pointsEarned;
      await Client.findByIdAndUpdate(clientId, {
        tierProtectionPoints: updatedPoints
      });
      console.log(`   Points updated: ${updatedPoints} (need ${tierConfig.protectionPointsRequired || 'N/A'} for protection)`);
    }
    
    // Handle tier changes
    const tierChanged = finalTier !== currentTier;
    
    if (tierChanged) {
      console.log(`   🔄 Tier change: ${currentTier} → ${finalTier}`);
      
      // Update tier
      await Client.findByIdAndUpdate(clientId, {
        previousTier: currentTier,
        loyaltyTier: finalTier,
        tierEffectiveDate: new Date()
      });
      
      // Handle promotion conversions
      if (currentTier === 'pro' && finalTier === 'elite') {
        await convertProtectionOnPromotion(clientId, client);
      }
      
      // Check for cashback eligibility
      await awardCashback(clientId, currentTier, finalTier, client);
    } else {
      console.log(`   ✅ Tier maintained: ${currentTier}`);
    }
    
    // Archive this month's data to history
    const archiveDate = new Date();
    const monthString = `${archiveDate.getFullYear()}-${String(archiveDate.getMonth() + 1).padStart(2, '0')}`;
    
    await Client.findByIdAndUpdate(clientId, {
      $push: {
        monthlyUsageHistory: {
          month: monthString,
          year: archiveDate.getFullYear(),
          monthNumber: archiveDate.getMonth() + 1,
          estimateUnits: unitsSubmitted,
          tier: finalTier,
          pricePerUnit,
          totalBilled: unitsSubmitted * pricePerUnit,
          protectionEarned: protectionAwarded,
          protectionUsed
        },
        protectionPointsHistory: {
          month: monthString,
          tier: currentTier,
          unitsSubmitted,
          tierMinimum: tierConfig.minUnits,
          pointsEarned,
          pointsBalance: newPoints || client.tierProtectionPoints || 0,
          protectionAwarded,
          protectionUsed
        }
      }
    });
    
    // Update total billed units if units were invoiced
    if (unitsSubmitted > 0) {
      const newTotalBilled = (client.totalUnitsBilledAllTime || 0) + unitsSubmitted;
      const meetsMinimum = newTotalBilled >= LOYALTY_TIER_CONFIG.MINIMUM_UNITS_FOR_CASHBACK;
      
      await Client.findByIdAndUpdate(clientId, {
        totalUnitsBilledAllTime: newTotalBilled,
        hasMetMinimumBillingRequirement: meetsMinimum
      });
      
      if (meetsMinimum && !client.hasMetMinimumBillingRequirement) {
        console.log(`   ✅ Client has now met minimum billing requirement (${newTotalBilled} units)`);
      }
    }
    
    console.log(`✅ Monthly evaluation complete for ${client.name}`);
    
  } catch (error) {
    console.error(`❌ Error evaluating monthly tier for client ${clientId}:`, error);
    throw error;
  }
}

/**
 * Reset monthly counters for all clients (run on 1st of each month)
 */
async function resetMonthlyCounters() {
  try {
    console.log('\n🔄 Resetting monthly counters for all clients...');
    
    const result = await Client.updateMany(
      { loyaltySystemEnrolledDate: { $ne: null } }, // Only enrolled clients
      {
        currentMonthEstimateUnits: 0,
        monthlyCounterResetDate: new Date()
      }
    );
    
    console.log(`✅ Reset counters for ${result.modifiedCount} clients`);
    
  } catch (error) {
    console.error('❌ Error resetting monthly counters:', error);
    throw error;
  }
}

/**
 * Run monthly evaluation for all enrolled clients (cron job)
 * Should be run on the 1st of each month to evaluate previous month's activity
 * Only evaluates clients whose previous month's estimates all have Qty finalized
 */
async function runMonthlyEvaluationForAllClients() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🗓️  MONTHLY LOYALTY TIER EVALUATION - START');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Find all clients enrolled in loyalty system
    const clients = await Client.find({ 
      loyaltySystemEnrolledDate: { $ne: null } 
    });
    
    console.log(`Found ${clients.length} enrolled clients to evaluate\n`);
    
    let evaluated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Evaluate each client sequentially
    for (const client of clients) {
      try {
        const result = await evaluateMonthlyTier(client._id);
        
        if (result?.skipped) {
          skipped++;
          console.log(`   ⏸️ Skipped: ${client.name} - ${result.reason} (${result.pendingProjects} pending)`);
        } else {
          evaluated++;
          console.log(`   ✅ Evaluated: ${client.name}`);
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Error evaluating ${client.name}:`, error.message);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ MONTHLY LOYALTY TIER EVALUATION - COMPLETE');
    console.log(`   Total clients: ${clients.length}`);
    console.log(`   Evaluated: ${evaluated}`);
    console.log(`   Skipped (pending Qty): ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error running monthly evaluation:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Add estimate units to a client's current month counter
 * @param {string} clientId - Client ID
 * @param {number} units - Number of units to add (default 1)
 */
async function addEstimateUnits(clientId, units = 1) {
  try {
    const client = await Client.findById(clientId);
    if (!client) {
      console.error(`❌ Client ${clientId} not found`);
      return;
    }
    
    // Only track units for enrolled clients
    if (!client.loyaltySystemEnrolledDate) {
      console.log(`⏭️ Client ${clientId} not enrolled in loyalty system - skipping unit tracking`);
      return;
    }
    
    const currentUnits = client.currentMonthEstimateUnits || 0;
    const newUnits = currentUnits + units;
    
    await Client.findByIdAndUpdate(clientId, {
      currentMonthEstimateUnits: newUnits
    });
    
    console.log(`📊 Added ${units} unit(s) to client ${clientId}: ${currentUnits} → ${newUnits}`);
    
  } catch (error) {
    console.error(`❌ Error adding estimate units for client ${clientId}:`, error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLLOUT (February 2, 2026)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize loyalty system rollout - set all clients to Elite tier
 * Run this once on February 2, 2026
 */
async function initializeLoyaltyRollout() {
  try {
    console.log('\n🚀 LOYALTY TIER SYSTEM ROLLOUT - INITIALIZING...\n');
    
    const rolloutDate = LOYALTY_TIER_CONFIG.ROLLOUT_DATE;
    const rolloutTier = LOYALTY_TIER_CONFIG.ROLLOUT_TIER;
    
    // Update all clients
    const result = await Client.updateMany(
      { loyaltySystemEnrolledDate: null }, // Only clients not yet enrolled
      {
        loyaltyTier: rolloutTier,
        tierEffectiveDate: rolloutDate,
        loyaltySystemEnrolledDate: rolloutDate,
        isLoyaltyEliteRollout: true,
        tierProtectionType: 'elite', // Start with Elite protection type
        monthlyCounterResetDate: rolloutDate
      }
    );
    
    console.log(`✅ Enrolled ${result.modifiedCount} clients in loyalty system`);
    console.log(`   All clients set to: ${rolloutTier} tier`);
    console.log(`   Enrollment date: ${rolloutDate.toISOString()}`);
    console.log('\n🎉 LOYALTY TIER SYSTEM ROLLOUT - COMPLETE\n');
    
  } catch (error) {
    console.error('❌ Error initializing loyalty rollout:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Configuration
  LOYALTY_TIER_CONFIG,
  
  // Tier calculation
  calculateTier,
  getTierConfig,
  getPricePerUnit,
  
  // Protection points
  calculateProtectionPoints,
  processProtectionAward,
  awardProtectionMonth,
  
  // Tier management
  convertProtectionOnPromotion,
  applyTierProtection,
  
  // Cashback
  awardCashback,
  
  // Monthly evaluation (MAIN FUNCTIONS)
  evaluateMonthlyTier,
  runMonthlyEvaluationForAllClients,
  resetMonthlyCounters,
  
  // Unit tracking
  addEstimateUnits,
  
  // Rollout
  initializeLoyaltyRollout
};
