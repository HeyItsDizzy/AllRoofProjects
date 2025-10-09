#!/usr/bin/env node

/**
 * Cleanup script to remove invalid user ID: 67980bbbe80fba443dae03af
 * from all project documents in the database
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Import your project model
const Project = require('../config/Project'); // Adjust path if needed

const INVALID_USER_ID = '67980bbbe80fba443dae03af';

async function cleanupInvalidUserReferences() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log(`\n🧹 Starting cleanup of invalid user ID: ${INVALID_USER_ID}`);

    // First, let's see what we're about to clean up
    const projectsWithInvalidUser = await Project.find({
      $or: [
        { linkedUsers: INVALID_USER_ID },
        { linkedEstimators: INVALID_USER_ID },
        { createdBy: INVALID_USER_ID },
        { updatedBy: INVALID_USER_ID }
      ]
    });

    console.log(`📊 Found ${projectsWithInvalidUser.length} projects with invalid user references`);

    if (projectsWithInvalidUser.length === 0) {
      console.log('✅ No cleanup needed - no invalid user references found');
      return;
    }

    // Show what will be cleaned
    console.log('\n📋 Projects that will be updated:');
    projectsWithInvalidUser.forEach((project, index) => {
      const issues = [];
      if (project.linkedUsers?.includes(INVALID_USER_ID)) issues.push('linkedUsers');
      if (project.linkedEstimators?.includes(INVALID_USER_ID)) issues.push('linkedEstimators');
      if (project.createdBy === INVALID_USER_ID) issues.push('createdBy');
      if (project.updatedBy === INVALID_USER_ID) issues.push('updatedBy');
      
      console.log(`${index + 1}. ${project.projectNumber} - Will clean: [${issues.join(', ')}]`);
    });

    // Ask for confirmation (you can comment this out for automatic cleanup)
    console.log('\n⚠️  This will permanently modify your database.');
    console.log('💡 Review the list above and run the script if you want to proceed.');
    console.log('🔄 To proceed automatically, comment out this return statement in the script.');
    
    // UNCOMMENT THE NEXT LINE TO ENABLE AUTOMATIC CLEANUP:
    // return;

    // Perform the cleanup operations
    console.log('\n🧹 Starting cleanup operations...');

    // 1. Remove from linkedUsers arrays
    const linkedUsersResult = await Project.updateMany(
      { linkedUsers: INVALID_USER_ID },
      { $pull: { linkedUsers: INVALID_USER_ID } }
    );
    console.log(`✅ Removed from linkedUsers in ${linkedUsersResult.modifiedCount} projects`);

    // 2. Remove from linkedEstimators arrays
    const linkedEstimatorsResult = await Project.updateMany(
      { linkedEstimators: INVALID_USER_ID },
      { $pull: { linkedEstimators: INVALID_USER_ID } }
    );
    console.log(`✅ Removed from linkedEstimators in ${linkedEstimatorsResult.modifiedCount} projects`);

    // 3. Clear createdBy fields (set to null)
    const createdByResult = await Project.updateMany(
      { createdBy: INVALID_USER_ID },
      { $unset: { createdBy: 1 } }
    );
    console.log(`✅ Cleared createdBy in ${createdByResult.modifiedCount} projects`);

    // 4. Clear updatedBy fields (set to null)
    const updatedByResult = await Project.updateMany(
      { updatedBy: INVALID_USER_ID },
      { $unset: { updatedBy: 1 } }
    );
    console.log(`✅ Cleared updatedBy in ${updatedByResult.modifiedCount} projects`);

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('🔄 You can now refresh your frontend and the 404 errors should be gone.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupInvalidUserReferences();
