// cleanup-client-linkedusers.js - Clean up orphaned users and convert linkedUsers to strings
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { ObjectId } = require("mongodb");
const { userCollection, clientCollection, connectDB } = require("../db");

async function cleanupClientLinkedUsers() {
  console.log('🧹 Starting cleanup of client linkedUsers references...');
  
  try {
    // Ensure database connection
    await connectDB();
    console.log('✅ Database connected successfully');
    
    // Get all clients
    const clientCollectionRef = await clientCollection();
    const clients = await clientCollectionRef.find({}).toArray();
    
    // Get all existing users
    const userCollectionRef = await userCollection();
    const users = await userCollectionRef.find({}, { projection: { _id: 1 } }).toArray();
    const existingUserIds = new Set(users.map(u => u._id.toString()));
    
    console.log(`📊 Found ${clients.length} clients and ${users.length} existing users`);
    
    let totalOrphanedUsers = 0;
    let clientsUpdated = 0;
    
    for (const client of clients) {
      if (client.linkedUsers && Array.isArray(client.linkedUsers) && client.linkedUsers.length > 0) {
        
        // Normalize user IDs to strings and find orphaned ones
        const normalizedUsers = client.linkedUsers.map(userId => {
          // Convert ObjectId format {$oid: "..."} to string
          if (typeof userId === 'object' && userId.$oid) {
            return userId.$oid;
          }
          return userId.toString();
        });
        
        // Find orphaned user references
        const orphanedUsers = normalizedUsers.filter(userId => {
          return !existingUserIds.has(userId);
        });
        
        // Find valid users in normalized format
        const validUsers = normalizedUsers.filter(userId => {
          return existingUserIds.has(userId);
        });
        
        // Check if we need to update (orphaned users OR format inconsistency)
        const needsUpdate = orphanedUsers.length > 0 || 
                           client.linkedUsers.length !== validUsers.length ||
                           client.linkedUsers.some(userId => typeof userId === 'object' && userId.$oid);
        
        if (needsUpdate) {
          console.log(`🔍 Client "${client.name}":`);
          
          if (orphanedUsers.length > 0) {
            console.log(`   - ${orphanedUsers.length} orphaned users found`);
            orphanedUsers.forEach(id => console.log(`     • ${id}`));
          }
          
          // Check for ObjectId format conversion
          const objectIdFormats = client.linkedUsers.filter(userId => typeof userId === 'object' && userId.$oid);
          if (objectIdFormats.length > 0) {
            console.log(`   - Converting ${objectIdFormats.length} ObjectId formats to strings`);
            objectIdFormats.forEach(userId => console.log(`     • {$oid: "${userId.$oid}"} → "${userId.$oid}"`));
          }
          
          console.log(`   - Final result: ${client.linkedUsers.length} → ${validUsers.length} valid users`);
          
          // Update with normalized, valid user IDs only (as strings)
          await clientCollectionRef.updateOne(
            { _id: client._id },
            { $set: { linkedUsers: validUsers } }
          );
          
          totalOrphanedUsers += orphanedUsers.length;
          clientsUpdated++;
          console.log(`✅ Updated "${client.name}" - removed ${orphanedUsers.length} orphaned, converted to strings`);
        } else {
          console.log(`✓ Client "${client.name}" - already clean (${validUsers.length} valid users)`);
        }
      } else {
        console.log(`✓ Client "${client.name}" - no linkedUsers to process`);
      }
    }
    
    console.log(`\n🎉 Cleanup completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Clients processed: ${clients.length}`);
    console.log(`   - Clients updated: ${clientsUpdated}`);
    console.log(`   - Total orphaned user references removed: ${totalOrphanedUsers}`);
    console.log(`   - All linkedUsers are now in string format`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    console.log('🔚 Cleanup process finished');
    process.exit(0);
  }
}

// Run the cleanup
cleanupClientLinkedUsers();
