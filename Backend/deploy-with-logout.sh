#!/bin/bash

# Deployment script for forcing user logout on new releases
# This script updates version numbers and optionally rotates JWT secret

set -e  # Exit on any error

echo "🚀 Starting deployment with forced user logout..."

# Get current date for versioning
CURRENT_DATE=$(date +"%Y-%m-%d")
CURRENT_TIME=$(date +"%H:%M:%S")
NEW_VERSION="1.2.$(date +%s)"  # Use timestamp for unique versions

echo "📅 Deployment Date: $CURRENT_DATE $CURRENT_TIME"
echo "🔢 New Version: $NEW_VERSION"

# Update backend version
echo "🔧 Updating backend version..."
cat > y:/Backend/config/version.js << EOF
// Version management for forced logout on deployments
const crypto = require('crypto');

// This should be updated on each deployment
const APP_VERSION = "$NEW_VERSION"; // Updated on $(date)
const DEPLOYMENT_DATE = new Date().toISOString();

// Generate a unique deployment ID (regenerated on each deployment)
const DEPLOYMENT_ID = crypto.randomBytes(16).toString('hex');

// Minimum supported version (older versions will be forced to logout)
const MIN_SUPPORTED_VERSION = "$NEW_VERSION";

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
EOF

# Update frontend version
echo "🔧 Updating frontend version..."
cat > "c:/Coding/AllRoofsWebApps/ProjectManagerApp/Frontend/src/config/version.js" << EOF
// Frontend version configuration
export const APP_CONFIG = {
  VERSION: "$NEW_VERSION", // Updated on $(date)
  BUILD_TIME: new Date().toISOString(),
  
  // This should match the backend version for compatibility
  API_VERSION: "$NEW_VERSION"
};
EOF

# Optional: Rotate JWT secret for complete logout
read -p "🔐 Do you want to rotate JWT secret to force logout all users? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Generating new JWT secret..."
    NEW_JWT_SECRET=$(openssl rand -base64 64)
    echo "New JWT Secret: $NEW_JWT_SECRET"
    echo "⚠️  IMPORTANT: Update your .env file with the new JWT_SECRET:"
    echo "JWT_SECRET=$NEW_JWT_SECRET"
    echo ""
    echo "You can also set it directly:"
    echo "export JWT_SECRET=\"$NEW_JWT_SECRET\""
fi

# Build frontend
echo "🏗️  Building frontend..."
cd "c:/Coding/AllRoofsWebApps/ProjectManagerApp/Frontend"
npm run build

# Optional: Deploy to production
read -p "🚀 Deploy to production now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying backend..."
    cd y:/Backend
    
    # If using Vercel
    if command -v vercel &> /dev/null; then
        vercel --prod
    else
        echo "⚠️  Vercel CLI not found. Deploy manually or install with: npm i -g vercel"
    fi
    
    # If you have a custom deployment script, add it here
    # ./deploy.sh
fi

echo ""
echo "✅ Deployment preparation complete!"
echo "📋 Summary:"
echo "   - Backend version updated to: $NEW_VERSION"
echo "   - Frontend version updated to: $NEW_VERSION"
echo "   - Frontend built successfully"
echo ""
echo "🎯 Next steps:"
echo "   1. Deploy your backend to production"
echo "   2. Deploy your frontend to production"
echo "   3. All existing users will be forced to refresh/login"
echo ""
echo "💡 For automatic deployment, modify this script to include your deployment commands."