/**
 * Database Schema Analysis - Projects Collection
 * Analyzes all fields to see what's being used and what's not
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function analyzeProjects() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 PROJECT SCHEMA ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    const db = client.db();
    const projectsCol = db.collection('Projects');
    
    const totalProjects = await projectsCol.countDocuments();
    console.log(`Total projects: ${totalProjects}\n`);
    
    // Get all projects
    console.log('🔍 Analyzing all fields...\n');
    const projects = await projectsCol.find({}).toArray();
    
    // Collect all unique fields
    const fieldStats = {};
    
    projects.forEach(project => {
      Object.keys(project).forEach(field => {
        if (!fieldStats[field]) {
          fieldStats[field] = {
            count: 0,
            nullCount: 0,
            emptyCount: 0,
            sampleValues: new Set()
          };
        }
        
        const value = project[field];
        fieldStats[field].count++;
        
        if (value === null || value === undefined) {
          fieldStats[field].nullCount++;
        } else if (value === '' || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && Object.keys(value).length === 0)) {
          fieldStats[field].emptyCount++;
        } else {
          // Add sample value (limit to prevent memory issues)
          if (fieldStats[field].sampleValues.size < 5) {
            if (typeof value === 'object') {
              fieldStats[field].sampleValues.add(JSON.stringify(value).substring(0, 100));
            } else {
              fieldStats[field].sampleValues.add(String(value).substring(0, 100));
            }
          }
        }
      });
    });
    
    // Sort fields by usage
    const sortedFields = Object.keys(fieldStats).sort((a, b) => {
      const aUsage = fieldStats[a].count - fieldStats[a].nullCount - fieldStats[a].emptyCount;
      const bUsage = fieldStats[b].count - fieldStats[b].nullCount - fieldStats[b].emptyCount;
      return bUsage - aUsage;
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📈 FIELD USAGE STATISTICS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // High usage fields (>90% populated)
    console.log('✅ HIGHLY USED FIELDS (>90% populated):');
    console.log('───────────────────────────────────────────────────────────');
    sortedFields.forEach(field => {
      const stats = fieldStats[field];
      const populatedCount = stats.count - stats.nullCount - stats.emptyCount;
      const percentage = (populatedCount / totalProjects * 100).toFixed(1);
      
      if (parseFloat(percentage) > 90) {
        console.log(`${field.padEnd(30)} ${populatedCount.toString().padStart(4)}/${totalProjects} (${percentage}%)`);
      }
    });
    
    // Medium usage fields (20-90% populated)
    console.log('\n⚠️  PARTIALLY USED FIELDS (20-90% populated):');
    console.log('───────────────────────────────────────────────────────────');
    sortedFields.forEach(field => {
      const stats = fieldStats[field];
      const populatedCount = stats.count - stats.nullCount - stats.emptyCount;
      const percentage = (populatedCount / totalProjects * 100).toFixed(1);
      
      if (parseFloat(percentage) >= 20 && parseFloat(percentage) <= 90) {
        console.log(`${field.padEnd(30)} ${populatedCount.toString().padStart(4)}/${totalProjects} (${percentage}%)`);
      }
    });
    
    // Low usage fields (<20% populated)
    console.log('\n❌ RARELY USED FIELDS (<20% populated):');
    console.log('───────────────────────────────────────────────────────────');
    sortedFields.forEach(field => {
      const stats = fieldStats[field];
      const populatedCount = stats.count - stats.nullCount - stats.emptyCount;
      const percentage = (populatedCount / totalProjects * 100).toFixed(1);
      
      if (parseFloat(percentage) < 20) {
        console.log(`${field.padEnd(30)} ${populatedCount.toString().padStart(4)}/${totalProjects} (${percentage}%)`);
        if (stats.sampleValues.size > 0) {
          console.log(`   Sample: ${Array.from(stats.sampleValues)[0]}`);
        }
      }
    });
    
    // Never used fields
    console.log('\n🗑️  NEVER USED FIELDS (0% populated):');
    console.log('───────────────────────────────────────────────────────────');
    sortedFields.forEach(field => {
      const stats = fieldStats[field];
      const populatedCount = stats.count - stats.nullCount - stats.emptyCount;
      
      if (populatedCount === 0) {
        console.log(`${field.padEnd(30)} (always null/empty)`);
      }
    });
    
    // Show sample project structure
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📝 SAMPLE PROJECT STRUCTURE');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const sampleProject = projects[0];
    console.log(JSON.stringify(sampleProject, null, 2).substring(0, 2000));
    console.log('\n(truncated for readability)');
    
    // Pricing snapshot analysis
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('💰 PRICING SNAPSHOT ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const withSnapshots = await projectsCol.countDocuments({ 'pricingSnapshot.capturedAt': { $ne: null } });
    const backfilled = await projectsCol.countDocuments({ 'pricingSnapshot.backfilled': true });
    const natural = withSnapshots - backfilled;
    
    console.log(`Total with snapshots: ${withSnapshots}`);
    console.log(`Backfilled: ${backfilled}`);
    console.log(`Natural (sent estimates): ${natural}`);
    
    // Tier distribution
    const elite = await projectsCol.countDocuments({ 'pricingSnapshot.clientPricingTier': 'Elite' });
    const pro = await projectsCol.countDocuments({ 'pricingSnapshot.clientPricingTier': 'Pro' });
    const standard = await projectsCol.countDocuments({ 'pricingSnapshot.clientPricingTier': 'Standard' });
    
    console.log(`\nTier breakdown:`);
    console.log(`  Elite: ${elite}`);
    console.log(`  Pro: ${pro}`);
    console.log(`  Standard: ${standard}`);
    
    // Status analysis
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 STATUS FIELD ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const statusFields = ['status', 'estimateStatus', 'jobBoardStatus', 'projectStatus'];
    
    for (const statusField of statusFields) {
      const statusCounts = await projectsCol.aggregate([
        { $group: { _id: `$${statusField}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();
      
      console.log(`${statusField}:`);
      statusCounts.forEach(s => {
        console.log(`  ${String(s._id || 'null').padEnd(25)} ${s.count}`);
      });
      console.log('');
    }
    
    await client.close();
    console.log('✅ Analysis complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await client.close();
    process.exit(1);
  }
}

analyzeProjects();
