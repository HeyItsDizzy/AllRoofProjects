// cleanup-orphaned-projects.js - Remove orphaned project references from clients
require('dotenv').config();
const { ObjectId } = require("mongodb");
const { projectsCollection, clientCollection } = require("../db");

async function cleanupOrphanedProjects() {
  console.log('🧹 Starting cleanup of orphaned project references...');
  
  try {
    // Get all clients
    const clientCollectionRef = await clientCollection();
    const clients = await clientCollectionRef.find({}).toArray();
    
    // Get all existing projects
    const projectCollectionRef = await projectsCollection();
    const projects = await projectCollectionRef.find({}, { projection: { _id: 1 } }).toArray();
    const existingProjectIds = new Set(projects.map(p => p._id.toString()));
    
    console.log(`📊 Found ${clients.length} clients and ${projects.length} existing projects`);
    
    let totalOrphaned = 0;
    let clientsUpdated = 0;
    
    for (const client of clients) {
      if (client.linkedProjects && Array.isArray(client.linkedProjects) && client.linkedProjects.length > 0) {
        
        // Normalize project IDs to strings and find orphaned ones
        const normalizedProjects = client.linkedProjects.map(projectId => {
          // Convert ObjectId format to string
          if (typeof projectId === 'object' && projectId.$oid) {
            return projectId.$oid;
          }
          return projectId.toString();
        });
        
        // Find orphaned project references
        const orphanedProjects = normalizedProjects.filter(projectId => {
          return !existingProjectIds.has(projectId);
        });
        
        // Find valid projects in normalized format
        const validProjects = normalizedProjects.filter(projectId => {
          return existingProjectIds.has(projectId);
        });
        
        // Check if we need to update (orphaned projects OR format inconsistency)
        const needsUpdate = orphanedProjects.length > 0 || 
                           client.linkedProjects.length !== validProjects.length ||
                           JSON.stringify(client.linkedProjects) !== JSON.stringify(validProjects);
        
        if (needsUpdate) {
          console.log(`🔍 Client "${client.name}":`);
          if (orphanedProjects.length > 0) {
            console.log(`   - ${orphanedProjects.length} orphaned projects found`);
            orphanedProjects.forEach(id => console.log(`     • ${id}`));
          }
          console.log(`   - Normalizing format (${client.linkedProjects.length} → ${validProjects.length} entries)`);
          
          // Update with normalized, valid project IDs only
          await clientCollectionRef.updateOne(
            { _id: client._id },
            { $set: { linkedProjects: validProjects } }
          );
          
          totalOrphaned += orphanedProjects.length;
          clientsUpdated++;
          console.log(`✅ Updated "${client.name}" - removed ${orphanedProjects.length} orphaned, normalized format`);
        }
      }
    }
    
    console.log(`\n🎉 Cleanup completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Clients updated: ${clientsUpdated}`);
    console.log(`   - Total orphaned references removed: ${totalOrphaned}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanupOrphanedProjects();
