//Folder.js
const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Project", // optional if you want to populate later
  },
  name: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "user", "estimator", "all"],
    default: "all",
  },
}, { timestamps: true });

module.exports = mongoose.model("Folder", folderSchema);
