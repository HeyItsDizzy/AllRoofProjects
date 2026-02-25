// oneoffscripts/test-client-delete.js
// Test script to verify client deletion works properly
// Run with: node oneoffscripts/test-client-delete.js

const mongoose = require('mongoose');
const Client = require('../config/Client');
const User = require('../config/User');
const { projectsCollection } = require('../db');

// Test function to check for orphaned references
async function checkOrphanedReferences(clientId) {
  try {
    console.log(`🔍 Checking for orphaned references to client ID: ${clientId}`);
    
    // Check projects
    const projectCollectionRef = await projectsCollection();
    const projectsWithClient = await projectCollectionRef.find({ 
      linkedClients: { $in: [clientId, new mongoose.Types.ObjectId(clientId)] }
    }).toArray();
    
    // Check users - linkedClients
    const usersWithLinkedClient = await User.find({ 
      linkedClients: { $in: [clientId, new mongoose.Types.ObjectId(clientId)] }
    });
    
    // Check users - company field (if we know the company name)
    const client = await Client.findById(clientId);
    let usersWithCompanyName = [];
    if (client) {
      usersWithCompanyName = await User.find({ company: client.name });
    }
    
    console.log(`📊 Orphaned References Report:
      - Projects with this client: ${projectsWithClient.length}
      - Users with this client in linkedClients: ${usersWithLinkedClient.length}
      - Users with matching company name: ${usersWithCompanyName.length}
    `);
    
    if (projectsWithClient.length > 0) {
      console.log(`❌ Found ${projectsWithClient.length} projects with orphaned client references`);
      projectsWithClient.forEach(project => {
        console.log(`   - Project ${project._id}: ${project.name || 'Unknown'}`);
      });
    }
    
    if (usersWithLinkedClient.length > 0) {
      console.log(`❌ Found ${usersWithLinkedClient.length} users with orphaned linkedClients references`);
      usersWithLinkedClient.forEach(user => {
        console.log(`   - User ${user._id}: ${user.name || user.email}`);
      });
    }
    
    if (usersWithCompanyName.length > 0) {
      console.log(`❌ Found ${usersWithCompanyName.length} users with orphaned company field`);
      usersWithCompanyName.forEach(user => {
        console.log(`   - User ${user._id}: ${user.name || user.email} (company: ${user.company})`);
      });
    }
    
    const totalOrphans = projectsWithClient.length + usersWithLinkedClient.length + usersWithCompanyName.length;
    
    if (totalOrphans === 0) {
      console.log(`✅ No orphaned references found! Client deletion was successful.`);
    } else {
      console.log(`⚠️  Found ${totalOrphans} total orphaned references that need cleanup.`);
    }
    
    return totalOrphans;
    
  } catch (error) {
    console.error('❌ Error checking orphaned references:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = { checkOrphanedReferences };

// If run directly, provide usage instructions
if (require.main === module) {
  console.log(`
    🧪 Client Delete Test Script
    
    Usage:
    1. First make sure MongoDB is connected
    2. Run: node oneoffscripts/test-client-delete.js [clientId]
    3. Or import and use checkOrphanedReferences(clientId) function
    
    This script will check for orphaned references after a client deletion.
    Pass a client ID to check, or it will show usage instructions.
  `);
  
  const clientId = process.argv[2];
  if (clientId) {
    // Connect to MongoDB and run test
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db')
      .then(() => {
        console.log('📡 Connected to MongoDB');
        return checkOrphanedReferences(clientId);
      })
      .then((orphanCount) => {
        console.log(`🏁 Test completed. Found ${orphanCount} orphaned references.`);
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
      });
  }
}