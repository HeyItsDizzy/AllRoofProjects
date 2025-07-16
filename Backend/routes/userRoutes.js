const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");
const { userCollection } = require("../db");
const { avatarUpload } = require("../middleware/upload");
const path = require("path");
const fs = require("fs");

// Middleware to get user collection
const getUserCollection = async (req, res, next) => {
  try {
    const collection = await userCollection();
    if (!collection) throw new Error("userCollection() returned undefined");
    req.collection = collection;
    console.log("✅ Users collection accessed successfully!");
    next();
  } catch (err) {
    console.error("❌ Failed to access user collection:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user collection.",
      error: err.message,
    });
  }
};

// Middleware to validate ObjectId
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user ID format." });
  }
  next();
};

// Common projection fields
const userProjection = {
  firstName: 1,
  lastName: 1,
  email: 1,
  phone: 1,
  address: 1,
  org: 1,
  company: 1,
  avatar: 1,
  role: 1,
  phoneVerified: 1,
};

// Get all users (Admin only)
router.get("/get-users", authenticateToken(), authenticateAdmin(), getUserCollection, async (req, res) => {
  try {
    const users = await req.collection.find({}, { projection: userProjection }).toArray();
    res.status(200).json({
      success: true,
      message: "All users retrieved successfully.",
      data: users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve users.",
      error: err.message,
    });
  }
});

// Route to retrieve user data
router.get("/get-userData", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const users = await req.collection.find({}).toArray();
    res.json({
      success: true,
      message: "User data retrieved successfully",
      data: users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user data",
      error: err.message,
    });
  }
});

// Route to get a single user by ID
router.get("/get-user/:id", authenticateToken(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const user = await req.collection.findOne({ _id: new ObjectId(req.params.id) }, { projection: userProjection });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    res.json({
      success: true,
      message: "User retrieved successfully.",
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user.",
      error: err.message,
    });
  }
});

// Promote a user to admin
router.patch("/make-admin/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const result = await req.collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { role: "Admin" } });
    res.json({
      success: true,
      message: "User promoted to admin successfully.",
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Demote an admin to user
router.patch("/remove-admin/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const result = await req.collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { role: "User" } });
    res.json({
      success: true,
      message: "Admin demoted to user successfully.",
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Block a user
router.patch("/block-user/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const result = await req.collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { isBlock: true } });
    res.json({
      success: true,
      message: "User blocked successfully.",
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Unblock a user
router.patch("/unblock-user/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const result = await req.collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { isBlock: false } });
    res.json({
      success: true,
      message: "User unblocked successfully.",
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mark a user as deleted
router.patch("/delete-user/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const result = await req.collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { isDeleted: true } });
    res.json({
      success: true,
      message: "User marked as deleted successfully.",
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Fetch current user's profile
router.get("/profile", authenticateToken(), async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid or missing user ID." });
    }

    const collection = await userCollection(); // ✅ correctly calling the function
    if (!collection) throw new Error("userCollection() returned undefined");

    const user = await collection.findOne(
      { _id: new ObjectId(userId) },
      { projection: userProjection }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    console.log("✅ Successfully fetched user profile:", user.email);
    res.json({ success: true, data: user });

  } catch (err) {
    console.error("❌ Failed to retrieve profile:", err.message);
    res.status(500).json({ success: false, message: "Failed to retrieve profile.", error: err.message });
  }
});

router.patch("/profile", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const updates = req.body;

    if (updates.phoneVerified === false) {
      delete updates.phoneVerified;
    }

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid or missing user ID." });
    }

    const allowedFields = ["firstName", "lastName", "phone", "address", "org", "company", "avatar", "phoneVerified"];
    const updatePayload = {};

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updatePayload[field] = updates[field];
      }
    });

    const result = await req.collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updatePayload }
    );

    if (result.modifiedCount === 0) {
      return res.status(200).json({ success: true, message: "No changes detected." });
    }

    res.json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.error("❌ Failed to update profile:", err.message);
    res.status(500).json({ success: false, message: "Failed to update profile." });
  }
});

// Update current user's Avatar
router.post("/avatar", authenticateToken(), avatarUpload.single("avatar"), getUserCollection, async (req, res) => {
  try {
    const userId = req.user.userId;
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const result = await req.collection.updateOne({ _id: new ObjectId(userId) }, { $set: { avatar: avatarPath } });
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      url: avatarPath,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Upload failed", error: err.message });
  }
});

// Column sizing preferences for tables
router.get("/column-sizing", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const tableKey = req.query.tableKey;

    if (!tableKey) return res.status(400).json({ success: false, message: "Missing tableKey" });

    const user = await req.collection.findOne({ _id: new ObjectId(userId) });
    const sizingPrefs = user?.columnSizingPrefs || {};

    res.status(200).json({
      success: true,
      columnSizing: sizingPrefs[tableKey] || {},
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load column sizing", error: err.message });
  }
});

router.post("/column-sizing", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { tableKey, columnSizing } = req.body;

    if (!tableKey || !columnSizing) {
      return res.status(400).json({ success: false, message: "Missing tableKey or columnSizing" });
    }

    const update = {
      [`columnSizingPrefs.${tableKey}`]: columnSizing,
    };

    const result = await req.collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: update }
    );

    res.status(200).json({ success: true, message: "Column sizing saved." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save column sizing", error: err.message });
  }
});


module.exports = router;
