//Project.js
const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  full_address: String,
  address_line_1: String,
  city: String,
  state: String,
  zip: String,
  country: String,
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: locationSchema, default: {} },
  due_date: { type: String }, // or Date if consistent
  posting_date: { type: String }, // or Date if consistent
  linkedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  description: { type: String },
  subTotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  gst: { type: Number, default: 0 },
  status: { type: String, default: "New Lead" },
  projectNumber: { type: String, required: true, unique: true },
});

module.exports = mongoose.model("Project", projectSchema);
