const { APP_VERSION, DEPLOYMENT_ID, isVersionSupported } = require('../config/version');

// Middleware to check app version compatibility
const checkVersion = () => {
  return (req, res, next) => {
    // VERSION CHECK TEMPORARILY DISABLED
    // All requests will be allowed through regardless of version
    console.log(`🔄 Version check bypassed for: ${req.method} ${req.path}`);
    next();
    
    /* ORIGINAL VERSION CHECK CODE - DISABLED
    const clientVersion = req.headers['x-app-version'];
    const clientDeploymentId = req.headers['x-deployment-id'];
    
    // Skip version check for public routes (login, register, etc.)
    const publicRoutes = ['/login', '/register', '/reset-password', '/version'];
    if (publicRoutes.includes(req.path)) {
      return next();
    }
    
    // If client doesn't send version, treat as old version
    if (!clientVersion) {
      return res.status(426).json({
        success: false,
        message: "Client version not provided. Please refresh the application.",
        code: "VERSION_REQUIRED",
        currentVersion: APP_VERSION,
        deploymentId: DEPLOYMENT_ID
      });
    }
    
    // Check if version is supported
    if (!isVersionSupported(clientVersion)) {
      return res.status(426).json({
        success: false,
        message: "Your app version is outdated. Please refresh the application.",
        code: "VERSION_OUTDATED", 
        clientVersion,
        currentVersion: APP_VERSION,
        deploymentId: DEPLOYMENT_ID
      });
    }
    
    // Check deployment ID mismatch (for immediate updates)
    if (clientDeploymentId && clientDeploymentId !== DEPLOYMENT_ID) {
      return res.status(426).json({
        success: false,
        message: "A new version is available. Please refresh the application.",
        code: "DEPLOYMENT_MISMATCH",
        deploymentId: DEPLOYMENT_ID
      });
    }
    
    next();
    */
  };
};

// Route to get current version info
const versionInfo = (req, res) => {
  // Add deployment ID to response headers for frontend to sync
  res.set('X-Deployment-Id', DEPLOYMENT_ID);
  
  res.json({
    success: true,
    data: {
      version: APP_VERSION,
      deploymentId: DEPLOYMENT_ID,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = { checkVersion, versionInfo };