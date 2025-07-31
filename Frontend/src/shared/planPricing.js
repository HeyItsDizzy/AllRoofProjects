import { basePlanTypes } from './planTypes.js';


const FX = { USD: 0.67, EUR: 0.60, NOK: 6.7 };
const COL = { AUD: 100, USD: 104, EUR: 90, NOK: 120 };
const ROUND_RULES = { AUD: 5, USD: 5, EUR: 5, NOK: 50 };

const TIERS = [
  { name: "Gold",   min: 10, multiplier: 0.6 },
  { name: "Silver", min: 5,  multiplier: 0.8 },
  { name: "Bronze", min: 0,  multiplier: 1.0 }
];

const planTypes = basePlanTypes.map(plan => {
  if (["Manual Price", "Nearmap Rebate"].includes(plan.label)) {
    return {
      ...plan,
      tiers: [{ name: "Flat", min: 0, price: plan.AUD }]
    };
  }

  return {
    ...plan,
    tiers: TIERS.map(tier => ({
      name: tier.name,
      min: tier.min,
      price: plan.AUD * tier.multiplier
    }))
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
  return {
    ...plan,
    tiers: plan.tiers.map(tier => ({
      ...tier,
      AUD: roundUpTo(tier.price, ROUND_RULES.AUD),
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

export {
  enrichedPlanTypes as planTypes,
  evaluateTier,
  nextMonthTier,
  FX,
  COL,
  TIERS,
};
