import { planTypes } from '@/shared/planPricing'; // enriched with tiers, FX, COL, etc.

/**
 * Calculates Est Cost (AUD) based on PlanType and EstInv flag.
 * Pulls from planPricing enriched tier structure.
 */
export function calculateAUD(row, allPlans = planTypes) {
  const { PlanType = '', EstInv = 0 } = row;
  if (!PlanType) return '';

  const match = allPlans.find(plan => plan.label === PlanType);
  if (!match) return '';

  const tier = match.tiers.find(t => t.name === "Bronze") || match.tiers[0];
  return tier?.AUD ?? '';
}

/**
 * Converts Est Cost (AUD) into NOK using enriched pricing
 */
export function calculateNOK(row, allPlans = planTypes, exchangeRate = 7) {
  const { PlanType = '', EstInv = 0 } = row;
  if (!PlanType) return '';

  const match = allPlans.find(plan => plan.label === PlanType);
  if (!match) return '';

  const tier = match.tiers.find(t => t.name === "Bronze") || match.tiers[0];
  const audPrice = tier?.AUD ?? '';
  if (!audPrice || isNaN(audPrice)) return '';

  return Math.round(audPrice * exchangeRate);
}


/**
 * Calculates Estimator Pay:
 * If Qty > 0 and Estimator filled, returns Qty × FIXED_RATE (default 120)
 */
export function calculatePay(row, FIXED_RATE = 120) {
  const { Qty = 0, Est = '' } = row;
  if (Qty > 0 && Est.trim().length > 1) {
    return Qty * FIXED_RATE;
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
