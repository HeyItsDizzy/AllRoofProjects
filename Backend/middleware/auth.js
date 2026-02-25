const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

// Load API keys for service authentication
let apiKeys = {};
try {
  const apiKeysPath = path.join(__dirname, "../config/api-keys.json");
  apiKeys = JSON.parse(fs.readFileSync(apiKeysPath, "utf-8"));
} catch (err) {
  console.warn("⚠️ Could not load API keys:", err.message);
}

// Middleware to authenticate API key
const authenticateApiKey = (requiredPermission = null) => {
  return (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
    
    if (!apiKey) {
      return res.status(401).json({ 
        success: false, 
        message: "API key is missing" 
      });
    }

    // Find matching API key
    const keyEntry = Object.values(apiKeys).find(entry => 
      entry.key === apiKey && entry.active === true
    );

    if (!keyEntry) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid or inactive API key" 
      });
    }

    // Check permission if specified
    if (requiredPermission && !keyEntry.permissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        success: false, 
        message: `API key does not have required permission: ${requiredPermission}` 
      });
    }

    // Add API key info to request for logging
    req.apiKey = keyEntry;
    console.log(`🔑 API key authenticated: ${keyEntry.description}`);
    next();
  };
};

// Middleware to authenticate either JWT token OR API key
const authenticateTokenOrApiKey = (apiKeyPermission = null) => {
  return async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const apiKey = req.headers["x-api-key"];
    
    // Try API key first
    if (apiKey) {
      return authenticateApiKey(apiKeyPermission)(req, res, next);
    }
    
    // Fall back to JWT token
    if (authHeader) {
      return authenticateToken()(req, res, next);
    }
    
    return res.status(401).json({ 
      success: false, 
      message: "Authentication required - provide either Bearer token or x-api-key header" 
    });
  };
};

// Middleware to authenticate a user
const authenticateToken = () => {
  return async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token is missing or invalid" });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Token is invalid or expired" });
      }

      // Check if user needs forced refresh
      try {
        const User = require("../config/User");
        const currentUser = await User.findById(user.userId || user.id || user._id);
        
        if (currentUser?.forceRefreshAfter) {
          const tokenIssuedAt = new Date(user.iat * 1000); // JWT iat is in seconds
          
          if (tokenIssuedAt < currentUser.forceRefreshAfter) {
            // Allow /users/me endpoint to work even during forced refresh
            // This enables the frontend to get fresh user data
            const isUserMeEndpoint = req.path === '/users/me' || req.url === '/users/me';
            
            if (!isUserMeEndpoint) {
              return res.status(401).json({ 
                message: "Session expired due to role change. Please refresh and login again.",
                requiresRefresh: true 
              });
            } else {
              // For /users/me, clear the forceRefreshAfter flag since user is getting fresh data
              console.log("🔄 Allowing /users/me during forced refresh to get fresh user data");
            }
          }
          
          // Clear the refresh flag if token is newer or if this is /users/me endpoint
          const isUserMeEndpoint = req.path === '/users/me' || req.url === '/users/me';
          if (tokenIssuedAt >= currentUser.forceRefreshAfter || isUserMeEndpoint) {
            await User.findByIdAndUpdate(user.userId || user.id || user._id, {
              $unset: { forceRefreshAfter: "" }
            });
            if (isUserMeEndpoint) {
              console.log("🔄 Cleared forceRefreshAfter for user getting fresh data via /users/me");
            }
          }
        }
      } catch (refreshErr) {
        console.error("Error checking force refresh:", refreshErr);
        // Don't block the request for refresh check errors
      }

      req.user = user;
      next();
    });
  };
};

// Middleware to check if the user is an admin
const authenticateAdmin = () => {
  return (req, res, next) => {
    if (req.user?.role !== "Admin") {
      console.log("🚨 User is not an Admin.");
      return res.status(403).json({ message: "Admin access required" });
    }
    console.log("🛠️ User is Admin.");
    next(); // Allow the request to continue
  };
};

/**
 * Middleware to check if user is either a global Admin OR a company admin
 */
const authenticateCompanyAdmin = () => {
  return async (req, res, next) => {
    const User = require("../config/User");
    
    // Allow global admins
    if (req.user?.role === "Admin") {
      console.log("🛠️ Global Admin access granted.");
      return next();
    }
    
    // Check if user is a company admin
    try {
      const user = await User.findById(req.user.userId || req.user.id || req.user._id);
      if (user && user.companyAdmin === true) {
        console.log("🛠️ Company Admin access granted.");
        return next();
      }
      
      console.log("🚨 User is neither global admin nor company admin.");
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required - must be global admin or company admin" 
      });
      
    } catch (err) {
      console.error("❌ Error checking company admin status:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Error verifying admin status" 
      });
    }
  };
};

/**
 * Middleware factory: only allow users whose `req.user.role`
 * is one of the listed roles.
 */
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      console.log(`🚨 Role "${role}" not permitted; needs one of [${allowedRoles.join(", ")}]`);
      return res.status(403).json({
        success: false,
        message: "Forbidden – insufficient privileges.",
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authenticateApiKey,
  authenticateTokenOrApiKey,
  authenticateAdmin,
  authenticateCompanyAdmin,
  authorizeRole,
};
