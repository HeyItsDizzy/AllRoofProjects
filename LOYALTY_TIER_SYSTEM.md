# Loyalty Tier System Implementation Plan

## Overview
The Loyalty Tier System rewards clients based on the number of estimate units submitted each calendar month. Tiers provide per-unit discounts off the $100 base rate. The system automatically adjusts tiers monthly and includes loyalty protection and cashback mechanisms.

---

## Estimate Unit Definition
- **1 Estimate Unit = 1 Standard Estimate OR 1 Hour of Estimating Time**

---

## Tier Levels (CORRECTED)

| Tier       | Monthly Units Required | Price per Unit | Discount |
|------------|------------------------|----------------|----------|
| Standard   | 0–5 units              | $100           | 0%       |
| Pro Tier   | 6–10 units             | $80            | 20%      |
| Elite Tier | 11+ units              | $70            | 30%      |

**Important:** Clients must be billed for at least 5 units before qualifying for Pro tier and receiving any cashback benefits and Clients must be billed for at least 10 units before qualifying for Elite tier and receiving any cashback benefits.

---

## Initial Rollout (February 2, 2026)
- All clients are temporarily set to **Elite Tier** on rollout.
- Discounts apply immediately for that month.
- Tiers auto-adjust beginning the following month based on monthly volume.

---

## Tier Evaluation Logic
- Tiers are evaluated monthly based on the total estimate units submitted within the calendar month.
- Tier changes (up or down) apply to the following calendar month's pricing.
- Minimum 5 units billed required before tier promotion benefits activate.

---

## Tier Protection: Loyalty Buffer (Point-Based System)

### Protection Earning Logic
- Clients earn **Loyalty Protection Points** by consistently exceeding their tier minimum requirements
- Protection is earned by accumulating points from monthly overachievement
- Points threshold varies by tier:
  - **Pro Tier**: Accumulate **+5 points** to earn 1 month of Pro protection
  - **Elite Tier**: Accumulate **+10 points** to earn 1 month of Elite protection
- Protection is **capped at 3 months** maximum per tier

### How Points Accumulate
Each month, calculate: `Points Earned = (Units Submitted) - (Tier Minimum Requirement)`

**Examples:**

**Pro Tier Client (minimum 6 units):**
- Month 1: 8 units → +2 points (over minimum)
- Month 2: 6 units → +0 points (at minimum)
- Month 3: 9 units → +3 points (over minimum)
- **Total: +5 points = 1 month Pro protection earned** (reset to 0 points, continue accumulating)

**Elite Tier Client (minimum 11 units):**
- Month 1: 17 units → +6 points
- Month 2: 15 units → +4 points
- **Total: +10 points = 1 month Elite protection earned** (reset to 0 points)

### Protection Conversion on Tier Promotion
- When promoted from Pro → Elite, existing Pro protections convert to points
- **Conversion rate**: 1 Pro protection = +5 Elite points
- Example:
  - Client has 1 Pro protection (1 month) + 4 Pro points
  - Gets promoted to Elite tier
  - New status: 0 Elite protections + 9 Elite points (5 from conversion + 4 carried over)
  - Next month with +1 or more points → earns first Elite protection

### Protection Usage
- Protection prevents tier downgrade during low-volume months
- Consumed automatically (1 month at a time) when client drops below tier minimum
- Points continue accumulating even while holding protection months
- Protection never expires (holds indefinitely until used)

---

## Tier Promotion Cashback
- If a client drops to a lower tier and **later requalifies** for a higher tier:
  - They receive a **$100 Cashback Credit**
  - This simulates backdating their recent invoices to the new tier rate.
  - Triggered only **once per requalification** (i.e. no multiple redemptions for the same tier return).
  - **Requirement:** Client must have been billed for at least 5 units before cashback is granted.

---

## Billing Rules
- Clients are billed weekly based on the tier they are in **that calendar month**.
- Discounts are not retroactive unless triggered by the **Cashback Rule**.
- Optionally show "Welcome Bonus" one-time discount when clients first hit a tier mid-month.

---

## Additional Features

### Estimate Tokens *(Optional Implementation)*
- Clients may "buy" or "earn" tokens to protect their tier during low-volume months.
- 1 token = 1 unit credited toward tier calculation.
- Used manually or automatically based on client preference.

---

## Summary of Benefits

| Feature                | Standard | Pro | Elite |
|------------------------|----------|-----|--------|
| Discount               | 0%       | 20% | 30%    |
| Loyalty Protection     | ❌       | ✅  | ✅     |
| Cashback on Requalify  | ❌       | ✅  | ✅     |
| Estimate Token Access  | ❌       | ✅  | ✅     |

---

# Database Schema Changes

## Client Collection - New Fields Required

```javascript
{
  // ═══════════════════════════════════════════════════════════
  // LOYALTY TIER SYSTEM FIELDS
  // ═══════════════════════════════════════════════════════════
  
  // Current Tier Status
  loyaltyTier: {
    type: String,
    enum: ['standard', 'pro', 'elite'],
    default: 'standard'
  },
  
  // Tier effective date (when current tier started)
  tierEffectiveDate: {
    type: Date,
    default: null
  },
  
  // Previous tier (for tracking downgrades/upgrades)
  previousTier: {
    type: String,
    enum: ['standard', 'pro', 'elite'],
    default: null
  },
  
  // ═══════════════════════════════════════════════════════════
  // LOYALTY PROTECTION (Point-Based System)
  // ═══════════════════════════════════════════════════════════
  
  // Type of protection currently held (matches tier when earned)
  tierProtectionType: {
    type: String,
    enum: ['none', 'pro', 'elite'],
    default: 'none'
  },
  
  // Number of protection months accumulated (0-3 max per tier)
  tierProtectionQty: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  
  // Current protection points accumulated toward next protection month
  // Pro: 5 points = 1 protection month
  // Elite: 10 points = 1 protection month
  tierProtectionPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Track protection point history for analytics
  protectionPointsHistory: [{
    month: String, // Format: "2026-02"
    tier: String,
    unitsSubmitted: Number,
    tierMinimum: Number,
    pointsEarned: Number, // units - minimum
    pointsBalance: Number, // running total
    protectionAwarded: Boolean, // Did they earn a protection month?
    protectionUsed: Boolean // Did they consume a protection month?
  }],
  
  // Cashback tracking
  cashbackCredits: {
    type: Number,
    default: 0, // Dollar amount of available cashback
    min: 0
  },
  
  // Track which tier transitions have already awarded cashback
  // Prevents duplicate cashback for same tier return
  cashbackHistory: [{
    fromTier: String,
    toTier: String,
    awardedDate: Date,
    amount: Number
  }],
  
  // Estimate Tokens (Optional Feature)
  estimateTokens: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Monthly usage tracking for current month
  currentMonthEstimateUnits: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Track when monthly counter was last reset
  monthlyCounterResetDate: {
    type: Date,
    default: null
  },
  
  // Historical monthly usage (for analytics)
  monthlyUsageHistory: [{
    month: String, // Format: "2026-02" (YYYY-MM)
    year: Number,
    monthNumber: Number, // 1-12
    estimateUnits: Number,
    tier: String,
    pricePerUnit: Number,
    totalBilled: Number,
    protectionEarned: Boolean, // Did they earn protection this month?
    protectionUsed: Boolean // Did they use protection this month?
  }],
  
  // Rollout tracking
  loyaltySystemEnrolledDate: {
    type: Date,
    default: null // Set to Feb 2, 2026 on rollout
  },
  
  isLoyaltyEliteRollout: {
    type: Boolean,
    default: false // True if they got Elite on initial rollout
  },
  
  // Minimum billing requirement tracking
  totalUnitsBilledAllTime: {
    type: Number,
    default: 0,
    min: 0
  },
  
  hasMetMinimumBillingRequirement: {
    type: Boolean,
    default: false // True once they've been billed for 5+ units
  }
}
```

---

# Implementation Plan

## Phase 1: Database Setup
1. ✅ Add new fields to Client schema
2. Create migration script to add fields to existing clients
3. Set default values for all existing clients

## Phase 2: Core Tier Logic
1. Create `loyaltyTierService.js` with:
   - `calculateTier(units)` - Determine tier based on unit count
   - `calculateProtectionPoints(units, currentTier)` - Calculate points earned this month
   - `awardProtectionMonth(clientId)` - Award protection when threshold reached
   - `convertProtectionOnPromotion(clientId, oldTier, newTier)` - Handle tier promotion conversions
   - `evaluateMonthlyTier(clientId)` - Run at month end
   - `applyTierProtection(clientId)` - Handle buffer usage logic
   - `awardCashback(clientId, newTier)` - Grant $100 credit
   - `resetMonthlyCounters()` - Cron job for month rollover

## Phase 3: Unit Tracking
1. Track estimate units when projects are created/completed
2. Increment `currentMonthEstimateUnits` on each estimate
3. Track time-based units (1 hour = 1 unit)
4. Update `totalUnitsBilledAllTime` when invoiced

## Phase 4: Monthly Evaluation (Cron Job)
1. Run on last day of month
2. For each client:
   - Calculate tier based on current month units
   - Check if tier protection applies
   - Award protection if 20+ units
   - Detect tier changes and award cashback if eligible
   - Archive month to history
   - Reset counter for new month

## Phase 5: UI Components
1. Client profile - display current tier and benefits
2. Admin dashboard - tier distribution analytics
3. Billing interface - show tier pricing
4. Cashback credit display and redemption

## Phase 6: Rollout (Feb 2, 2026)
1. Set all clients to Elite tier
2. Set `isLoyaltyEliteRollout = true`
3. Set `loyaltySystemEnrolledDate = Feb 2, 2026`
4. Begin monthly evaluation March 1, 2026

---

# Configuration Constants

```javascript
// loyaltyTierConfig.js
export const LOYALTY_TIER_CONFIG = {
  // Tier thresholds (units per month)
  TIERS: {
    STANDARD: {
      name: 'Standard',
      minUnits: 0,
      maxUnits: 5,
      pricePerUnit: 100,
      discount: 0
    },
    PRO: {
      name: 'Pro',
      minUnits: 6,
      maxUnits: 10,
      pricePerUnit: 80,
      discount: 20
    },
    ELITE: {
      name: 'Elite',
      minUnits: 11,
      maxUnits: Infinity,
      pricePerUnit: 70,
      discount: 30
    }
  },
  
  // Protection rules (Point-Based System)
  PROTECTION: {
    PRO: {
      pointsRequired: 5,  // Pro tier needs +5 points for 1 protection month
      tierMinimum: 6      // Pro tier minimum units per month
    },
    ELITE: {
      pointsRequired: 10, // Elite tier needs +10 points for 1 protection month
      tierMinimum: 11     // Elite tier minimum units per month
    }
  },
  MAX_PROTECTION_MONTHS: 3, // Maximum protection months that can be held
  
  // Protection conversion on tier promotion
  PRO_TO_ELITE_CONVERSION: 5, // 1 Pro protection = 5 Elite points
  
  // Cashback rules
  CASHBACK_AMOUNT: 100,
  MINIMUM_UNITS_FOR_CASHBACK: 5, // Must be billed for 5+ units before cashback
  
  // Rollout
  ROLLOUT_DATE: new Date('2026-02-02'),
  ROLLOUT_TIER: 'elite'
};
```

---

# Detailed Protection Point Calculation Examples

## Example 1: Pro Tier Client (Minimum 6 units, +5 points = 1 protection)

### Scenario: 3-Month Accumulation
| Month | Units Submitted | Tier Minimum | Points Earned | Running Total | Protection Awarded | Remaining Points |
|-------|----------------|--------------|---------------|---------------|-------------------|------------------|
| Jan   | 8 units        | 6            | +2            | 2             | No                | 2                |
| Feb   | 6 units        | 6            | +0            | 2             | No                | 2                |
| Mar   | 9 units        | 6            | +3            | 5             | **Yes (1 month)** | 0 (reset)        |

**Result:** Client has **1 month Pro protection** + **0 points** toward next protection

---

## Example 2: Elite Tier Client (Minimum 11 units, +10 points = 1 protection)

### Scenario: 2-Month Quick Accumulation
| Month | Units Submitted | Tier Minimum | Points Earned | Running Total | Protection Awarded | Remaining Points |
|-------|----------------|--------------|---------------|---------------|-------------------|------------------|
| Jan   | 17 units       | 11           | +6            | 6             | No                | 6                |
| Feb   | 15 units       | 11           | +4            | 10            | **Yes (1 month)** | 0 (reset)        |

**Result:** Client has **1 month Elite protection** + **0 points** toward next protection

---

## Example 3: Tier Promotion with Protection Conversion

### Scenario: Pro → Elite Promotion
**Starting State (Pro Tier):**
- tierProtectionType: `'pro'`
- tierProtectionQty: `1` (1 month Pro protection)
- tierProtectionPoints: `4` (4 points toward next Pro protection)

**Month Action:** Client submits 15 units → Qualifies for Elite tier

**Conversion Calculation:**
1. Convert Pro protections to Elite points: `1 protection × 5 = +5 Elite points`
2. Add remaining Pro points: `+5 + 4 = +9 Elite points`
3. No Elite protection earned yet (needs 10 points)

**New State (Elite Tier):**
- tierProtectionType: `'elite'`
- tierProtectionQty: `0` (no Elite protections yet)
- tierProtectionPoints: `9` (9 points toward first Elite protection)

**Next Month:** If client submits 12 units (11 minimum + 1 = +1 point):
- Points: `9 + 1 = 10` → **Earns 1 month Elite protection**
- Final state: `tierProtectionQty: 1`, `tierProtectionPoints: 0`

---

## Example 4: Protection Usage During Downgrade

### Scenario: Elite Client Has Slow Month
**Current State:**
- tierProtectionType: `'elite'`
- tierProtectionQty: `2` (2 months Elite protection)
- tierProtectionPoints: `3` (3 points accumulated)
- Current tier: Elite

**Month Action:** Client submits only 8 units (below Elite minimum of 11)

**Evaluation:**
1. Check if units meet Elite minimum: `8 < 11` → No
2. Check for protection: `tierProtectionQty = 2` → Yes, has protection
3. **Use 1 month of protection** to maintain Elite tier
4. Points continue accumulating normally

**New State:**
- tierProtectionType: `'elite'` (unchanged)
- tierProtectionQty: `1` (used 1 month, 1 remaining)
- tierProtectionPoints: `3` (points preserved, continue accumulating)
- Current tier: Elite (protected from downgrade)

---

## Example 5: Multiple Protections with High Volume

### Scenario: Consistent Overachievement
**Pro Tier Client (Minimum 6 units, +5 points = 1 protection, max 3 protections)**

| Month | Units | Points Earned | Running Total | Protection Awarded | Total Protections | Remaining Points |
|-------|-------|---------------|---------------|-------------------|------------------|------------------|
| Jan   | 12    | +6            | 6             | Yes (1 month)     | 1                | 1 (6-5)          |
| Feb   | 10    | +4            | 5 (1+4)       | Yes (1 month)     | 2                | 0                |
| Mar   | 11    | +5            | 5             | Yes (1 month)     | **3 (MAX)**      | 0                |
| Apr   | 13    | +7            | 7             | **Cannot award**  | 3 (capped)       | 7 (banked)       |

**Note:** Once at max (3 protections), points continue accumulating but no new protections awarded until one is consumed

---

# API Endpoints Needed

## Client Tier Management
- `GET /api/clients/:id/loyalty-tier` - Get current tier info
- `POST /api/clients/:id/loyalty-tier/evaluate` - Manually trigger tier evaluation
- `POST /api/clients/:id/loyalty-tier/add-units` - Manually add estimate units
- `POST /api/clients/:id/loyalty-tier/add-tokens` - Add estimate tokens

## Admin Operations
- `POST /api/loyalty/monthly-evaluation` - Trigger monthly evaluation (cron)
- `POST /api/loyalty/rollout` - Initialize rollout (Feb 2, 2026)
- `GET /api/loyalty/analytics` - Tier distribution and revenue analytics
- `GET /api/loyalty/clients-by-tier` - List clients by tier

## Cashback
- `GET /api/clients/:id/cashback` - Get cashback balance
- `POST /api/clients/:id/cashback/apply` - Apply cashback to invoice

---

# Next Steps

1. **Review and approve** this specification
2. **Update Client schema** with new fields
3. **Create migration script** for existing clients
4. **Implement core service layer** (loyaltyTierService.js)
5. **Build UI components** for tier display
6. **Set up cron job** for monthly evaluation
7. **Test thoroughly** before February 2, 2026 rollout
