const express = require("express");
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


// Register a new user
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const isEmailExist = await (await userCollection()).findOne({ email });
    if (isEmailExist) {
      throw new Error("This email is already in use.");
    }

    const hashedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUND));
    const newUser = {
      email,
      password: hashedPassword,
      role: "User",
      isBlock: false,
      isDeleted: false,
    };

    const result = await (await userCollection()).insertOne(newUser);
    res.json({
      success: true,
      message: "User registered successfully.",
      data: result,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Login an existing user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Login route hit");
  try {
    const user = await userCollection.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error("Invalid email or password.");
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_SECRET_EXPIRES_IN,
    });

    res.json({
      success: true,
      message: "Login successful.",
      data: { user, token },
    });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
});

module.exports = router; // Export the router so it can be used in the main application
