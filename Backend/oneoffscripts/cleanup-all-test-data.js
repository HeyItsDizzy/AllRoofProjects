// cleanup-all-test-data.js - Comprehensive cleanup of test data and orphaned references
require('dotenv').config({ path: '../.env' });
const { ObjectId } = require("mongodb");
const { userCollection, clientCollection, projectsCollection } = require("../db");

async function cleanupAllTestData() {
  console.log('🧹 Starting comprehensive cleanup of test data and orphaned references...');
  console.log('⚠️  WARNING: This will clean up orphaned references and inconsistent data');
  console.log('');
  
  try {
    // Get all collections
    const userCollectionRef = await userCollection();
    const clientCollectionRef = await clientCollection();
    const projectCollectionRef = await projectsCollection();
    
    console.log('📊 Initial database state:');
    const userCount = await userCollectionRef.countDocuments({});
    const clientCount = await clientCollectionRef.countDocuments({});
    const projectCount = await projectCollectionRef.countDocuments({});
    
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Clients: ${clientCount}`);
    console.log(`   - Projects: ${projectCount}`);
    console.log('');
    
    // 1. Clean up orphaned linkedClients in Users
    console.log('🔍 Step 1: Cleaning orphaned linkedClients in Users...');
    const users = await userCollectionRef.find({}).toArray();
    const clients = await clientCollectionRef.find({}, { projection: { _id: 1 } }).toArray();
    const existingClientIds = new Set(clients.map(c => c._id.toString()));
    
    let usersUpdated = 0;
    let orphanedClientRefsRemoved = 0;
    
    for (const user of users) {
      if (user.linkedClients && Array.isArray(user.linkedClients) && user.linkedClients.length > 0) {
        // Normalize client IDs and find valid ones
        const normalizedClients = user.linkedClients.map(clientId => {
          if (typeof clientId === 'object' && clientId.$oid) {
            return clientId.$oid;
          }
          return clientId.toString();
        });
        
        const validClients = normalizedClients.filter(clientId => existingClientIds.has(clientId));
        const orphanedClients = normalizedClients.filter(clientId => !existingClientIds.has(clientId));
        
        if (orphanedClients.length > 0 || validClients.length !== user.linkedClients.length) {
          console.log(`   👤 User "${user.email}": ${orphanedClients.length} orphaned client refs`);
          
          await userCollectionRef.updateOne(
            { _id: user._id },
            { $set: { linkedClients: validClients } }
          );
          
          orphanedClientRefsRemoved += orphanedClients.length;
          usersUpdated++;
        }
      }
    }
    
    console.log(`   ✅ Updated ${usersUpdated} users, removed ${orphanedClientRefsRemoved} orphaned client references`);
    console.log('');
    
    // 2. Clean up orphaned linkedUsers in Clients
    console.log('🔍 Step 2: Cleaning orphaned linkedUsers in Clients...');
    const updatedUsers = await userCollectionRef.find({}, { projection: { _id: 1 } }).toArray();
    const existingUserIds = new Set(updatedUsers.map(u => u._id.toString()));
    
    let clientsUpdated = 0;
    let orphanedUserRefsRemoved = 0;
    
    for (const client of clients) {
      const fullClient = await clientCollectionRef.findOne({ _id: client._id });
      
      if (fullClient.linkedUsers && Array.isArray(fullClient.linkedUsers) && fullClient.linkedUsers.length > 0) {
        // Normalize user IDs and find valid ones
        const normalizedUsers = fullClient.linkedUsers.map(userId => {
          if (typeof userId === 'object' && userId.$oid) {
            return userId.$oid;
          }
          return userId.toString();
        });
        
        const validUsers = normalizedUsers.filter(userId => existingUserIds.has(userId));
        const orphanedUsers = normalizedUsers.filter(userId => !existingUserIds.has(userId));
        
        if (orphanedUsers.length > 0 || validUsers.length !== fullClient.linkedUsers.length) {
          console.log(`   🏢 Client "${fullClient.name}": ${orphanedUsers.length} orphaned user refs`);
          
          await clientCollectionRef.updateOne(
            { _id: fullClient._id },
            { $set: { linkedUsers: validUsers } }
          );
          
          orphanedUserRefsRemoved += orphanedUsers.length;
          clientsUpdated++;
        }
      }
    }
    
    console.log(`   ✅ Updated ${clientsUpdated} clients, removed ${orphanedUserRefsRemoved} orphaned user references`);
    console.log('');
    
    // 3. Clean up orphaned linkedProjects in Clients
    console.log('🔍 Step 3: Cleaning orphaned linkedProjects in Clients...');
    const projects = await projectCollectionRef.find({}, { projection: { _id: 1 } }).toArray();
    const existingProjectIds = new Set(projects.map(p => p._id.toString()));
    
    let clientsUpdatedProjects = 0;
    let orphanedProjectRefsRemoved = 0;
    
    const allClients = await clientCollectionRef.find({}).toArray();
    
    for (const client of allClients) {
      if (client.linkedProjects && Array.isArray(client.linkedProjects) && client.linkedProjects.length > 0) {
        // Normalize project IDs and find valid ones
        const normalizedProjects = client.linkedProjects.map(projectId => {
          if (typeof projectId === 'object' && projectId.$oid) {
            return projectId.$oid;
          }
          return projectId.toString();
        });
        
        const validProjects = normalizedProjects.filter(projectId => existingProjectIds.has(projectId));
        const orphanedProjects = normalizedProjects.filter(projectId => !existingProjectIds.has(projectId));
        
        if (orphanedProjects.length > 0 || validProjects.length !== client.linkedProjects.length) {
          console.log(`   🏢 Client "${client.name}": ${orphanedProjects.length} orphaned project refs`);
          
          await clientCollectionRef.updateOne(
            { _id: client._id },
            { $set: { linkedProjects: validProjects } }
          );
          
          orphanedProjectRefsRemoved += orphanedProjects.length;
          clientsUpdatedProjects++;
        }
      }
    }
    
    console.log(`   ✅ Updated ${clientsUpdatedProjects} clients, removed ${orphanedProjectRefsRemoved} orphaned project references`);
    console.log('');
    
    // 4. Clean up orphaned linkedProjects in Users
    console.log('🔍 Step 4: Cleaning orphaned linkedProjects in Users...');
    let usersUpdatedProjects = 0;
    let orphanedUserProjectRefsRemoved = 0;
    
    const allUsers = await userCollectionRef.find({}).toArray();
    
    for (const user of allUsers) {
      if (user.linkedProjects && Array.isArray(user.linkedProjects) && user.linkedProjects.length > 0) {
        // Normalize project IDs and find valid ones
        const normalizedProjects = user.linkedProjects.map(projectId => {
          if (typeof projectId === 'object' && projectId.$oid) {
            return projectId.$oid;
          }
          return projectId.toString();
        });
        
        const validProjects = normalizedProjects.filter(projectId => existingProjectIds.has(projectId));
        const orphanedProjects = normalizedProjects.filter(projectId => !existingProjectIds.has(projectId));
        
        if (orphanedProjects.length > 0 || validProjects.length !== user.linkedProjects.length) {
          console.log(`   👤 User "${user.email}": ${orphanedProjects.length} orphaned project refs`);
          
          await userCollectionRef.updateOne(
            { _id: user._id },
            { $set: { linkedProjects: validProjects } }
          );
          
          orphanedUserProjectRefsRemoved += orphanedProjects.length;
          usersUpdatedProjects++;
        }
      }
    }
    
    console.log(`   ✅ Updated ${usersUpdatedProjects} users, removed ${orphanedUserProjectRefsRemoved} orphaned project references`);
    console.log('');
    
    // 5. Clean up empty/null fields
    console.log('🔍 Step 5: Cleaning empty and null fields...');
    
    // Clean users with empty linkedClients arrays
    const emptyUserClients = await userCollectionRef.updateMany(
      { linkedClients: { $in: [[], null] } },
      { $unset: { linkedClients: "" } }
    );
    
    // Clean users with empty linkedProjects arrays
    const emptyUserProjects = await userCollectionRef.updateMany(
      { linkedProjects: { $in: [[], null] } },
      { $unset: { linkedProjects: "" } }
    );
    
    // Clean clients with empty linkedUsers arrays
    const emptyClientUsers = await clientCollectionRef.updateMany(
      { linkedUsers: { $in: [[], null] } },
      { $unset: { linkedUsers: "" } }
    );
    
    // Clean clients with empty linkedProjects arrays
    const emptyClientProjects = await clientCollectionRef.updateMany(
      { linkedProjects: { $in: [[], null] } },
      { $unset: { linkedProjects: "" } }
    );
    
    console.log(`   ✅ Cleaned empty arrays:`);
    console.log(`      - User linkedClients: ${emptyUserClients.modifiedCount}`);
    console.log(`      - User linkedProjects: ${emptyUserProjects.modifiedCount}`);
    console.log(`      - Client linkedUsers: ${emptyClientUsers.modifiedCount}`);
    console.log(`      - Client linkedProjects: ${emptyClientProjects.modifiedCount}`);
    console.log('');
    
    // 6. Ensure data consistency
    console.log('🔍 Step 6: Ensuring data consistency...');
    
    // Update user.company field to match their linked client name
    let companyFieldUpdated = 0;
    const usersWithClients = await userCollectionRef.find({ linkedClients: { $exists: true, $ne: [] } }).toArray();
    
    for (const user of usersWithClients) {
      if (user.linkedClients && user.linkedClients.length > 0) {
        const clientId = user.linkedClients[0];
        const client = await clientCollectionRef.findOne({ _id: new ObjectId(clientId) });
        
        if (client && user.company !== client.name) {
          await userCollectionRef.updateOne(
            { _id: user._id },
            { $set: { company: client.name } }
          );
          companyFieldUpdated++;
          console.log(`   👤 Updated company field for "${user.email}": "${client.name}"`);
        }
      }
    }
    
    console.log(`   ✅ Updated company field for ${companyFieldUpdated} users`);
    console.log('');
    
    // Final summary
    console.log('📊 Final database state:');
    const finalUserCount = await userCollectionRef.countDocuments({});
    const finalClientCount = await clientCollectionRef.countDocuments({});
    const finalProjectCount = await projectCollectionRef.countDocuments({});
    
    console.log(`   - Users: ${finalUserCount}`);
    console.log(`   - Clients: ${finalClientCount}`);
    console.log(`   - Projects: ${finalProjectCount}`);
    console.log('');
    
    console.log('🎉 Comprehensive cleanup completed!');
    console.log('📋 Summary of changes:');
    console.log(`   - Users updated: ${usersUpdated + usersUpdatedProjects + companyFieldUpdated}`);
    console.log(`   - Clients updated: ${clientsUpdated + clientsUpdatedProjects}`);
    console.log(`   - Orphaned references removed: ${orphanedClientRefsRemoved + orphanedUserRefsRemoved + orphanedProjectRefsRemoved + orphanedUserProjectRefsRemoved}`);
    console.log(`   - Empty arrays cleaned: ${emptyUserClients.modifiedCount + emptyUserProjects.modifiedCount + emptyClientUsers.modifiedCount + emptyClientProjects.modifiedCount}`);
    console.log(`   - Company fields updated: ${companyFieldUpdated}`);
    console.log('');
    console.log('✅ Database is now clean and consistent!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupAllTestData();
cleanupAllTestData().catch(console.error);
