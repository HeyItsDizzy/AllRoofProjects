const jwt = require("jsonwebtoken");

const DEBUG_TOKEN = "debugtoken"; // Set a permanent debug token

// Middleware to authenticate a user
const authenticateToken = () => {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    console.log("🛠️ Received Token:", token);  // Log the received token for debugging

    if (!token) {
      console.log("🚨 No token found in the request header.");
      return res.status(401).json({ message: "Access token is missing or invalid" });
    }

    // ✅ Allow requests using the debug token (set admin by default)
    if (token === DEBUG_TOKEN) {
      req.user = { _id: "DebugTokenID", role: "Admin" }; // Default to Admin role for testing
      console.log("🛠️ DEBUG MODE: Using fixed debug token with Admin role.");
      return next();  // Proceed to the next middleware, which includes authenticateAdmin
    }

    console.log("🛠️ Verifying token...");
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.log("🚨 Token verification failed:", err);
        return res.status(403).json({ message: "Token is invalid or expired" });
      }

      req.user = user;
      console.log("🛠️ Token verified successfully, user:", user);

      // Add this to check the role here:
      console.log("🛠️ Role after decoding:", req.user?.role);  // Add this log to see if the role is being passed

      next();  // Proceed to the next middleware, which includes authenticateAdmin
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

module.exports = { authenticateToken, authenticateAdmin };
