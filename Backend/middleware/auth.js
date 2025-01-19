const jwt = require("jsonwebtoken");

// Middleware to authenticate a user
const authenticateToken = () => {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token is missing or invalid" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Token is invalid or expired" });
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
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };
};

module.exports = { authenticateToken, authenticateAdmin };
