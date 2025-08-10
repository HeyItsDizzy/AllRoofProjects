const jwt = require("jsonwebtoken");

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
            return res.status(401).json({ 
              message: "Session expired due to role change. Please refresh and login again.",
              requiresRefresh: true 
            });
          }
          
          // Clear the refresh flag if token is newer
          await User.findByIdAndUpdate(user.userId || user.id || user._id, {
            $unset: { forceRefreshAfter: "" }
          });
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
  authenticateAdmin,
  authenticateCompanyAdmin,
  authorizeRole,
};
