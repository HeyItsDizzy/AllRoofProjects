const multer = require("multer");

// Define storage configuration
const storage = multer.diskStorage({
  // Set the destination directory for uploaded files
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ensure this directory exists
  },
  // Define the filename format
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Initialize multer with the storage configuration
const upload = multer({ storage });

module.exports = upload;
