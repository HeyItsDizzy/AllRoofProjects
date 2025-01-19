const express = require("express");
const path = require("path");
const fs = require("fs");
const { ObjectId } = require("mongodb");
const projectsCollection = require("../db").projectsCollection; // Adjust if needed
const upload = require("../middleware/upload"); // Ensure this middleware is configured for file uploads

const router = express.Router();

// Route to handle file uploads and associate them with a project
router.post("/upload-file/:id", upload.single("file"), async (req, res) => {
  try {
    // Ensure a file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Extract file information
    const { originalname, filename: uniqueFileName } = req.file;

    // File metadata to be stored in MongoDB
    const fileData = {
      fileName: originalname,
      uniqueFileName,
    };

    // Update the project document with the uploaded file
    const updateResult = await projectsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { files: fileData } }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({ error: "Project not found or update failed." });
    }

    res.json({
      success: true,
      message: "File uploaded and associated with project successfully!",
      file: fileData,
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      success: false,
      error: "File upload failed.",
      details: error.message,
    });
  }
});

// Route to serve uploaded files as static assets
router.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Route to download a file associated with a project
router.get("/download-file/:uniqueFileName", async (req, res) => {
  try {
    const uniqueFileName = req.params.uniqueFileName;

    // Construct the file path
    const filePath = path.join(__dirname, "../uploads", uniqueFileName);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found." });
    }

    // Send the file as a response
    res.download(filePath, uniqueFileName, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({ error: "Error downloading file." });
      }
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error.",
      details: error.message,
    });
  }
});

module.exports = router;
