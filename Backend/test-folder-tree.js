/**
 * Simple test script to verify folder-tree functionality
 * Run this to test the buildFolderTreeFromDisk function directly
 */

const { ObjectId } = require("mongodb");
const { buildFolderTreeFromDisk } = require("./features/fileManager/services/syncService");
const { projectsCollection } = require("./db");

async function testFolderTree() {
  console.log("🧪 Starting folder-tree functionality test...");
  
  try {
    // Connect to database
    const collection = await projectsCollection();
    
    // Get a sample project (first one available)
    const sampleProject = await collection.findOne({});
    
    if (!sampleProject) {
      console.log("❌ No projects found in database. Please create a project first.");
      return;
    }
    
    console.log(`✅ Found sample project: ${sampleProject.name} (ID: ${sampleProject._id})`);
    
    // Test buildFolderTreeFromDisk function
    console.log("🔨 Testing buildFolderTreeFromDisk function...");
    const folderTree = await buildFolderTreeFromDisk(sampleProject._id.toString());
    
    console.log("✅ Folder tree built successfully!");
    console.log("🧱 Tree structure:", JSON.stringify(folderTree, null, 2));
    
    // Count folders and files
    const folderCount = Object.keys(folderTree).filter(key => key !== '__files').length;
    const fileCount = folderTree.__files ? folderTree.__files.length : 0;
    
    console.log(`📊 Summary: ${folderCount} folders, ${fileCount} files`);
    
  } catch (err) {
    console.error("🔥 Test failed:", err);
    console.error("🔥 Error stack:", err.stack);
  }
  
  console.log("🧪 Test completed.");
  process.exit(0);
}

// Run test
testFolderTree();