// formulaLogic.js

/**
 * Calculates Est Cost (AUD) based on PlanType and EstInv flag.
 * Mimics Excel: IFS(ISBLANK([PlanType]),"", [EstInv]=0, VLOOKUP(col 2), else VLOOKUP(col 3))
 */
export function calculateEstCost(row, config) {
  const { PlanType, EstInv = 0 } = row;
  if (!PlanType) return '';

  const match = config.find(entry => entry.PlanType?.toLowerCase() === PlanType.toLowerCase());
  if (!match) return '';

  if (EstInv === 0) return match.Price;
  return match.PriceIncrease || match.Price; // fallback
}

/**
 * Converts Est Cost (AUD) into NOK using locked or live exchangeRate
 */
export function calculateNOK(row, config, exchangeRate = 7) {
  const estCost = calculateEstCost(row, config);
  if (!estCost || isNaN(estCost)) return '';
  return Math.round(estCost * exchangeRate);
}

/**
 * Calculates Estimator Pay:
 * If Qty > 0 and Estimator is filled, returns Qty × FIXED_RATE (default 120)
 */
export function calculatePay(row, FIXED_RATE = 120) {
  const { Qty = 0, Est = '' } = row;
  if (Qty > 0 && Est.trim().length > 1) {
    return Qty * FIXED_RATE;
  }
  return 0;
}
