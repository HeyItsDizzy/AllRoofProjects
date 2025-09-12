module.exports = (err, req, res, next) => {
    console.error("Error:", err.message || "Unknown Error");
  
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: err.errors, // Include specific validation errors if available
      });
    }
  
    if (err.name === "UnauthorizedError") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized Access",
      });
    }
  
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  };
  