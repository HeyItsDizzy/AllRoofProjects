/**
 * Migration Script: Update Legacy Tier Names to New Tier System
 * 
 * Changes:
 * - "standard" → "Casual"
 * - "premium" → "Pro"  
 * - "pro" → "Pro"
 * - "elite" → "Elite"
 * 
 * This is the first implementation of the loyalty tier system.
 * All tier values should use proper casing: Casual, Pro, Elite
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('./config/Client');

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateTierNames() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Tier mapping: old → new
    const tierMapping = {
      'standard': 'Casual',
      'Standard': 'Casual',
      'premium': 'Pro',
      'Premium': 'Pro',
      'pro': 'Pro',
      'Pro': 'Pro',
      'elite': 'Elite',
      'Elite': 'Elite'
    };

    console.log('📊 Finding clients with legacy tier names...\n');

    // Find all clients
    const clients = await Client.find({});
    console.log(`Found ${clients.length} total clients\n`);

    let updatedCount = 0;

    for (const client of clients) {
      let needsUpdate = false;
      const updates = [];

      // Check main loyaltyTier field
      if (client.loyaltyTier && tierMapping[client.loyaltyTier]) {
        const newTier = tierMapping[client.loyaltyTier];
        if (client.loyaltyTier !== newTier) {
          updates.push(`loyaltyTier: "${client.loyaltyTier}" → "${newTier}"`);
          client.loyaltyTier = newTier;
          needsUpdate = true;
        }
      }

      // Check previousTier field
      if (client.previousTier && tierMapping[client.previousTier]) {
        const newTier = tierMapping[client.previousTier];
        if (client.previousTier !== newTier) {
          updates.push(`previousTier: "${client.previousTier}" → "${newTier}"`);
          client.previousTier = newTier;
          needsUpdate = true;
        }
      }

      // Check tierProtectionType field
      if (client.tierProtectionType && tierMapping[client.tierProtectionType]) {
        const newTier = tierMapping[client.tierProtectionType];
        if (client.tierProtectionType !== newTier) {
          updates.push(`tierProtectionType: "${client.tierProtectionType}" → "${newTier}"`);
          client.tierProtectionType = newTier;
          needsUpdate = true;
        }
      }

      // Check monthlyUsageHistory array
      if (client.monthlyUsageHistory && client.monthlyUsageHistory.length > 0) {
        client.monthlyUsageHistory.forEach((entry, idx) => {
          if (entry.tier && tierMapping[entry.tier]) {
            const newTier = tierMapping[entry.tier];
            if (entry.tier !== newTier) {
              updates.push(`monthlyUsageHistory[${idx}].tier: "${entry.tier}" → "${newTier}"`);
              entry.tier = newTier;
              needsUpdate = true;
            }
          }
        });
      }

      // Check protectionPointsHistory array
      if (client.protectionPointsHistory && client.protectionPointsHistory.length > 0) {
        client.protectionPointsHistory.forEach((entry, idx) => {
          if (entry.tier && tierMapping[entry.tier]) {
            const newTier = tierMapping[entry.tier];
            if (entry.tier !== newTier) {
              updates.push(`protectionPointsHistory[${idx}].tier: "${entry.tier}" → "${newTier}"`);
              entry.tier = newTier;
              needsUpdate = true;
            }
          }
        });
      }

      // Check cashbackHistory array
      if (client.cashbackHistory && client.cashbackHistory.length > 0) {
        client.cashbackHistory.forEach((entry, idx) => {
          let entryUpdated = false;
          
          if (entry.fromTier && tierMapping[entry.fromTier]) {
            const newTier = tierMapping[entry.fromTier];
            if (entry.fromTier !== newTier) {
              updates.push(`cashbackHistory[${idx}].fromTier: "${entry.fromTier}" → "${newTier}"`);
              entry.fromTier = newTier;
              entryUpdated = true;
            }
          }
          
          if (entry.toTier && tierMapping[entry.toTier]) {
            const newTier = tierMapping[entry.toTier];
            if (entry.toTier !== newTier) {
              updates.push(`cashbackHistory[${idx}].toTier: "${entry.toTier}" → "${newTier}"`);
              entry.toTier = newTier;
              entryUpdated = true;
            }
          }
          
          if (entryUpdated) {
            needsUpdate = true;
          }
        });
      }

      // Save if any updates were made
      if (needsUpdate) {
        await client.save();
        updatedCount++;
        
        console.log(`✅ Updated: ${client.name} (${client._id})`);
        updates.forEach(update => console.log(`   - ${update}`));
        console.log('');
      }
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`   Total clients: ${clients.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   No changes needed: ${clients.length - updatedCount}\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
  }
}

// Run migration
migrateTierNames();
