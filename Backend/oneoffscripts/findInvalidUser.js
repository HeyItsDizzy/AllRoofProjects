#!/usr/bin/env node

/**
 * Search for projects containing invalid user ID: 67980bbbe80fba443dae03af
 * This script will help identify which projects have this dead user reference
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Import your project model
const Project = require('../config/Project'); // Adjust path if needed

const INVALID_USER_ID = '67980bbbe80fba443dae03af';

async function findProjectsWithInvalidUser() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log(`\n🔍 Searching for projects with invalid user ID: ${INVALID_USER_ID}`);
    
    // Search for projects that contain this user ID in linkedUsers array
    const projectsWithInvalidUser = await Project.find({
      linkedUsers: INVALID_USER_ID
    });

    console.log(`\n📊 Found ${projectsWithInvalidUser.length} projects with invalid user ID:`);
    
    if (projectsWithInvalidUser.length > 0) {
      console.log('\n📋 Projects containing invalid user:');
      projectsWithInvalidUser.forEach((project, index) => {
        console.log(`${index + 1}. Project: ${project.projectNumber}`);
        console.log(`   Name: ${project.name}`);
        console.log(`   ID: ${project._id}`);
        console.log(`   Linked Users: ${project.linkedUsers}`);
        console.log(`   Created: ${project.createdAt || 'Unknown'}`);
        console.log('   ---');
      });

      console.log('\n🛠️  To fix this, you can:');
      console.log('1. Run the cleanup script to remove invalid user references');
      console.log('2. Manually update each project to remove the invalid user ID');
    } else {
      console.log('✅ No projects found with this invalid user ID');
    }

    // Also search for any other patterns that might contain this ID
    console.log(`\n🔍 Searching for other references to this user ID...`);
    
    const allProjectsWithUser = await Project.find({
      $or: [
        { linkedUsers: INVALID_USER_ID },
        { linkedEstimators: INVALID_USER_ID },
        { createdBy: INVALID_USER_ID },
        { updatedBy: INVALID_USER_ID }
      ]
    });

    console.log(`📊 Total projects with any reference to this user: ${allProjectsWithUser.length}`);
    
    if (allProjectsWithUser.length > 0) {
      console.log('\n📋 All references found:');
      allProjectsWithUser.forEach((project, index) => {
        const references = [];
        if (project.linkedUsers?.includes(INVALID_USER_ID)) references.push('linkedUsers');
        if (project.linkedEstimators?.includes(INVALID_USER_ID)) references.push('linkedEstimators');
        if (project.createdBy === INVALID_USER_ID) references.push('createdBy');
        if (project.updatedBy === INVALID_USER_ID) references.push('updatedBy');
        
        console.log(`${index + 1}. ${project.projectNumber} - References: [${references.join(', ')}]`);
      });
    }

  } catch (error) {
    console.error('❌ Error searching database:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the search
findProjectsWithInvalidUser();
