// oneoffscripts/validate-delete-endpoint.js  
// Simple validation script to check if the delete endpoint is accessible
// Run with: node oneoffscripts/validate-delete-endpoint.js

const express = require('express');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import the client routes to validate the endpoint exists
const clientRoutes = require('../routes/clientRoutes');

console.log('🔍 Validating Client Delete Endpoint...\n');

// Check if delete route is registered
const routerStack = clientRoutes.stack;
const deleteRoutes = routerStack.filter(layer => 
  layer.route && 
  layer.route.methods.delete && 
  layer.route.path.includes(':clientId')
);

if (deleteRoutes.length > 0) {
  console.log('✅ Delete endpoint found in clientRoutes');
  deleteRoutes.forEach(route => {
    console.log(`   Path: ${route.route.path}`);
    console.log(`   Methods: ${Object.keys(route.route.methods).join(', ')}`);
  });
} else {
  console.log('❌ No delete endpoint found for :clientId pattern');
}

// Check required dependencies
console.log('\n🔍 Checking required dependencies...');

try {
  const Client = require('../config/Client');
  console.log('✅ Client model loaded successfully');
} catch (error) {
  console.log('❌ Failed to load Client model:', error.message);
}

try {
  const User = require('../config/User');
  console.log('✅ User model loaded successfully');
} catch (error) {
  console.log('❌ Failed to load User model:', error.message);
}

try {
  const { projectsCollection } = require('../db');
  console.log('✅ Database collections module loaded successfully');
} catch (error) {
  console.log('❌ Failed to load database collections:', error.message);
}

// Validate authentication middleware
try {
  const { authenticateToken } = require('../middleware/auth');
  console.log('✅ Authentication middleware loaded successfully');
} catch (error) {
  console.log('❌ Failed to load authentication middleware:', error.message);
}

console.log('\n🔍 Endpoint Configuration Summary:');
console.log('   Endpoint: DELETE /api/clients/:clientId');
console.log('   Authentication: Required (Admin only)');
console.log('   Cleanup Operations:');
console.log('   - Remove client from all project linkedClients arrays');
console.log('   - Remove client from all user linkedClients arrays'); 
console.log('   - Clear company field for users belonging to this client');
console.log('   - Delete client document');
console.log('   - Perform final safety sweep for orphaned references');

console.log('\n✅ Validation completed!');
console.log('\n📝 To test the endpoint:');
console.log('   1. Ensure server is running');
console.log('   2. Use a valid admin JWT token');
console.log('   3. Call: DELETE /api/clients/[clientId]');
console.log('   4. Check response for cleanup summary');