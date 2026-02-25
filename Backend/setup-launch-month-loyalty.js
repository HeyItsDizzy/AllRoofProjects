const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'ART';

async function setupLaunchMonthBonuses() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment variables');
    process.exit(1);
  }
  
  console.log('🚀 Setting up Loyalty Launch Month Bonuses...\n');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const clientsCollection = db.collection('clients');
    
    // Get all clients
    const allClients = await clientsCollection.find({}).toArray();
    console.log(`📊 Found ${allClients.length} clients\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const clientDoc of allClients) {
      const clientName = clientDoc.name || 'Unknown';
      const clientId = clientDoc._id;
      
      // Check if client already has January 2026 Elite tier
      const hasJanuary2026 = clientDoc.monthlyUsageHistory?.some(
        h => h.month === '2026-01' && h.tier === 'Elite'
      );
      
      if (hasJanuary2026 && clientDoc.protectionPointsBalance >= 1) {
        console.log(`⏭️  ${clientName}: Already has January Elite + protection point`);
        skippedCount++;
        continue;
      }
      
      // Prepare update
      const update = {
        $set: {
          protectionPointsBalance: 1,
          loyaltyTier: 'Elite', // Capitalized tier name
          previousTier: null,
          tierEffectiveDate: new Date()
        },
        $unset: {
          currentTier: "" // Remove currentTier field
        }
      };
      
      // Add January 2026 Elite tier to history if not present
      if (!hasJanuary2026) {
        const januaryHistory = {
          month: '2026-01',
          year: 2026,
          monthNumber: 1,
          tier: 'Elite',
          unitsCompleted: 0, // Will be calculated at end of month
          tierChangeReason: 'Launch month bonus - All clients start as Elite',
          recordedAt: new Date()
        };
        
        update.$push = {
          monthlyUsageHistory: {
            $each: [januaryHistory],
            $position: 0 // Add at beginning
          }
        };
      }
      
      // Update client
      await clientsCollection.updateOne(
        { _id: clientId },
        update
      );
      
      console.log(`✅ ${clientName}: Set to Elite tier + 1 protection point`);
      updatedCount++;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Launch Month Setup Complete!\n');
    console.log(`✅ Updated: ${updatedCount} clients`);
    console.log(`⏭️  Skipped: ${skippedCount} clients (already set)`);
    console.log('\n📋 All clients now have:');
    console.log('   • Elite tier for January 2026');
    console.log('   • 1 Protection Point');
    console.log('   • Protection will auto-apply in February if needed');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Error setting up launch bonuses:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

setupLaunchMonthBonuses();
