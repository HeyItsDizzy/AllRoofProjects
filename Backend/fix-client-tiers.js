// Script to standardize client tier field to use currentTier
// This fixes the inconsistency between loyaltyTier and currentTier

require("dotenv").config();
const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({}, { strict: false, collection: 'clients' });
const Client = mongoose.model('Client', clientSchema);

async function fixClientTiers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📊 Fetching all clients...');
    const clients = await Client.find({});
    console.log(`Found ${clients.length} clients\n`);

    let updated = 0;
    let skipped = 0;

    for (const client of clients) {
      console.log(`\n📋 Processing: ${client.name} (${client._id})`);
      
      // Determine the correct tier
      let correctTier = null;
      
      // Priority 1: Use currentTier if it exists and is capitalized properly
      if (client.currentTier && ['Casual', 'Premium', 'Elite'].includes(client.currentTier)) {
        correctTier = client.currentTier;
        console.log(`  ✓ Has valid currentTier: ${correctTier}`);
      }
      // Priority 2: Use loyaltyTier if it exists
      else if (client.loyaltyTier) {
        correctTier = client.loyaltyTier.charAt(0).toUpperCase() + client.loyaltyTier.slice(1).toLowerCase();
        console.log(`  ✓ Has loyaltyTier: ${correctTier}`);
      }
      // Priority 3: Default to Casual
      else {
        correctTier = 'Casual';
        console.log(`  ⚠ No tier found, defaulting to: ${correctTier}`);
      }

      // Update the client with loyaltyTier and remove currentTier
      const updateData = {
        loyaltyTier: correctTier,
        $unset: { currentTier: "" }
      };

      await Client.updateOne(
        { _id: client._id },
        updateData
      );

      console.log(`  ✅ Set loyaltyTier: ${correctTier}, removed currentTier`);
      updated++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Migration complete!`);
    console.log(`   Updated: ${updated} clients`);
    console.log(`   Skipped: ${skipped} clients`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixClientTiers();
