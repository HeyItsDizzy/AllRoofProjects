/**
 * QUICK SCRIPT: Copy Pricing Snapshot Between Projects
 * 
 * Usage: node migrations/copy-pricing-snapshot.js
 */

const { MongoClient, Double } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const SOURCE_PROJECT = '26-02013';
const TARGET_PROJECT = '26-02014';

async function copyPricingSnapshot() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const projectsCollection = db.collection('Projects');
    
    // Find source project
    const sourceProject = await projectsCollection.findOne({ projectNumber: SOURCE_PROJECT });
    if (!sourceProject) {
      console.error(`❌ Source project ${SOURCE_PROJECT} not found`);
      return;
    }
    
    if (!sourceProject.pricingSnapshot) {
      console.error(`❌ Source project ${SOURCE_PROJECT} has no pricing snapshot`);
      return;
    }
    
    console.log(`📸 Found pricing snapshot in ${SOURCE_PROJECT}:`);
    console.log(JSON.stringify(sourceProject.pricingSnapshot, null, 2));
    
    // Find target project
    const targetProject = await projectsCollection.findOne({ projectNumber: TARGET_PROJECT });
    if (!targetProject) {
      console.error(`❌ Target project ${TARGET_PROJECT} not found`);
      return;
    }
    
    // Copy the pricing snapshot
    const result = await projectsCollection.updateOne(
      { projectNumber: TARGET_PROJECT },
      { $set: { pricingSnapshot: sourceProject.pricingSnapshot } }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`\n✅ Successfully copied pricing snapshot from ${SOURCE_PROJECT} to ${TARGET_PROJECT}`);
    } else {
      console.log(`⚠️ No changes made (snapshot may already be identical)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run
copyPricingSnapshot()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
