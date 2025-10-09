// Version management for forced logout on deployments
const crypto = require('crypto');

// This should be updated on each deployment
const APP_VERSION = "1.2.0"; // Update this on each deployment
const DEPLOYMENT_DATE = new Date().toISOString();

// Generate a unique deployment ID (regenerated on each deployment)
const DEPLOYMENT_ID = crypto.randomBytes(16).toString('hex');

// Minimum supported version (older versions will be forced to logout)
const MIN_SUPPORTED_VERSION = "1.2.0";

module.exports = {
  APP_VERSION,
  DEPLOYMENT_DATE,
  DEPLOYMENT_ID,
  MIN_SUPPORTED_VERSION,
  
  // Helper function to check if version is supported
  isVersionSupported: (clientVersion) => {
    if (!clientVersion) return false;
    
    // Simple version comparison (assumes semantic versioning)
    const parseVersion = (v) => v.split('.').map(Number);
    const clientParts = parseVersion(clientVersion);
    const minParts = parseVersion(MIN_SUPPORTED_VERSION);
    
    for (let i = 0; i < Math.max(clientParts.length, minParts.length); i++) {
      const client = clientParts[i] || 0;
      const min = minParts[i] || 0;
      
      if (client > min) return true;
      if (client < min) return false;
    }
    
    return true; // Versions are equal
  }
};