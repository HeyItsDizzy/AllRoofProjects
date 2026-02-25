import { basePlanTypes } from './planTypes.js';


const FX = { USD: 0.67, EUR: 0.60, NOK: 6.7 };
const COL = { AUD: 100, USD: 104, EUR: 90, NOK: 120 };
const ROUND_RULES = { AUD: 5, USD: 5, EUR: 5, NOK: 50 };

// LOYALTY TIER PRICING STRUCTURE
const TIERS = [
  { name: "Elite",  min: 11, multiplier: 0.7 },  // 30% discount ($70/est)
  { name: "Pro",    min: 6,  multiplier: 0.8 },  // 20% discount ($80/est)
  { name: "Casual", min: 0,  multiplier: 1.0 }   // Full price ($100/est)
];

// Plan types eligible for tier discounts (Hourly and Standard roofs only)
const DISCOUNT_ELIGIBLE_PLANS = [
  "Basic",
  "Standard", 
  "Std Highset",
  "Detailed",
  "Dtd Highset",
  "Complex",
  "Commercial",
  "Townhouses",
  "Hourly",
  "Wall Cladding"
];

// Plans that should NEVER receive discounts (always full price)
const NO_DISCOUNT_PLANS = [
  "Manual Price",
  "Nearmap Rebate"
];

// Default to current tier structure
const planTypes = basePlanTypes.map(plan => {
  // Plans that never get discounts (Manual Price, Nearmap Rebate)
  if (NO_DISCOUNT_PLANS.includes(plan.label)) {
    return {
      ...plan,
      tiers: [{ name: "Flat", min: 0, price: plan.AUD }]
    };
  }

  // Plans eligible for tier discounts (Hourly and Standard roofs)
  if (DISCOUNT_ELIGIBLE_PLANS.includes(plan.label)) {
    return {
      ...plan,
      tiers: TIERS.map(tier => ({
        name: tier.name,
        min: tier.min,
        price: plan.AUD * tier.multiplier
      }))
    };
  }

  // Additional services (reports, OCL layouts, etc.) - Full price only
  return {
    ...plan,
    tiers: [
      { name: "Elite", min: 11, price: plan.AUD },
      { name: "Pro", min: 6, price: plan.AUD },
      { name: "Casual", min: 0, price: plan.AUD }
    ]
  };
});

function roundUpTo(value, step) {
  return Math.ceil(value / step) * step;
}

function convertPrice(aud, currency) {
  const colFactor = COL[currency] / COL.AUD;
  const local = aud * colFactor * FX[currency];
  return roundUpTo(local, ROUND_RULES[currency] || 5);
}

function enrichPlan(plan) {
  // Manual Price and Nearmap Rebate should not be rounded
  const shouldRound = !["Manual Price", "Nearmap Rebate"].includes(plan.label);
  
  return {
    ...plan,
    tiers: plan.tiers.map(tier => ({
      ...tier,
      AUD: shouldRound ? roundUpTo(tier.price, ROUND_RULES.AUD) : tier.price,
      USD: tier.price === -5 ? null : convertPrice(tier.price, "USD"),
      EUR: tier.price === -5 ? null : convertPrice(tier.price, "EUR"),
      NOK: tier.price === -5 ? null : convertPrice(tier.price, "NOK"),
    }))
  };
}

const enrichedPlanTypes = planTypes.map(enrichPlan);

function evaluateTier(projectCount, placeholdersUsed = 0, tiers = TIERS) {
  const total = projectCount + placeholdersUsed;
  return tiers.find(t => total >= t.min) || tiers[tiers.length - 1];
}

function nextMonthTier(actualJobs, placeholdersUsedLastMonth, tiers = TIERS) {
  const realJobCount = actualJobs - placeholdersUsedLastMonth;
  return evaluateTier(realJobCount, 0, tiers);
}

/**
 * Get plan types with pricing based on client's tier structure
 * @param {Object} client - Client object
 * @returns {Array} - Enriched plan types with tier pricing
 */
function getPlanTypesForClient(client) {
  // Rebuild planTypes with current tier structure
  const clientPlanTypes = basePlanTypes.map(plan => {
    // Plans that never get discounts (Manual Price, Nearmap Rebate)
    if (NO_DISCOUNT_PLANS.includes(plan.label)) {
      return {
        ...plan,
        tiers: [{ name: "Flat", min: 0, price: plan.AUD }]
      };
    }

    // Plans eligible for tier discounts (Hourly and Standard roofs)
    if (DISCOUNT_ELIGIBLE_PLANS.includes(plan.label)) {
      return {
        ...plan,
        tiers: TIERS.map(tier => ({
          name: tier.name,
          min: tier.min,
          price: plan.AUD * tier.multiplier
        }))
      };
    }

    // Additional services (reports, OCL layouts, etc.) - Full price only
    return {
      ...plan,
      tiers: [
        { name: "Elite", min: 11, price: plan.AUD },
        { name: "Pro", min: 6, price: plan.AUD },
        { name: "Casual", min: 0, price: plan.AUD }
      ]
    };
  });

  return clientPlanTypes.map(enrichPlan);
}

export {
  enrichedPlanTypes as planTypes,
  evaluateTier,
  nextMonthTier,
  FX,
  COL,
  TIERS,
  DISCOUNT_ELIGIBLE_PLANS,
  NO_DISCOUNT_PLANS,
  getPlanTypesForClient,
};
