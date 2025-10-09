// config/User.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema({
  name:        String,
  email:       String,
  phone:       String,
  password:    String,
  role:        { type: String, enum: ["Admin", "User"], default: "User" },

  // 🔐 Linking to a client (company)
  company:       { type: String, default: null },  // Store client name for human readability
  companyAdmin:  { type: Boolean, default: false },

  // 🔐 Multi-linking support for users linked to multiple clients
  linkedClients: [{ type: Schema.Types.ObjectId, ref: "Client" }],

  // 🔒 Forgot password support
  resetCode:        { type: String, default: null },
  resetCodeExpiry:  { type: Date, default: null },

  // ✅ Optional visual / extra fields
  avatar:        String,
  isBlock:       { type: Boolean, default: false },
  isDeleted:     { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
}, {
  timestamps: true,
  collection: "Users",
});

module.exports = mongoose.model("User", UserSchema, "Users");
