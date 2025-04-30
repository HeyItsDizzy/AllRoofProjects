const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
//const userCollection = require("../db").userCollection;
const { userCollection } = require("../db");

// Default route to verify the API is running
router.get("/", (req, res) => {
  console.log("Default route hit"); // Log when the default route is accessed
  res.status(200).send("Welcome to the API!"); // Send a success message to the client
});

// Test route to check if the server is functioning
router.get("/test", (req, res) => {
  console.log("Test route hit"); // Log when the test route is accessed
  res.send("Server is working!"); // Send a success message indicating the server is operational
});

// Database test route to verify the connection to MongoDB
router.get("/db-test", async (req, res) => {
  try {
    console.log("DB Test route hit"); // Log when the database test route is accessed
    const result = await client.db("admin").command({ ping: 1 }); // Ping the database to check the connection
    res.send("Database is connected and responding!"); // Send a success message if the database responds
  } catch (err) {
    console.error("DB Test failed:", err.message); // Log the error if the database connection fails
    res.status(500).send("Database connection failed!"); // Send an error response to the client
  }
});
// Database test route to verify the connection to User Collection specifically
router.get("/test-user-collection", async (req, res) => {
  try {
    const collection = await userCollection();
    const testUser = await collection.findOne({});
    res.json({ success: true, data: testUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// Register a new user
router.post("/register", async (req, res) => {
  const {
    firstName,
    lastName,
    name,
    company,
    email,
    phone,
    displayPhone,
    password,
  } = req.body;

  try {
    if (!firstName || !lastName || !email || !phone || !password || !company) {
      throw new Error("All fields (full name, email, phone, company, and password) are required.");
    }

    const isEmailExist = await (await userCollection()).findOne({ email });
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
      phone,            // ✅ ClickSend/E.164 format
      displayPhone,     // ✅ Local format for UI
      company,
      password: hashedPassword,
      role: "User",
      isBlock: false,
      isDeleted: false,
      linkedProjects: [],
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
      phoneVerified: false,
    };

    const result = await (await userCollection()).insertOne(newUser);

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



// Login to an existing user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Login route hit with data:", req.body);

  try {
    // Call the userCollection function to get the collection
    const collection = await userCollection();
    const user = await collection.findOne({ email });
    console.log("Fetched user:", user);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error("Invalid email or password.");
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role},
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_SECRET_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: "Login successful.",
      data: { user, token },
    });
  } catch (err) {
    console.error("Error in login route:", err.message);
    res.status(401).json({ success: false, message: err.message });
  }
});


router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      throw new Error("Token and new password are required.");
    }

    // Placeholder - Verify token and user
    // In the future, decode the token with JWT and check if it's valid
    const decoded = await verifyToken(token); // This would be your JWT function

    if (!decoded) {
      throw new Error("Invalid or expired token.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_SALT_ROUND));

    // Update the password in the database
    await userCollection().updateOne({ _id: decoded.userId }, { $set: { password: hashedPassword } });

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    console.error("Error in reset password route:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router; // Export the router so it can be used in the main application
