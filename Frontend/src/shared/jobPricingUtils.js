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
  
  // For Basic: Use half of Qty
  if (PlanType === "Basic") {
    return qty / 2;
  }
  
  // For all other plan types: use Qty as normal
  return qty;
}


/**
 * Calculates Est Cost (AUD) based on PlanType and client's pricing tier.
 * 📸 HISTORICAL PRICING: If project has pricingSnapshot, uses those locked-in prices.
 * Otherwise calculates live prices using current loyalty tier structure:
 * - Elite: 30% off (0.7), Pro: 20% off (0.8), Casual: full price (1.0)
 * 
 * @param {Object} row - Project row data (may include pricingSnapshot)
 * @param {Array} allPlans - Plan types from planPricing (optional - will be generated from client if provided)
 * @param {Object} client - Optional client object with pricingTier and useNewPricing fields
 * @param {Object} project - Optional full project object with pricingSnapshot
 */
export function calculateAUD(row, allPlans = null, client = null, project = null) {
  const { PlanType = '', EstInv = 0 } = row;
  if (!PlanType) return '';

  // 📸 CHECK FOR PRICING SNAPSHOT - Use exact unit price if available
  const snapshot = project?.pricingSnapshot || row?.pricingSnapshot;
  if (snapshot && snapshot.capturedAt && snapshot.priceEach !== null) {
    // Use exact priceEach from snapshot (already has tier discount applied)
    const historicalPrice = parseFloat(snapshot.priceEach) || 0;
    return historicalPrice;
  }

  // Calculate live pricing
  const plans = allPlans || (client ? getPlanTypesForClient(client) : planTypes);
  
  const match = plans.find(plan => plan.label === PlanType);
  if (!match) return '';

  // Determine tier: Use client's loyaltyTier if available, otherwise default to Casual
  const tierName = client?.loyaltyTier || client?.pricingTier || "Casual";
  const tier = match.tiers.find(t => t.name === tierName) || match.tiers[match.tiers.length - 1]; // Fallback to last tier (Casual)
  return tier?.AUD ?? '';
}

/**
 * Converts Est Cost (AUD) into NOK using enriched pricing and client's pricing tier
 * 📸 HISTORICAL PRICING: If project has pricingSnapshot, uses those locked-in prices and exchange rate.
 * Otherwise calculates live prices using current loyalty tier structure:
 * - Elite: 30% off (0.7), Pro: 20% off (0.8), Casual: full price (1.0)
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

  // 📸 CHECK FOR PRICING SNAPSHOT - Use exact unit price for NOK if available
  const snapshot = project?.pricingSnapshot || row?.pricingSnapshot;
  if (snapshot && snapshot.capturedAt && snapshot.priceEach !== null) {
    // Use exact priceEach from snapshot (already has tier discount applied)
    const historicalAUD = parseFloat(snapshot.priceEach) || 0;
    const historicalExchangeRate = snapshot.exchangeRate || exchangeRate;
    const historicalNOK = Math.round(historicalAUD * historicalExchangeRate);
    
    return historicalNOK;
  }

  // Calculate live pricing
  const plans = allPlans || (client ? getPlanTypesForClient(client) : planTypes);

  const match = plans.find(plan => plan.label === PlanType);
  if (!match) return '';

  // Determine tier: Use client's loyaltyTier if available, otherwise default to Casual
  const tierName = client?.loyaltyTier || client?.pricingTier || "Casual";
  const tier = match.tiers.find(t => t.name === tierName) || match.tiers[match.tiers.length - 1]; // Fallback to last tier (Casual)
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
