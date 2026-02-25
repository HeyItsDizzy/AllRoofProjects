// scripts/create-project-indexes.js
/**
 * Create optimized indexes for loyalty tier project counting
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function createIndexes() {
  let mongoClient;
  try {
    // Connect to MongoDB
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = process.env.DB_NAME || 'projectmanager';
    const db = mongoClient.db(dbName);
    const collection = db.collection('Projects');

    // Drop existing indexes (optional - uncomment to recreate)
    // console.log('🗑️  Dropping existing indexes...');
    // await collection.dropIndexes();

    console.log('📊 Creating performance indexes...\n');

    // Index 1: linkedClients + posting_date (for monthly project counts)
    console.log('Creating: linkedClients_1_posting_date_1');
    await collection.createIndex(
      { linkedClients: 1, posting_date: 1 },
      { 
        name: 'linkedClients_posting_date_idx',
        background: true
      }
    );
    console.log('✅ Created compound index on (linkedClients, posting_date)\n');

    // Index 2: posting_date only (for date range queries)
    console.log('Creating: posting_date_1');
    await collection.createIndex(
      { posting_date: 1 },
      { 
        name: 'posting_date_idx',
        background: true
      }
    );
    console.log('✅ Created index on posting_date\n');

    // Index 3: linkedClients + estimateUnits (for unit calculations)
    console.log('Creating: linkedClients_1_estimateUnits_1');
    await collection.createIndex(
      { linkedClients: 1, estimateUnits: 1 },
      { 
        name: 'linkedClients_estimateUnits_idx',
        background: true,
        sparse: true // Only index documents with estimateUnits
      }
    );
    console.log('✅ Created compound index on (linkedClients, estimateUnits)\n');

    // Show all indexes
    console.log('📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✅ Index creation complete!');
    console.log('   These indexes will improve query performance for:');
    console.log('   • Monthly project counts by client');
    console.log('   • Date range queries');
    console.log('   • Estimate unit aggregations\n');

    // Test query performance
    console.log('🧪 Testing query performance...');
    const testClientId = '6880a6a198a04402dafabc0f'; // Acme Roof Plumbing
    
    const startTime = Date.now();
    const count = await collection.countDocuments({
      linkedClients: new ObjectId(testClientId),
      posting_date: {
        $gte: new Date('2025-12-01'),
        $lt: new Date('2026-01-01')
      }
    });
    const queryTime = Date.now() - startTime;
    
    console.log(`   Query completed in ${queryTime}ms`);
    console.log(`   Found ${count} projects for December 2025\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
}

createIndexes();
