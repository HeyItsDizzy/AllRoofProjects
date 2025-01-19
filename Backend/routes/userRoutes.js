const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");
//const userCollection = require("../db").userCollection;
const { userCollection } = require("../db");

// Get all users (Admin only)
router.get("/get-users", authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    const users = await userCollection.find({}, { projection: { password: 0 } }).toArray();
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

// Promote a user to admin
router.patch("/make-admin/:id", authenticateToken(), authenticateAdmin(), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { role: "Admin" } }
    );

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
router.patch("/remove-admin/:id", authenticateToken(), authenticateAdmin(), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { role: "User" } }
    );

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
router.patch("/block-user/:id", authenticateToken(), authenticateAdmin(), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isBlock: true } }
    );

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
router.patch("/unblock-user/:id", authenticateToken(), authenticateAdmin(), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isBlock: false } }
    );

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
router.patch("/delete-user/:id", authenticateToken(), authenticateAdmin(), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isDeleted: true } }
    );

    res.json({
      success: true,
      message: "User marked as deleted successfully.",
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
