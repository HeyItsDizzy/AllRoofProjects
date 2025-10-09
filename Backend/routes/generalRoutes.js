// routes/generalRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const router = express.Router();
const { userCollection } = require("../db");

// ── Email transporter setup (SMTP for sending) ───────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,      // smtp.hostinger.com
  port: Number(process.env.SMTP_PORT), // 465
  secure: true,                     // use TLS
  auth: {
    user: process.env.SMTP_USER,    // rusty_ai@allrooftakeoffs.com
    pass: process.env.SMTP_PASS     // Pass from ENV
  }
});

// ── Default & Test Routes ─────────────────────────────────────────────────
router.get("/", (req, res) => {
  console.log("Default route hit");
  res.status(200).send("Welcome to the API!");
});

router.get("/test", (req, res) => {
  console.log("Test route hit");
  res.send("Server is working!");
});

router.get("/db-test", async (req, res) => {
  try {
    console.log("DB Test route hit");
    const result = await client.db("admin").command({ ping: 1 });
    res.send("Database is connected and responding!");
  } catch (err) {
    console.error("DB Test failed:", err.message);
    res.status(500).send("Database connection failed!");
  }
});

router.get("/test-user-collection", async (req, res) => {
  try {
    const collection = await userCollection();
    const testUser = await collection.findOne({});
    res.json({ success: true, data: testUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Register ─────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const {
    firstName,
    lastName,
    name,
    email,
    phone,
    displayPhone,
    password,
  } = req.body;

  try {
    if (!firstName || !lastName || !email || !phone || !password ) {
      throw new Error("All fields (firstName, lastName, email, phone, password) are required.");
    }

    const collection = await userCollection();
    const isEmailExist = await collection.findOne({ email });
    if (isEmailExist) {
      throw new Error("This email is already in use.");
    }

    const hashedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUND));
    const fullName = name || `${firstName} ${lastName}`;

    const newUser = {
      name: fullName,
      firstName,
      lastName,
      email,
      phone,
      displayPhone,
      password: hashedPassword,
      role: "User",
      isBlock: false,
      isDeleted: false,
      linkedProjects: [],
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
      phoneVerified: false,
      resetCode: null,
      resetCodeExpiry: null
    };

    const result = await collection.insertOne(newUser);

    res.json({
      success: true,
      message: "User registered successfully.",
      data: { userId: result.insertedId },
    });
  } catch (err) {
    console.error("Error in register route:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Login ────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Login route hit with data:", req.body);

  try {
    const collection = await userCollection();
    const user = await collection.findOne({ email });
    console.log("Fetched user:", user);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error("Invalid email or password.");
    }

    // Remove password from user object before sending to client
    const { password: _, ...userWithoutPassword } = user;

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_SECRET_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: "Login successful.",
      data: { user: userWithoutPassword, token },
    });
  } catch (err) {
    console.error("Error in login route:", err.message);
    res.status(401).json({ success: false, message: err.message });
  }
});

// ── Forgot Password: generate & email 6-digit code ───────────────────────
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const collection = await userCollection();
    const user = await collection.findOne({ email });
    if (!user) {
      // Always return success to avoid enumeration
      return res.json({ success: true });
    }

    // Generate 6-digit code & expiry (10 mins)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await collection.updateOne(
      { email },
      { $set: { resetCode, resetCodeExpiry } }
    );

    // Send reset code email
    await transporter.sendMail({
      from: `"AllRoof Takeoffs" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Password Reset Code",
      html: `
        <p>You requested a password reset. Your 6-digit code is:</p>
        <h2>${resetCode}</h2>
        <p>This code expires in 10 minutes.</p>
      `
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error in forgot-password route:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Verify Reset Code ────────────────────────────────────────────────────
router.post("/verify-reset-code", async (req, res) => {
  const { email, code } = req.body;
  try {
    const collection = await userCollection();
    const user = await collection.findOne({
      email,
      resetCode: code,
      resetCodeExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired code." });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error in verify-reset-code route:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Reset Password (using code) ─────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    if (!email || !code || !newPassword) {
      throw new Error("Email, code, and newPassword are required.");
    }

    const collection = await userCollection();
    const user = await collection.findOne({
      email,
      resetCode: code,
      resetCodeExpiry: { $gt: new Date() }
    });

    if (!user) {
      throw new Error("Invalid or expired code.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_SALT_ROUND));
    await collection.updateOne(
      { email },
      {
        $set: { password: hashedPassword, resetCode: null, resetCodeExpiry: null }
      }
    );

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    console.error("Error in reset-password route:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Bug Report Endpoint ─────────────────────────────────────────────────
router.post("/support/bug-report", async (req, res) => {
  try {
    const { category, subcategory, description, userInfo } = req.body;

    // Validate required fields
    if (!category || !subcategory) {
      return res.status(400).json({
        success: false,
        message: "Category and subcategory are required"
      });
    }

    // Create email content
    const emailSubject = `🐛 Bug Report: ${category} - ${subcategory}`;
    
    const emailBody = `
      <h2>🐛 Bug Report from Project Manager (BETA)</h2>
      
      <h3>Issue Details:</h3>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Specific Issue:</strong> ${subcategory}</p>
      
      ${description ? `
      <h3>Additional Details:</h3>
      <p>${description.replace(/\n/g, '<br>')}</p>
      ` : ''}
      
      <h3>User Information:</h3>
      <p><strong>Name:</strong> ${userInfo.name}</p>
      <p><strong>Email:</strong> ${userInfo.email}</p>
      <p><strong>Role:</strong> ${userInfo.role}</p>
      <p><strong>Current Page:</strong> ${userInfo.currentPage}</p>
      <p><strong>Timestamp:</strong> ${new Date(userInfo.timestamp).toLocaleString()}</p>
      
      <h3>Technical Information:</h3>
      <p><strong>Browser:</strong> ${userInfo.browser}</p>
      
      <hr>
      <p><em>This bug report was automatically generated from the Project Manager BETA application.</em></p>
    `;

    // Send email using existing transporter
    const mailOptions = {
      from: `"Project Manager BETA" <${process.env.SMTP_USER}>`,
      to: "support@allrooftakeoffs.com.au",
      subject: emailSubject,
      html: emailBody
    };

    await transporter.sendMail(mailOptions);

    console.log(`🐛 Bug report sent: ${category} - ${subcategory} from ${userInfo.name} (${userInfo.email})`);

    res.json({
      success: true,
      message: "Bug report submitted successfully"
    });

  } catch (error) {
    console.error("❌ Error sending bug report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit bug report"
    });
  }
});

module.exports = router;
