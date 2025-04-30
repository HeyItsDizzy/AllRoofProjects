const path = require("path");
const fs = require("fs");
const { uploadsRoot: root } = require("../services/pathUtils");

const downloadFile = async (req, res) => {
  try {
    const { uniqueFileName } = req.params;
    const filePath = path.join(root, uniqueFileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found." });
    }

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
};

module.exports = { downloadFile };
