# 📊 PRICING SYSTEM DEPLOYMENT - February 2026

## 🎯 Overview
Transitioning from **Legacy Pricing** (Elite 40% off) to **New Pricing** (Elite 30% off) for all estimates sent after February 1, 2026.

**Critical Requirement**: All existing projects MUST have pricing locked via snapshots BEFORE switching to new pricing.

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### Step 1: Backup Database
```bash
# On VPS
mongodump --uri="mongodb://localhost:27017/yourdb" --out=/backup/pre-pricing-migration-$(date +%Y%m%d)
```

### Step 2: Verify Current Pricing Snapshot Coverage
```bash
cd /root/ART/ProjectManagerApp/Backend
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
client.connect().then(async () => {
  const db = client.db();
  const total = await db.collection('projects').countDocuments();
  const withSnapshots = await db.collection('projects').countDocuments({ 'pricingSnapshot.capturedAt': { \$ne: null } });
  const withoutSnapshots = total - withSnapshots;
  console.log('Total projects:', total);
  console.log('WITH snapshots:', withSnapshots);
  console.log('WITHOUT snapshots:', withoutSnapshots);
  if (withoutSnapshots > 0) {
    console.log('⚠️  WARNING: Projects missing snapshots! Run backfill before migration.');
  } else {
    console.log('✅ All projects have pricing snapshots');
  }
  await client.close();
}).catch(console.error);
"
```

### Step 3: Run Pricing Snapshot Backfill (if needed)
```bash
cd /root/ART/ProjectManagerApp/Backend
node scripts/backfill-pricing-snapshots-pre-feb-2026.js
```

**What this does:**
- Finds all projects WITHOUT pricing snapshots
- Locks them to LEGACY pricing (Elite 40% off)
- Timestamps snapshot as Jan 31, 2026 23:59:59
- Marks as `backfilled: true` for audit trail

**Expected results:**
- All projects now have `pricingSnapshot.capturedAt` populated
- All backfilled projects have `clientUseNewPricing: false`
- Elite tier projects locked to 0.6 multiplier (40% off)

---

## 🚀 DEPLOYMENT STEPS

### Step 4: Switch Clients to New Pricing
```bash
cd /root/ART/ProjectManagerApp/Backend
node scripts/migrate-to-new-pricing-feb-2026.js
```

**What this does:**
- Sets ALL clients to `useNewPricing: true`
- Adds `pricingMigrationDate: 2026-02-01`
- Shows before/after counts

**Expected results:**
- All clients now have `useNewPricing: true`
- New estimates sent will use 30% off Elite (0.7 multiplier)
- Old projects remain locked to 40% off Elite (0.6 multiplier) via snapshots

### Step 5: Verify Pricing Logic
```bash
# Test that old projects still use snapshot pricing
cd /root/ART/ProjectManagerApp/Backend
node -e "
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
client.connect().then(async () => {
  const db = client.db();
  const projectsCol = db.collection('projects');
  const clientsCol = db.collection('clients');
  
  // Find a project with backfilled snapshot
  const oldProject = await projectsCol.findOne({
    'pricingSnapshot.backfilled': true,
    'pricingSnapshot.clientPricingTier': 'Elite'
  });
  
  if (oldProject) {
    console.log('Old Elite project (should be 0.6):');
    console.log('  Multiplier:', oldProject.pricingSnapshot.priceMultiplier);
    console.log('  UseNewPricing:', oldProject.pricingSnapshot.clientUseNewPricing);
    console.log('  Captured:', oldProject.pricingSnapshot.capturedAt);
  }
  
  // Find an Elite client (should be useNewPricing: true)
  const eliteClient = await clientsCol.findOne({ pricingTier: 'Elite' });
  if (eliteClient) {
    console.log('\\nElite client (should be true):');
    console.log('  UseNewPricing:', eliteClient.useNewPricing);
  }
  
  await client.close();
}).catch(console.error);
"
```

**Expected output:**
```
Old Elite project (should be 0.6):
  Multiplier: 0.6
  UseNewPricing: false
  Captured: 2026-01-31T23:59:59.000Z

Elite client (should be true):
  UseNewPricing: true
```

### Step 6: Test New Estimate Creation
1. Create a test project for an Elite client
2. Send estimate via `/send-estimate` endpoint
3. Verify new snapshot is captured with:
   - `clientUseNewPricing: true`
   - `priceMultiplier: 0.7` (30% off)
   - `capturedAt: <current timestamp>`

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### Check 1: Snapshot Distribution
```bash
cd /root/ART/ProjectManagerApp/Backend
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();
const client = new MongoClient(process.env.MONGO_URI);
client.connect().then(async () => {
  const db = client.db();
  const col = db.collection('projects');
  
  const backfilledLegacy = await col.countDocuments({
    'pricingSnapshot.backfilled': true,
    'pricingSnapshot.clientUseNewPricing': false
  });
  
  const newPricing = await col.countDocuments({
    'pricingSnapshot.capturedAt': { \$gte: new Date('2026-02-01') },
    'pricingSnapshot.clientUseNewPricing': true
  });
  
  console.log('Projects with backfilled legacy pricing:', backfilledLegacy);
  console.log('Projects with new pricing (Feb 2026+):', newPricing);
  
  await client.close();
}).catch(console.error);
"
```

### Check 2: Client Migration Status
```bash
cd /root/ART/ProjectManagerApp/Backend
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();
const client = new MongoClient(process.env.MONGO_URI);
client.connect().then(async () => {
  const db = client.db();
  const col = db.collection('clients');
  
  const total = await col.countDocuments();
  const newPricing = await col.countDocuments({ useNewPricing: true });
  const legacy = await col.countDocuments({ useNewPricing: false });
  
  console.log('Total clients:', total);
  console.log('On new pricing:', newPricing);
  console.log('On legacy pricing:', legacy);
  
  if (legacy > 0) {
    console.log('\\n⚠️  WARNING: Some clients still on legacy pricing!');
  }
  
  await client.close();
}).catch(console.error);
"
```

### Check 3: Pricing Tier Breakdown
```bash
cd /root/ART/ProjectManagerApp/Backend
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();
const client = new MongoClient(process.env.MONGO_URI);
client.connect().then(async () => {
  const db = client.db();
  const col = db.collection('projects');
  
  const elite06 = await col.countDocuments({ 'pricingSnapshot.priceMultiplier': 0.6 });
  const elite07 = await col.countDocuments({ 'pricingSnapshot.priceMultiplier': 0.7 });
  const pro = await col.countDocuments({ 'pricingSnapshot.priceMultiplier': 0.8 });
  const standard = await col.countDocuments({ 'pricingSnapshot.priceMultiplier': 1.0 });
  
  console.log('PRICING MULTIPLIER DISTRIBUTION:');
  console.log('Elite Legacy (0.6 / 40% off):', elite06);
  console.log('Elite New (0.7 / 30% off):', elite07);
  console.log('Pro (0.8 / 20% off):', pro);
  console.log('Standard (1.0 / full price):', standard);
  
  await client.close();
}).catch(console.error);
"
```

---

## 🔒 BACKWARDS COMPATIBILITY

The system is designed to handle projects WITHOUT snapshots gracefully:

### In `/send-estimate` endpoint (projectRoutes.js line 1653):
```javascript
if (!project.pricingSnapshot || !project.pricingSnapshot.capturedAt) {
  // No snapshot exists - create one NOW with current client pricing
  const pricingSnapshot = {
    capturedAt: new Date(),
    clientPricingTier: clientData?.pricingTier || 'Standard',
    clientUseNewPricing: clientData?.useNewPricing || false,
    priceMultiplier: calculateMultiplier(tier, useNew)
  };
  await collection.updateOne({ _id }, { $set: { pricingSnapshot } });
}
```

This means:
- ✅ If a project was created before snapshots existed, it gets one on first send
- ✅ After backfill, ALL projects have snapshots before client migration
- ✅ Future projects auto-capture snapshot on send
- ✅ No "orphaned" projects without pricing

---

## 📊 PRICING COMPARISON TABLE

| Tier | Legacy (before Feb 2026) | New (Feb 2026+) | Change |
|------|-------------------------|-----------------|--------|
| **Elite** | 40% off (0.6) | 30% off (0.7) | +10% revenue |
| **Pro** | 20% off (0.8) | 20% off (0.8) | No change |
| **Standard** | Full price (1.0) | Full price (1.0) | No change |

---

## 🚨 ROLLBACK PROCEDURE

If issues arise, rollback by:

### Option 1: Revert All Clients to Legacy
```bash
cd /root/ART/ProjectManagerApp/Backend
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();
const client = new MongoClient(process.env.MONGO_URI);
client.connect().then(async () => {
  const db = client.db();
  const result = await db.collection('clients').updateMany(
    {},
    { \$set: { useNewPricing: false } }
  );
  console.log('Reverted', result.modifiedCount, 'clients to legacy pricing');
  await client.close();
}).catch(console.error);
"
```

### Option 2: Restore from Backup
```bash
# On VPS
mongorestore --uri="mongodb://localhost:27017/yourdb" --drop /backup/pre-pricing-migration-YYYYMMDD
```

---

## 📝 TIMELINE

1. **January 31, 2026 EOD**: Run backfill script
2. **February 1, 2026 12:00 AM**: Run client migration script
3. **February 1, 2026 9:00 AM**: Verify checks
4. **February 1, 2026 12:00 PM**: Test new estimate creation
5. **February 2-7, 2026**: Monitor for issues

---

## ✅ FINAL CHECKLIST

- [ ] Database backup completed
- [ ] Verified snapshot coverage (all projects have snapshots)
- [ ] Ran backfill script (if needed)
- [ ] Ran client migration script (all clients on new pricing)
- [ ] Verified old projects still locked to legacy pricing
- [ ] Tested new estimate creation with new pricing
- [ ] Verified pricing multipliers in database
- [ ] Monitored logs for errors
- [ ] Documented migration date in project history
- [ ] Notified team of pricing changes

---

## 🎓 TRAINING NOTES FOR TEAM

**Key Points to Communicate:**
1. Elite tier pricing changed from 40% to 30% off starting Feb 1, 2026
2. All OLD projects keep their original pricing (protected by snapshots)
3. Only NEW estimates sent after Feb 1 use new rates
4. Pro and Standard tiers unchanged
5. Pricing is locked when estimate is SENT, not when project is created

---

## 📞 SUPPORT

If issues arise during deployment:
- Check logs: `/root/ART/ProjectManagerApp/Backend/logs/`
- Verify database state with verification scripts above
- Rollback using procedures above if critical issues
- Document any unexpected behavior for post-mortem

---

**Migration Scripts Location:**
- Backfill: `/root/ART/ProjectManagerApp/Backend/scripts/backfill-pricing-snapshots-pre-feb-2026.js`
- Client Migration: `/root/ART/ProjectManagerApp/Backend/scripts/migrate-to-new-pricing-feb-2026.js`
