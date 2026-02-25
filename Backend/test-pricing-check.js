// Quick test - run from Windows dev server: node test-pricing-check.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function quickCheck() {
  console.log('Connecting to database...');
  console.log('MONGODB_URI:', process.env.MONGODB_URI?.substring(0, 30) + '...');
  
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const db = client.db();
  const projects = await db.collection('Projects').countDocuments();
  const withSnapshots = await db.collection('Projects').countDocuments({ 
    'pricingSnapshot.capturedAt': { $ne: null } 
  });
  
  console.log('\n✅ Connected!');
  console.log(`Total projects: ${projects}`);
  console.log(`With snapshots: ${withSnapshots}`);
  console.log(`WITHOUT snapshots: ${projects - withSnapshots}`);
  
  await client.close();
}

quickCheck().catch(console.error);
