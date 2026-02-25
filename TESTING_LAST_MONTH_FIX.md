# Testing the Last Month Count Fix

## Quick Test Commands

### 1. Check Acme Roof Plumbing's Project Counts by Month

```bash
# Using curl
curl http://localhost:3000/api/loyalty/client/6880a6a198a04402dafabc0f/project-counts-by-month

# Or in browser
http://localhost:3000/api/loyalty/client/6880a6a198a04402dafabc0f/project-counts-by-month
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "clientId": "6880a6a198a04402dafabc0f",
    "clientName": "Acme Roof Plumbing",
    "monthlyBreakdown": [
      {
        "month": "2026-01",
        "projectCount": 14,
        "estimateUnits": 12.5
      },
      {
        "month": "2025-12",
        "projectCount": 60,
        "estimateUnits": 45.2
      },
      ...
    ]
  }
}
```

### 2. Check Full Loyalty Info (Including New lastMonth Field)

```bash
curl http://localhost:3000/api/loyalty/client/6880a6a198a04402dafabc0f
```

**Look for this in the response:**
```json
{
  "success": true,
  "data": {
    ...
    "currentMonthUnits": 12.5,
    "lastMonth": {
      "month": "2025-12",
      "projectCount": 60,
      "estimateUnits": 45.2,
      "tier": "elite"
    },
    ...
  }
}
```

### 3. Run the Calculation Script

```bash
cd Backend
node scripts/calculate-last-month-counts.js
```

**Expected Output:**
```
✅ Connected to MongoDB

📅 Calculating for previous month: 2025-12
   Date range: 2025-12-01T00:00:00.000Z to 2026-01-01T00:00:00.000Z

👥 Found 108 enrolled clients

✓ Acme Roof Plumbing                     | Projects:  60 | Units:  45.2
✓ Another Client                         | Projects:  12 | Units:   8.0
...

═══════════════════════════════════════════════════════════════════════════════
✅ Calculation complete!
   Updated: 108 clients
   Errors: 0
═══════════════════════════════════════════════════════════════════════════════
```

## Frontend Testing

### 1. Open EditClientModal for Acme Roof Plumbing

1. Navigate to All Clients table
2. Click on "Acme Roof Plumbing"
3. Look at the "Loyalty Tier Management" section

**Before Fix:**
```
Last Month (2026-01)
0 units
Tier: ELITE
```

**After Fix:**
```
Last Month (2025-12)
60 projects
Tier: ELITE • 45.2 units billed
```

## Verification Checklist

- [ ] Backend server restarted
- [ ] Calculation script run successfully
- [ ] GET /loyalty/client/:id includes `lastMonth` object
- [ ] lastMonth.projectCount matches actual DB count
- [ ] Frontend displays "X projects" instead of "X units"
- [ ] Frontend shows both tier and units in subtitle
- [ ] Cache is working (check console logs for "Using cached" message)

## Database Queries for Manual Verification

### Count December 2025 Projects for Acme

```javascript
// In MongoDB shell or Compass
db.projects.countDocuments({
  linkedClients: ObjectId('6880a6a198a04402dafabc0f'),
  posting_date: {
    $gte: new Date('2025-12-01'),
    $lt: new Date('2026-01-01')
  }
})
```

### Check Client's Cached Values

```javascript
db.clients.findOne(
  { _id: ObjectId('6880a6a198a04402dafabc0f') },
  { 
    name: 1, 
    lastMonthProjectCount: 1, 
    lastMonthEstimateUnits: 1, 
    lastMonthCalculatedDate: 1 
  }
)
```

**Expected:**
```json
{
  "_id": ObjectId("6880a6a198a04402dafabc0f"),
  "name": "Acme Roof Plumbing",
  "lastMonthProjectCount": 60,
  "lastMonthEstimateUnits": 45.2,
  "lastMonthCalculatedDate": ISODate("2026-01-28T...")
}
```

## Performance Testing

### Test Cache Hit

1. Call API first time: Should see "Calculated and cached last month count" in logs
2. Call API second time (within 24hrs): Should see "Using cached last month count" in logs
3. Verify response time is faster on second call

### Test Multiple Clients

```bash
# Get project counts for multiple clients
curl http://localhost:3000/api/loyalty/client/CLIENT_ID_1/project-counts-by-month
curl http://localhost:3000/api/loyalty/client/CLIENT_ID_2/project-counts-by-month
curl http://localhost:3000/api/loyalty/client/CLIENT_ID_3/project-counts-by-month
```

## Troubleshooting

### Issue: lastMonth shows 0 projects

**Check:**
1. Are projects linked to client? (`linkedClients` array)
2. Do projects have `posting_date` set?
3. Is posting_date in December 2025?

**Fix:**
```javascript
// Check linked projects
db.projects.find({ 
  linkedClients: ObjectId('6880a6a198a04402dafabc0f') 
}).count()

// Check posting_date field
db.projects.find({ 
  linkedClients: ObjectId('6880a6a198a04402dafabc0f'),
  posting_date: { $exists: true }
}).count()
```

### Issue: Cache not updating

**Check:**
```javascript
db.clients.updateOne(
  { _id: ObjectId('6880a6a198a04402dafabc0f') },
  { $set: { lastMonthCalculatedDate: new Date('2020-01-01') } }
)
```
Then call API again - should recalculate.

### Issue: Frontend not showing changes

**Steps:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check Network tab for API response
4. Verify response includes `lastMonth` object

## Expected Behavior Summary

| Field | Before | After |
|-------|--------|-------|
| Display Label | "Last Month (2026-01)" | "Last Month (2025-12)" |
| Main Value | "0 units" | "60 projects" |
| Subtitle | "Tier: ELITE" | "Tier: ELITE • 45.2 units billed" |
| Data Source | `monthlyUsageHistory[0]` | `lastMonth.projectCount` |
| Month Shown | Current month (wrong) | Previous month (correct) |

---

**Test Date**: January 28, 2026  
**Expected Last Month**: 2025-12 (December 2025)  
**Expected Current Month**: 2026-01 (January 2026)
