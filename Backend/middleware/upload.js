const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Dynamically create path
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const projectId = req.params.projectId;
    const folderPath = req.body.folderPath || "";
    const uploadPath = path.join(__dirname, "../uploads", projectId, folderPath);

    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

module.exports = { upload };

// Avatar upload (logos)
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/avatars/");
  },
  filename: function (req, file, cb) {
    cb(null, `${req.user.userId}.jpg`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 800 * 1024 }, // 800KB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WEBP files are allowed"));
    }
  },
});

module.exports = {
  upload,
  avatarUpload,
};
