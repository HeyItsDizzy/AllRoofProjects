import { planTypes, getPlanTypesForClient } from '@/shared/planPricing'; // enriched with tiers, FX, COL, etc.
import axios from 'axios';

/**
 * Calculates the safe EstQty value to prevent accidental high estimator pay.
 * For Manual Price: returns the lower of Qty or calculated PriceEach to avoid errors
 * For other plan types: returns the Qty value as normal
 * 📸 Respects historical pricing from pricingSnapshot if available
 */
export function calculateSafeEstQty(row, qty, client = null, project = null) {
  const { PlanType = '' } = row;
  
  // For Manual Price: Use the lower value to prevent high EstQty values
  if (PlanType === "Manual Price") {
    // Calculate the actual price using the same logic as the PriceEach column
    const calculatedPrice = calculateAUD(row, null, client, project);
    const priceEach = parseFloat(calculatedPrice) || 0;
    return Math.min(qty, priceEach);
  }
  
  // For all other plan types: use Qty as normal
  return qty;
}


/**
 * Calculates Est Cost (AUD) based on PlanType and client's pricing tier.
 * 📸 HISTORICAL PRICING: If project has pricingSnapshot, uses those locked-in prices.
 * Otherwise calculates live prices using:
 * - Legacy pricing (useNewPricing=false): Elite 40% off (0.6), Pro 20% off (0.8), Standard full price (1.0)
 * - New pricing (useNewPricing=true): Elite 30% off (0.7), Pro 20% off (0.8), Standard full price (1.0)
 * Falls back to Elite tier with legacy pricing if no client specified.
 * 
 * @param {Object} row - Project row data (may include pricingSnapshot)
 * @param {Array} allPlans - Plan types from planPricing (optional - will be generated from client if provided)
 * @param {Object} client - Optional client object with pricingTier and useNewPricing fields
 * @param {Object} project - Optional full project object with pricingSnapshot
 */
export function calculateAUD(row, allPlans = null, client = null, project = null) {
  const { PlanType = '', EstInv = 0 } = row;
  if (!PlanType) return '';

  // 📸 CHECK FOR PRICING SNAPSHOT - Use historical pricing if available
  const snapshot = project?.pricingSnapshot || row?.pricingSnapshot;
  if (snapshot && snapshot.capturedAt && snapshot.priceMultiplier !== null) {
    // Find base price for this plan type
    const basePlan = planTypes.find(plan => plan.label === PlanType);
    if (!basePlan) return '';
    
    // Get base AUD price (before tier discount)
    const basePrice = basePlan.tiers[0]?.price || basePlan.AUD || 0;
    
    // Apply historical multiplier
    const historicalPrice = basePrice * snapshot.priceMultiplier;
    console.log(`📸 Using historical pricing for ${PlanType}: ${basePrice} × ${snapshot.priceMultiplier} = ${historicalPrice}`);
    return historicalPrice;
  }

  // Calculate live pricing
  const plans = allPlans || (client ? getPlanTypesForClient(client) : planTypes);
  
  const match = plans.find(plan => plan.label === PlanType);
  if (!match) return '';

  // Determine tier: Use client's pricingTier if available, otherwise default to Elite
  const tierName = client?.pricingTier || "Elite"; // Elite (formerly Gold), Pro (formerly Silver), Standard (formerly Bronze)
  const tier = match.tiers.find(t => t.name === tierName) || match.tiers[0];
  return tier?.AUD ?? '';
}

/**
 * Converts Est Cost (AUD) into NOK using enriched pricing and client's pricing tier
 * 📸 HISTORICAL PRICING: If project has pricingSnapshot, uses those locked-in prices and exchange rate.
 * Otherwise calculates live prices using:
 * - Legacy pricing (useNewPricing=false): Elite 40% off (0.6), Pro 20% off (0.8), Standard full price (1.0)
 * - New pricing (useNewPricing=true): Elite 30% off (0.7), Pro 20% off (0.8), Standard full price (1.0)
 * 
 * @param {Object} row - Project row data (may include pricingSnapshot)
 * @param {Array} allPlans - Plan types from planPricing (optional - will be generated from client if provided)
 * @param {number} exchangeRate - AUD to NOK exchange rate (used if no snapshot)
 * @param {Object} client - Optional client object with pricingTier and useNewPricing fields
 * @param {Object} project - Optional full project object with pricingSnapshot
 */
export function calculateNOK(row, allPlans = null, exchangeRate = 7, client = null, project = null) {
  const { PlanType = '', EstInv = 0 } = row;
  if (!PlanType) return '';

  // 📸 CHECK FOR PRICING SNAPSHOT - Use historical pricing if available
  const snapshot = project?.pricingSnapshot || row?.pricingSnapshot;
  if (snapshot && snapshot.capturedAt && snapshot.priceMultiplier !== null) {
    // Find base price for this plan type
    const basePlan = planTypes.find(plan => plan.label === PlanType);
    if (!basePlan) return '';
    
    // Get base AUD price (before tier discount)
    const basePrice = basePlan.tiers[0]?.price || basePlan.AUD || 0;
    
    // Apply historical multiplier and exchange rate
    const historicalAUD = basePrice * snapshot.priceMultiplier;
    const historicalExchangeRate = snapshot.exchangeRate || exchangeRate;
    const historicalNOK = Math.round(historicalAUD * historicalExchangeRate);
    
    console.log(`📸 Using historical NOK pricing for ${PlanType}: ${historicalAUD} AUD × ${historicalExchangeRate} = ${historicalNOK} NOK`);
    return historicalNOK;
  }

  // Calculate live pricing
  const plans = allPlans || (client ? getPlanTypesForClient(client) : planTypes);

  const match = plans.find(plan => plan.label === PlanType);
  if (!match) return '';

  // Determine tier: Use client's pricingTier if available, otherwise default to Elite
  const tierName = client?.pricingTier || "Elite";
  const tier = match.tiers.find(t => t.name === tierName) || match.tiers[0];
  const audPrice = tier?.AUD ?? '';
  if (!audPrice || isNaN(audPrice)) return '';

  return Math.round(audPrice * exchangeRate);
}


/**
 * Calculates Estimator Pay:
 * If EstQty > 0 and Estimator filled, returns EstQty × FIXED_RATE (always $30 AUD)
 */
export function calculatePay(row, FIXED_RATE = 30) {
  const { EstQty = 0, linkedEstimators = [] } = row;
  if (EstQty > 0 && linkedEstimators.length > 0) {
    return EstQty * FIXED_RATE;
  }
  return 0;
}


/**
 * Fetches current AUD exchange rates from Frankfurter API
 * Returns object with NOK, USD, EUR rates
 * Fallback to default rates if API fails
 */
export async function getExchangeRate() {
  try {
    const res = await axios.get('https://api.frankfurter.app/latest?from=AUD&to=NOK,USD,EUR');
    return {
      NOK: res.data?.rates?.NOK || 6.5,
      USD: res.data?.rates?.USD || 0.65,
      EUR: res.data?.rates?.EUR || 0.60
    };
  } catch (err) {
    console.error("Exchange rate fetch failed:", err);
    return {
      NOK: 6.5,
      USD: 0.65,
      EUR: 0.60
    };
  }
}
