// migrations/migrate-pricingTier-to-loyaltyTier.js
/**
 * MIGRATION: Consolidate pricingTier into loyaltyTier
 * 
 * Problem: Having both pricingTier (legacy) and loyaltyTier (new) causes confusion
 * Solution: Copy all pricingTier values to loyaltyTier and remove pricingTier field
 */

require('dotenv').config();
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({}, { strict: false, collection: 'clients' });
const Client = mongoose.model('Client', clientSchema);

async function migrateTiers() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('MIGRATION: Consolidate pricingTier → loyaltyTier');
    console.log('═══════════════════════════════════════════════════════════\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all clients
    const clients = await Client.find({});
    console.log(`📊 Found ${clients.length} clients\n`);

    let migrated = 0;
    let alreadyCorrect = 0;
    let fixed = 0;

    for (const client of clients) {
      console.log(`\n🔍 Client: ${client.name} (${client._id})`);
      console.log(`   Current loyaltyTier: ${client.loyaltyTier || 'NOT SET'}`);
      console.log(`   Current pricingTier: ${client.pricingTier || 'NOT SET'}`);

      const updateData = {};

      // Normalize tier names: 'Standard' → 'Casual', 'standard' → 'Casual'
      const normalizeTier = (tier) => {
        if (!tier) return null;
        const lowerTier = tier.toLowerCase();
        if (lowerTier === 'standard') return 'Casual';
        if (lowerTier === 'casual') return 'Casual';
        if (lowerTier === 'pro') return 'Pro';
        if (lowerTier === 'elite') return 'Elite';
        return null; // Invalid tier
      };

      const normalizedLoyaltyTier = normalizeTier(client.loyaltyTier);
      const normalizedPricingTier = normalizeTier(client.pricingTier);

      // Priority 1: If loyaltyTier exists and is valid, keep it
      if (normalizedLoyaltyTier) {
        if (client.loyaltyTier !== normalizedLoyaltyTier) {
          updateData.loyaltyTier = normalizedLoyaltyTier;
          console.log(`   ✏️ Normalizing loyaltyTier: ${client.loyaltyTier} → ${normalizedLoyaltyTier}`);
          fixed++;
        } else {
          console.log(`   ✅ loyaltyTier already correct`);
          alreadyCorrect++;
        }
      }
      // Priority 2: If loyaltyTier missing, use pricingTier
      else if (normalizedPricingTier) {
        updateData.loyaltyTier = normalizedPricingTier;
        console.log(`   🔄 Migrating pricingTier → loyaltyTier: ${normalizedPricingTier}`);
        migrated++;
      }
      // Priority 3: Default to Casual
      else {
        updateData.loyaltyTier = 'Casual';
        console.log(`   ⚠️ No tier found, defaulting to Casual`);
        migrated++;
      }

      // Always remove pricingTier field (it's legacy, no longer needed)
      if (client.pricingTier !== undefined) {
        updateData.$unset = { pricingTier: '' };
        console.log(`   🗑️ Removing legacy pricingTier field`);
      }

      // Update if needed
      if (Object.keys(updateData).length > 0) {
        await Client.updateOne({ _id: client._id }, updateData);
        console.log(`   ✅ Updated`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total clients: ${clients.length}`);
    console.log(`Already correct: ${alreadyCorrect}`);
    console.log(`Migrated from pricingTier: ${migrated}`);
    console.log(`Fixed/normalized: ${fixed}`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

migrateTiers();
