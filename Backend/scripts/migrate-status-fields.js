/**
 * Status Field Migration & Schema Cleanup
 * 
 * CONFIRMED CURRENT SYSTEM (Feb 2026):
 * - status (CURRENT) - Project table display
 * - estimateStatus (CURRENT) - Job Board display
 * 
 * Cleanup Plan:
 * 1. Change all estimateStatus: "(Null)" to "Sent"
 * 2. Delete 9 unused/legacy fields:
 *    - linkedUsers (0% populated, always empty)
 *    - jobBoardStatus (legacy status field)
 *    - Status (capital S - 2.4% typo duplicate)
 *    - estimateSentDate (0.2% - superseded by estimateSent array)
 *    - jobBoardData (3.8% - old structure)
 *    - projectStatus (legacy status field)
 *    - readOnlyToken (abandoned feature - share without login)
 *    - readOnlyTokenCreatedAt (abandoned feature)
 *    - readOnlyTokenExpiresAt (abandoned feature)
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function migrateStatusFields() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 STATUS FIELD CLEANUP & SCHEMA CLEANUP');
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    const db = client.db();
    const projectsCol = db.collection('Projects');
    
    // Analyze current state
    console.log('📊 Analyzing current state...\n');
    
    const total = await projectsCol.countDocuments();
    const hasStatus = await projectsCol.countDocuments({ status: { $ne: null } });
    const hasEstimateStatus = await projectsCol.countDocuments({ estimateStatus: { $ne: null } });
    
    // Legacy/unused fields to delete
    const hasProjectStatus = await projectsCol.countDocuments({ projectStatus: { $exists: true } });
    const hasJobBoardStatus = await projectsCol.countDocuments({ jobBoardStatus: { $exists: true } });
    const hasLinkedUsers = await projectsCol.countDocuments({ linkedUsers: { $exists: true } });
    const hasStatusCapital = await projectsCol.countDocuments({ Status: { $exists: true } });
    const hasEstimateSentDate = await projectsCol.countDocuments({ estimateSentDate: { $exists: true } });
    const hasJobBoardData = await projectsCol.countDocuments({ jobBoardData: { $exists: true } });
    const hasReadOnlyToken = await projectsCol.countDocuments({ readOnlyToken: { $exists: true } });
    const hasReadOnlyTokenCreatedAt = await projectsCol.countDocuments({ readOnlyTokenCreatedAt: { $exists: true } });
    const hasReadOnlyTokenExpiresAt = await projectsCol.countDocuments({ readOnlyTokenExpiresAt: { $exists: true } });
    
    // Check for (Null) placeholders
    const estimateStatusNull = await projectsCol.countDocuments({ estimateStatus: "(Null)" });
    
    console.log('CURRENT STATE:');
    console.log(`  Total projects: ${total}\n`);
    console.log('CURRENT FIELDS (KEEP):');
    console.log(`  status (Project table): ${hasStatus} (${(hasStatus/total*100).toFixed(1)}%)`);
    console.log(`  estimateStatus (Job Board): ${hasEstimateStatus} (${(hasEstimateStatus/total*100).toFixed(1)}%)`);
    console.log(`    - estimateStatus = "(Null)": ${estimateStatusNull}\n`);
    console.log('LEGACY/UNUSED FIELDS (DELETE):');
    console.log(`  projectStatus: ${hasProjectStatus}`);
    console.log(`  jobBoardStatus: ${hasJobBoardStatus}`);
    console.log(`  linkedUsers: ${hasLinkedUsers}`);
    console.log(`  Status (capital S): ${hasStatusCapital}`);
    console.log(`  estimateSentDate: ${hasEstimateSentDate}`);
    console.log(`  jobBoardData: ${hasJobBoardData}`);
    console.log(`  readOnlyToken: ${hasReadOnlyToken}`);
    console.log(`  readOnlyTokenCreatedAt: ${hasReadOnlyTokenCreatedAt}`);
    console.log(`  readOnlyTokenExpiresAt: ${hasReadOnlyTokenExpiresAt}\n`);
    
    if (estimateStatusNull === 0 && hasProjectStatus === 0 && hasJobBoardStatus === 0 && 
        hasLinkedUsers === 0 && hasStatusCapital === 0 && hasEstimateSentDate === 0 && 
        hasJobBoardData === 0 && hasReadOnlyToken === 0 && hasReadOnlyTokenCreatedAt === 0 && 
        hasReadOnlyTokenExpiresAt === 0) {
      console.log('✅ All cleanup already complete!');
      console.log('   No migration needed.\n');
      await client.close();
      process.exit(0);
    }
    
    console.log('MIGRATION PLAN:');
    console.log(`  1. Change ${estimateStatusNull} estimateStatus "(Null)" values to "Sent"`);
    console.log(`  2. Delete 9 unused/legacy fields from all projects:\n`);
    console.log('     - linkedUsers (always empty)');
    console.log('     - jobBoardStatus (legacy status)');
    console.log('     - Status (typo duplicate)');
    console.log('     - estimateSentDate (superseded)');
    console.log('     - jobBoardData (old structure)');
    console.log('     - projectStatus (legacy status)');
    console.log('     - readOnlyToken (abandoned feature)');
    console.log('     - readOnlyTokenCreatedAt (abandoned feature)');
    console.log('     - readOnlyTokenExpiresAt (abandoned feature)\n');
    
    // Confirm migration
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('⚠️  Proceed with cleanup? (yes/no): ', resolve);
    });
    readline.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Migration cancelled');
      await client.close();
      process.exit(0);
    }
    
    console.log('\n🔄 Starting cleanup...\n');
    
    let nullsFixed = 0;
    let legacyFieldsRemoved = 0;
    
    // Step 1: Change all estimateStatus: "(Null)" to "Sent"
    const nullProjects = await projectsCol.find({ estimateStatus: "(Null)" }).toArray();
    
    for (const project of nullProjects) {
      await projectsCol.updateOne(
        { _id: project._id },
        { $set: { estimateStatus: "Sent" } }
      );
      nullsFixed++;
      
      if (nullsFixed % 50 === 0) {
        console.log(`   Fixed ${nullsFixed} "(Null)" values...`);
      }
    }
    
    if (nullsFixed > 0) {
      console.log(`✅ Changed ${nullsFixed} estimateStatus from "(Null)" to "Sent"\n`);
    }
    
    // Step 2: Delete 9 unused/legacy fields
    const result = await projectsCol.updateMany(
      {},
      { 
        $unset: { 
          linkedUsers: "",
          jobBoardStatus: "",
          Status: "",
          estimateSentDate: "",
          jobBoardData: "",
          projectStatus: "",
          readOnlyToken: "",
          readOnlyTokenCreatedAt: "",
          readOnlyTokenExpiresAt: ""
        } 
      }
    );
    
    legacyFieldsRemoved = result.modifiedCount;
    console.log(`✅ Removed 9 unused/legacy fields from ${legacyFieldsRemoved} projects\n`);
    
    console.log('\n✅ CLEANUP COMPLETE!\n');
    
    // Verify results
    console.log('📊 CLEANUP RESULTS:');
    console.log(`  estimateStatus "(Null)" values fixed: ${nullsFixed}`);
    console.log(`  Projects cleaned: ${legacyFieldsRemoved}\n`);
    
    const finalStatus = await projectsCol.countDocuments({ status: { $ne: null } });
    const finalEstimateStatus = await projectsCol.countDocuments({ estimateStatus: { $ne: null } });
    
    // Verify deletions
    const finalProjectStatus = await projectsCol.countDocuments({ projectStatus: { $exists: true } });
    const finalJobBoardStatus = await projectsCol.countDocuments({ jobBoardStatus: { $exists: true } });
    const finalLinkedUsers = await projectsCol.countDocuments({ linkedUsers: { $exists: true } });
    const finalStatusCapital = await projectsCol.countDocuments({ Status: { $exists: true } });
    const finalEstimateSentDate = await projectsCol.countDocuments({ estimateSentDate: { $exists: true } });
    const finalJobBoardData = await projectsCol.countDocuments({ jobBoardData: { $exists: true } });
    const finalReadOnlyToken = await projectsCol.countDocuments({ readOnlyToken: { $exists: true } });
    const finalReadOnlyTokenCreatedAt = await projectsCol.countDocuments({ readOnlyTokenCreatedAt: { $exists: true } });
    const finalReadOnlyTokenExpiresAt = await projectsCol.countDocuments({ readOnlyTokenExpiresAt: { $exists: true } });
    
    console.log('FINAL STATE:');
    console.log(`  Total projects: ${total}\n`);
    console.log('CURRENT FIELDS:');
    console.log(`  status: ${finalStatus} (${(finalStatus/total*100).toFixed(1)}%)`);
    console.log(`  estimateStatus: ${finalEstimateStatus} (${(finalEstimateStatus/total*100).toFixed(1)}%)\n`);
    console.log('DELETED FIELDS (should all be 0):');
    console.log(`  projectStatus: ${finalProjectStatus}`);
    console.log(`  jobBoardStatus: ${finalJobBoardStatus}`);
    console.log(`  linkedUsers: ${finalLinkedUsers}`);
    console.log(`  Status: ${finalStatusCapital}`);
    console.log(`  estimateSentDate: ${finalEstimateSentDate}`);
    console.log(`  jobBoardData: ${finalJobBoardData}`);
    console.log(`  readOnlyToken: ${finalReadOnlyToken}`);
    console.log(`  readOnlyTokenCreatedAt: ${finalReadOnlyTokenCreatedAt}`);
    console.log(`  readOnlyTokenExpiresAt: ${finalReadOnlyTokenExpiresAt}\n`);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ SCHEMA CLEANUP COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ CURRENT FIELDS: status, estimateStatus');
    console.log('✅ DELETED: 9 legacy/unused fields removed');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    await client.close();
    console.log('✅ Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    await client.close();
    process.exit(1);
  }
}

migrateStatusFields();
