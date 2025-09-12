import { planTypes } from '@/shared/planPricing'; // enriched with tiers, FX, COL, etc.

/**
 * Calculates Est Cost (AUD) based on PlanType and EstInv flag.
 * Pulls from planPricing enriched tier structure.
 * Currently using Gold tier for all clients.
 */
export function calculateAUD(row, allPlans = planTypes) {
  const { PlanType = '', EstInv = 0 } = row;
  if (!PlanType) return '';

  const match = allPlans.find(plan => plan.label === PlanType);
  if (!match) return '';

  const tier = match.tiers.find(t => t.name === "Gold") || match.tiers[0];
  return tier?.AUD ?? '';
}

/**
 * Converts Est Cost (AUD) into NOK using enriched pricing
 * Currently using Gold tier for all clients.
 */
export function calculateNOK(row, allPlans = planTypes, exchangeRate = 7) {
  const { PlanType = '', EstInv = 0 } = row;
  if (!PlanType) return '';

  const match = allPlans.find(plan => plan.label === PlanType);
  if (!match) return '';

  const tier = match.tiers.find(t => t.name === "Gold") || match.tiers[0];
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
 * Fetches current AUD→NOK rate from Frankfurter API
 * Used for realtime conversions (fallback to 7)
 */
export async function getExchangeRate() {
  try {
    const res = await axios.get('https://api.frankfurter.app/latest?from=AUD&to=NOK');
    return res.data?.rates?.NOK || 7;
  } catch (err) {
    console.error("Exchange rate fetch failed:", err);
    return 7;
  }
}
