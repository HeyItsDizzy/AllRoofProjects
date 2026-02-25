/**
 * Comprehensive File Manager Test
 * Tests all the endpoints we've implemented for file manager functionality
 */

const express = require('express');
const { ObjectId } = require('mongodb');
const { projectsCollection } = require('./db');

// Test app setup
const app = express();
app.use(express.json());

// Import our fixed file routes
const fileRoutes = require('./features/fileManager/routes/fileRoutes');
app.use('/api/files', fileRoutes);

const PORT = 5999; // Use different port for testing

async function runTests() {
  console.log("🧪 Starting File Manager API Tests...\n");
  
  try {
    // Start test server
    const server = app.listen(PORT, () => {
      console.log(`✅ Test server running on http://localhost:${PORT}`);
    });
    
    // Get a sample project
    const collection = await projectsCollection();
    const sampleProject = await collection.findOne({});
    
    if (!sampleProject) {
      console.log("❌ No projects found. Please create a project first.");
      server.close();
      return;
    }
    
    const projectId = sampleProject._id.toString();
    console.log(`🎯 Using project: ${sampleProject.name} (${projectId})\n`);
    
    // Test 1: Folder Tree Endpoint
    console.log("📂 Test 1: Testing /folder-tree endpoint...");
    try {
      const axios = require('axios');
      const response = await axios.get(`http://localhost:${PORT}/api/files/${projectId}/folder-tree`);
      console.log("✅ Folder tree endpoint working!");
      console.log(`📊 Response: ${Object.keys(response.data).length} top-level items`);
    } catch (err) {
      console.log("❌ Folder tree endpoint failed:", err.response?.data || err.message);
    }
    
    console.log();
    
    // Test 2: Meta Endpoint
    console.log("📋 Test 2: Testing /meta endpoint...");
    try {
      const axios = require('axios');
      const response = await axios.get(`http://localhost:${PORT}/api/files/${projectId}/meta`);
      console.log("✅ Meta endpoint working!");
      console.log(`📊 Meta data:`, response.data);
    } catch (err) {
      console.log("❌ Meta endpoint failed:", err.response?.data || err.message);
    }
    
    console.log();
    
    // Test 3: Direct Function Tests
    console.log("🔧 Test 3: Testing core functions directly...");
    
    // Test buildFolderTreeFromDisk
    try {
      const { buildFolderTreeFromDisk } = require('./features/fileManager/services/syncService');
      const tree = await buildFolderTreeFromDisk(projectId);
      console.log("✅ buildFolderTreeFromDisk function working!");
      console.log(`📊 Tree contains ${Object.keys(tree).length} items`);
    } catch (err) {
      console.log("❌ buildFolderTreeFromDisk failed:", err.message);
    }
    
    // Test meta utilities
    try {
      const { readMeta, writeMeta } = require('./features/fileManager/services/metaUtils');
      const { getProjectDiskPath } = require('./features/fileManager/services/pathUtils');
      
      const projectPath = getProjectDiskPath(sampleProject, "", "AU");
      console.log(`📁 Project path: ${projectPath}`);
      
      const meta = readMeta(projectPath);
      console.log("✅ Meta utilities working!");
      console.log(`📊 Meta content:`, meta);
    } catch (err) {
      console.log("❌ Meta utilities failed:", err.message);
    }
    
    console.log("\n🎉 All tests completed!");
    
    // Close server
    server.close();
    
  } catch (err) {
    console.error("🔥 Test suite failed:", err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down test server...');
  process.exit(0);
});

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().then(() => {
    console.log("✨ Test suite finished successfully!");
    process.exit(0);
  }).catch(err => {
    console.error("💥 Test suite crashed:", err);
    process.exit(1);
  });
}

module.exports = { runTests };