const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'ART';

async function addProjectIndexes() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment variables');
    console.log('💡 Make sure your .env file exists in the Backend folder');
    process.exit(1);
  }
  
  console.log('🔧 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const projectsCollection = db.collection('projects');
    
    console.log('\n📊 Creating indexes for projects collection...\n');
    
    // Index 1: Optimizes main sorting (posting_date DESC, projectNumber DESC)
    console.log('1️⃣ Creating index: { posting_date: -1, projectNumber: -1 }');
    await projectsCollection.createIndex(
      { posting_date: -1, projectNumber: -1 },
      { name: 'posting_date_projectNumber_desc' }
    );
    console.log('   ✅ Created: posting_date_projectNumber_desc');
    
    // Index 2: Optimizes Estimator role filtering + sorting
    console.log('\n2️⃣ Creating index: { linkedEstimators: 1, posting_date: -1 }');
    await projectsCollection.createIndex(
      { linkedEstimators: 1, posting_date: -1 },
      { name: 'linkedEstimators_posting_date' }
    );
    console.log('   ✅ Created: linkedEstimators_posting_date');
    
    // Index 3: Optimizes client filtering + sorting
    console.log('\n3️⃣ Creating index: { linkedClients: 1, posting_date: -1 }');
    await projectsCollection.createIndex(
      { linkedClients: 1, posting_date: -1 },
      { name: 'linkedClients_posting_date' }
    );
    console.log('   ✅ Created: linkedClients_posting_date');
    
    // Display all indexes
    console.log('\n📋 All indexes on projects collection:');
    const indexes = await projectsCollection.indexes();
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}:`, JSON.stringify(index.key));
    });
    
    console.log('\n🎉 Index creation complete!');
    console.log('💡 These indexes will speed up JobBoard sorting and filtering.\n');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

addProjectIndexes();
