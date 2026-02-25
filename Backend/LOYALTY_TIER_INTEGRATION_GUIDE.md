# Loyalty Tier System - Integration Guide

## 🎯 Implementation Status

✅ **Database Schema** - Client.js updated with all loyalty tier fields
✅ **Service Layer** - loyaltyTierService.js with complete tier logic  
✅ **Cron Jobs** - loyaltyTierCron.js for automated monthly operations
✅ **API Routes** - loyaltyTierRoutes.js with all endpoints
✅ **Migration Script** - addLoyaltyTierFields.js to update existing clients

---

## 📋 Integration Checklist

### Step 1: Install Dependencies (if needed)
```bash
npm install node-cron
```

### Step 2: Register Routes in Main Server File
Add to your main server file (e.g., `server.js` or `app.js`):

```javascript
// Import loyalty tier routes
const loyaltyTierRoutes = require('./routes/loyaltyTierRoutes');

// Register routes
app.use('/api/loyalty', loyaltyTierRoutes);
```

### Step 3: Initialize Cron Jobs in Server Startup
Add to your server startup:

```javascript
// Import cron jobs
const { initializeLoyaltyTierCronJobs } = require('./cronJobs/loyaltyTierCron');

// After server starts, initialize cron jobs
const loyaltyCronJobs = initializeLoyaltyTierCronJobs();
```

### Step 4: Run Migration Script
Execute the migration to add fields to existing clients:

```bash
node Backend/migrations/addLoyaltyTierFields.js
```

This will add all loyalty tier fields with default values to existing clients.

### Step 5: Track Estimate Units
Update your project/estimate creation logic to track units:

```javascript
const { addEstimateUnits } = require('./services/loyaltyTierService');

// When an estimate is created or completed:
async function onEstimateCompleted(projectId, clientId) {
  // ... existing logic ...
  
  // Add 1 unit to client's monthly counter
  await addEstimateUnits(clientId, 1);
}

// For time-based estimates (1 hour = 1 unit):
async function onTimeTracked(clientId, hours) {
  // Round hours to nearest unit
  const units = Math.round(hours);
  await addEstimateUnits(clientId, units);
}
```

### Step 6: Rollout on February 2, 2026
On the rollout date, call the rollout endpoint:

```bash
POST /api/loyalty/rollout
```

This will:
- Set all clients to Elite tier
- Set enrollment date to Feb 2, 2026
- Initialize protection type to 'elite'
- Mark clients as rollout participants

---

## 🔌 API Endpoints Reference

### Client Information
- `GET /api/loyalty/client/:id` - Get complete tier info
- `GET /api/loyalty/client/:id/cashback` - Get cashback balance

### Unit Tracking
- `POST /api/loyalty/client/:id/add-units` - Add estimate units
  ```json
  { "units": 1 }
  ```

### Tier Management
- `POST /api/loyalty/client/:id/evaluate` - Manually trigger evaluation

### Admin Operations
- `POST /api/loyalty/evaluate-all` - Run monthly evaluation (all clients)
- `POST /api/loyalty/reset-counters` - Reset monthly counters
- `POST /api/loyalty/rollout` - Initialize system rollout
- `GET /api/loyalty/analytics` - Get system-wide statistics
- `GET /api/loyalty/clients-by-tier/:tier` - List clients by tier

### Cashback
- `POST /api/loyalty/client/:id/cashback/apply` - Apply cashback to invoice
  ```json
  { "amount": 100, "invoiceId": "INV-123" }
  ```

### Tokens (Optional)
- `POST /api/loyalty/client/:id/tokens/add` - Add estimate tokens
  ```json
  { "tokens": 5 }
  ```

---

## ⏰ Cron Job Schedule

The system runs two automated jobs:

1. **Monthly Evaluation** (Last day of month at 11:50 PM)
   - Evaluates all clients' monthly performance
   - Awards protection months if thresholds met
   - Handles tier changes and conversions
   - Awards cashback for requalifications
   - Archives month to history

2. **Counter Reset** (1st day of month at 12:01 AM)
   - Resets `currentMonthEstimateUnits` to 0 for all clients
   - Sets `monthlyCounterResetDate` to current date

**Timezone:** Australia/Sydney (adjust in `loyaltyTierCron.js` if needed)

### Manual Triggers
For testing or emergency runs:

```javascript
const { manuallyTriggerEvaluation, manuallyTriggerReset } = require('./cronJobs/loyaltyTierCron');

// Manually run evaluation
await manuallyTriggerEvaluation();

// Manually reset counters
await manuallyTriggerReset();
```

---

## 🎨 Frontend Integration Examples

### Display Client Tier Badge
```javascript
async function fetchClientTier(clientId) {
  const response = await axios.get(`/api/loyalty/client/${clientId}`);
  const { currentTier, pricePerUnit, discount } = response.data.data;
  
  return {
    tier: currentTier.toUpperCase(),
    price: pricePerUnit,
    discount: discount
  };
}

// Display: "Elite Tier - $70/unit (30% off)"
```

### Show Protection Status
```javascript
async function fetchProtectionStatus(clientId) {
  const response = await axios.get(`/api/loyalty/client/${clientId}`);
  const { protection } = response.data.data;
  
  return {
    monthsHeld: protection.monthsHeld,
    currentPoints: protection.currentPoints,
    pointsNeeded: protection.pointsNeededForNext
  };
}

// Display: "Protection: 2 months | Points: 7/10 to next protection"
```

### Show Monthly Progress
```javascript
async function fetchMonthlyProgress(clientId) {
  const response = await axios.get(`/api/loyalty/client/${clientId}`);
  const { currentMonthUnits, currentTier } = response.data.data;
  
  const tierThresholds = {
    standard: { min: 0, next: 6, nextTier: 'Pro' },
    pro: { min: 6, next: 11, nextTier: 'Elite' },
    elite: { min: 11, next: null, nextTier: null }
  };
  
  const threshold = tierThresholds[currentTier];
  
  return {
    currentUnits: currentMonthUnits,
    nextThreshold: threshold.next,
    nextTier: threshold.nextTier,
    progress: threshold.next ? (currentMonthUnits / threshold.next) * 100 : 100
  };
}

// Display progress bar: "8/11 units to Elite tier (73%)"
```

---

## 🧪 Testing Strategy

### 1. Test Tier Calculation
```bash
# Add units to a test client
POST /api/loyalty/client/:id/add-units
{ "units": 8 }

# Check current month units
GET /api/loyalty/client/:id
# Should show: currentMonthUnits: 8

# Manually trigger evaluation
POST /api/loyalty/client/:id/evaluate
# Should calculate tier based on 8 units (Pro tier)
```

### 2. Test Protection Points
```bash
# Client has Pro tier (min 6), submits 8 units
POST /api/loyalty/client/:id/add-units
{ "units": 8 }

POST /api/loyalty/client/:id/evaluate
# Should earn +2 protection points (8 - 6 = 2)

# Repeat monthly until 5 points reached
# Should award 1 month Pro protection
```

### 3. Test Tier Promotion with Conversion
```bash
# Pro client with 1 protection month + 4 points
# Submit 15 units (qualifies for Elite)
POST /api/loyalty/client/:id/add-units
{ "units": 15 }

POST /api/loyalty/client/:id/evaluate
# Should:
# 1. Upgrade to Elite tier
# 2. Convert: 1 Pro protection = 5 Elite points
# 3. Total: 5 + 4 = 9 Elite points
```

### 4. Test Protection Usage
```bash
# Elite client with 2 protection months
# Submit only 8 units (below Elite minimum of 11)
POST /api/loyalty/client/:id/add-units
{ "units": 8 }

POST /api/loyalty/client/:id/evaluate
# Should:
# 1. Use 1 protection month (2 → 1)
# 2. Maintain Elite tier
# 3. NOT downgrade
```

### 5. Test Cashback
```bash
# Client was Pro, dropped to Standard, now requalifies for Pro
POST /api/loyalty/client/:id/add-units
{ "units": 8 }

POST /api/loyalty/client/:id/evaluate
# Should award $100 cashback (if 5+ units billed lifetime)

GET /api/loyalty/client/:id/cashback
# Should show: balance: 100
```

---

## 📊 Database Queries for Monitoring

### Check Tier Distribution
```javascript
db.clients.aggregate([
  { $match: { loyaltySystemEnrolledDate: { $ne: null } } },
  { $group: { _id: "$loyaltyTier", count: { $sum: 1 } } }
])
```

### Find Clients with Protection
```javascript
db.clients.find({
  tierProtectionQty: { $gt: 0 }
}).project({ name: 1, loyaltyTier: 1, tierProtectionQty: 1, tierProtectionPoints: 1 })
```

### Monthly Revenue by Tier
```javascript
db.clients.aggregate([
  { $match: { loyaltySystemEnrolledDate: { $ne: null } } },
  {
    $group: {
      _id: "$loyaltyTier",
      totalUnits: { $sum: "$currentMonthEstimateUnits" },
      count: { $sum: 1 }
    }
  },
  {
    $project: {
      tier: "$_id",
      clients: "$count",
      units: "$totalUnits",
      revenue: {
        $multiply: [
          "$totalUnits",
          { $cond: [{ $eq: ["$_id", "elite"] }, 70, { $cond: [{ $eq: ["$_id", "pro"] }, 80, 100] }] }
        ]
      }
    }
  }
])
```

---

## 🚨 Important Notes

1. **Timezone**: Cron jobs use Australia/Sydney timezone. Adjust in `loyaltyTierCron.js` if needed.

2. **Minimum Billing**: Cashback only awarded after client has been billed for 5+ units lifetime.

3. **Protection Cap**: Maximum 3 protection months per tier. Points continue accumulating but no new protections awarded when at cap.

4. **Protection Conversion**: Only happens on Pro → Elite promotion. Standard → Pro does not convert (Standard has no protection).

5. **Month Boundary**: Evaluation runs BEFORE counter reset to ensure current month's units are counted.

6. **Rollout Timing**: Run rollout endpoint exactly on Feb 2, 2026. All clients get Elite tier for that month.

7. **Unit Tracking**: Must integrate `addEstimateUnits()` into your estimate workflow for accurate counting.

---

## 🐛 Troubleshooting

### Cron jobs not running
- Check timezone setting in `loyaltyTierCron.js`
- Verify cron jobs are initialized in server startup
- Check server logs for cron execution

### Units not counting
- Verify `addEstimateUnits()` is called when estimates are created
- Check client is enrolled (loyaltySystemEnrolledDate is not null)
- Query database to verify currentMonthEstimateUnits is incrementing

### Protection not awarded
- Check if client has reached points threshold (Pro: 5, Elite: 10)
- Verify client hasn't reached max protection cap (3 months)
- Check protectionPointsHistory in database for calculation details

### Cashback not awarded
- Verify client has met minimum billing (5+ units lifetime)
- Check if cashback already awarded for this tier transition (cashbackHistory)
- Ensure tier change is an upgrade, not a downgrade

---

## 📞 Support

For issues or questions about the loyalty tier system:
1. Check server logs for detailed execution traces
2. Query database directly to inspect client loyalty fields
3. Use manual evaluation endpoints to test specific scenarios
4. Review monthlyUsageHistory and protectionPointsHistory for audit trail

---

**Last Updated:** December 18, 2025  
**Version:** 1.0.0  
**Status:** Ready for Integration
