/**
 * MIGRATION: Convert Pricing Snapshot Int32 fields to Double
 * 
 * Problem: Some pricing snapshot fields were stored as Int32 instead of Double
 * This prevents editing decimal values (e.g., 52.5) in MongoDB Compass
 * 
 * Solution: Convert all Int32 fields to Double, preserving decimal precision
 * 
 * Run: node migrations/convert-pricing-snapshot-to-double.js
 */

const { MongoClient, Double } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ART';

async function convertPricingSnapshotToDouble() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    console.log(`📁 Using database: ${db.databaseName}`);
    
    const projectsCollection = db.collection('Projects');  // Uppercase P
    
    // Debug: Check total projects
    const totalProjects = await projectsCollection.countDocuments();
    console.log(`📊 Total projects in database: ${totalProjects}`);
    
    // Debug: Show sample project structure
    const sampleProject = await projectsCollection.findOne({});
    if (sampleProject) {
      console.log(`📋 Sample project has pricingSnapshot: ${!!sampleProject.pricingSnapshot}`);
      if (sampleProject.pricingSnapshot) {
        console.log(`   capturedAt exists: ${!!sampleProject.pricingSnapshot.capturedAt}`);
      }
    }
    
    // Find all projects with pricing snapshots
    const projectsWithSnapshots = await projectsCollection.find({
      'pricingSnapshot.capturedAt': { $exists: true }
    }).toArray();
    
    console.log(`📊 Found ${projectsWithSnapshots.length} projects with pricing snapshots`);
    
    let converted = 0;
    let alreadyDouble = 0;
    let errors = 0;
    
    for (const project of projectsWithSnapshots) {
      try {
        const snapshot = project.pricingSnapshot;
        const updates = {};
        let needsUpdate = false;
        
        // Fields that should be Double
        const fieldsToConvert = [
          'priceEach',
          'totalPrice', 
          'discountAmount',
          'totalDiscountAmount',
          'priceMultiplier',
          'exchangeRate'
        ];
        
        for (const field of fieldsToConvert) {
          const value = snapshot[field];
          
          // Skip if field doesn't exist or is null
          if (value === null || value === undefined) continue;
          
          // Check if value is a number
          if (typeof value === 'number') {
            // Explicitly convert to BSON Double type
            updates[`pricingSnapshot.${field}`] = new Double(value);
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          await projectsCollection.updateOne(
            { _id: project._id },
            { $set: updates }
          );
          converted++;
          
          if (converted % 10 === 0) {
            console.log(`   Converted ${converted} projects...`);
          }
        } else {
          alreadyDouble++;
        }
        
      } catch (error) {
        console.error(`❌ Error converting project ${project.projectNumber}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ MIGRATION COMPLETE');
    console.log('═'.repeat(60));
    console.log(`📊 Total projects processed: ${projectsWithSnapshots.length}`);
    console.log(`✅ Converted to Double: ${converted}`);
    console.log(`ℹ️  Already Double: ${alreadyDouble}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('═'.repeat(60));
    
    // Show sample of converted values
    if (converted > 0) {
      console.log('\n📋 Sample Converted Values:');
      const sample = await projectsCollection.findOne({
        'pricingSnapshot.capturedAt': { $exists: true }
      });
      
      if (sample?.pricingSnapshot) {
        console.log(`   Project: ${sample.projectNumber}`);
        console.log(`   priceEach: ${sample.pricingSnapshot.priceEach}`);
        console.log(`   totalPrice: ${sample.pricingSnapshot.totalPrice}`);
        console.log(`   priceMultiplier: ${sample.pricingSnapshot.priceMultiplier}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration if called directly
if (require.main === module) {
  convertPricingSnapshotToDouble()
    .then(() => {
      console.log('\n✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { convertPricingSnapshotToDouble };
