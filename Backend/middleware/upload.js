const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { allowedExtensions } = require("./extensionLoader");




//
// ✅ CONFIG ZONE — Update easily below
//
const EXTENSIONS = allowedExtensions();
const PDF_MAX_MB = 20;          // Max size for PDFs
const FILE_MAX_MB = 3;          // Max size for all other files

const PDF_MAX_SIZE = PDF_MAX_MB * 1024 * 1024;   // bytes
const FILE_MAX_SIZE = FILE_MAX_MB * 1024 * 1024; // bytes

//
// 📂 Storage Setup
//
// ⚠️ Needed for reading file.buffer during MIME validation
const storage = multer.memoryStorage();
// Note: memory storage means the file is not saved until you manually write it.
// We'll manually save it later inside the route handler *after* validation.

/*const storage = multer.diskStorage({
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
});*/

//
// 🔒 File Filter with Type + Size Check
//
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ext || !EXTENSIONS.includes(ext)) {
    return cb(new Error(`❌ File type not allowed or missing: ${ext || "none"}`));
  }
  cb(null, true); // skip MIME here
};





//
// 🚀 Upload Middleware (with no global limit so we can control by extension later)
//
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: PDF_MAX_SIZE, // Allow up to PDF max globally, check below per file in route
  },
});

//
// 🖼 Avatar Upload (unchanged)
//
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
  PDF_MAX_SIZE,
  FILE_MAX_SIZE,
};
