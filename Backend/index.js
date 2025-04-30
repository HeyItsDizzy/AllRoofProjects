const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticateToken, authenticateAdmin } = require("./middleware/auth");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");


// Initialize Express
const app = express();

// Connect to Mongoose before routes
const connectMongoose = require("./config/mongoose");
connectMongoose();

// Import Routes
const generalRoutes = require("./routes/generalRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const errorHandler = require("./routes/errorHandler");
const fileRoutes = require("./features/fileManager/routes/fileRoutes"); //temp direct path until FMindex is ready

// Middlewares
//app.use(cors());  // Allow cross-origin requests
app.use(express.json());  // Body parsing for JSON
app.use(express.urlencoded({ extended: true }));  // Body parsing for URL-encoded data
app.use("/uploads/avatars", express.static(path.join(__dirname, "uploads/avatars")));
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//Console Logs Delete when Bugs are fixed
console.log("SSL Options:");
console.log("Key Path:", process.env.SSL_KEY_PATH);
console.log("Cert Path:", process.env.SSL_CERT_PATH);
console.log("CA Path:", process.env.SSL_CA_PATH);

// Read SSL certificate paths from environment variables
let sslOptions = {};
if (process.env.NODE_ENV === "production") {
  try {
    sslOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
      ca: fs.readFileSync(process.env.SSL_CA_PATH),
    };
    console.log("SSL Options Loaded:", sslOptions);
  } catch (err) {
    console.error("Error loading SSL certificates:", err.message);
    process.exit(1);
  }
}

// Set the HTTP and HTTPS ports
const HTTP_PORT = process.env.HTTP_PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
console.log("HTTP_PORT:", HTTP_PORT);
console.log("HTTPS_PORT:", HTTPS_PORT);

// CORS Configuration
const allowedOrigins = [
  "https://allrooftakeoffs.com.au",   // Production domain
  "https://www.allrooftakeoffs.com.au", // Production domain
  "https://projects.allrooftakeoffs.com.au", // Subdomain for the project
  "http://192.168.10.84:5000", // Backend development server (for mobile testing)
  "http://192.168.10.84:5173", // Frontend development server (for mobile testing)
  "http://localhost:5000", // Backend development server (for local testing)
  "http://localhost:5173", // Frontend development server (for local testing)
];

app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      // Allow all valid origins, or if there is no origin (e.g. direct postman requests)
      callback(null, true); 
    } else {
      callback(new Error("CORS policy error")); // Reject any other origin
    }
  },
  credentials: true,  // Allow credentials (cookies, authorization headers)
}));

// ✅ Mount file manager routes AFTER app is created
/*const FMindex = require("./features/fileManager/FMindex");
FMindex(app);*/

// MongoDB Connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

// Log all incoming requests
app.use((req, res, next) => {
  const now = new Date();  const timestamp = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
  console.log(timestamp, `- Incoming request: ${req.method} ${req.url} - Body: ${JSON.stringify(req.body)}`);

  next(); // Pass control to the next middleware or route
});

// Register public routes
app.use("/", generalRoutes);  // (PUBLIC ROUTES) Handles `/register`, `/login`, etc.
app.use("/users", userRoutes);  // Handles `/get-users`, `/block-user`, etc.
app.use("/projects", projectRoutes);  // Register project routes
app.use("/files", fileRoutes);  // file routes should come from FMindex.js

// Error handling middleware
app.use(errorHandler);

// Test MongoDB Connection
(async function run() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB!");
    console.log("==================================");
    await client.db("admin").command({ ping: 1 });
  } catch (err) {
    console.error("MongoDB connection error:", err);
    console.log("==================================");
    process.exit(1);
  }
})();

// Log confirmation after registering routes
if (projectRoutes) {
  console.log("✅ projectRoutes.js is being used in Express!");
} else {
  console.error("🚨 projectRoutes.js failed to load!");
}


// List registered routes
console.log("Registered routes:");
app._router.stack.forEach((layer) => {
    if (layer.route) {
        console.log(Object.keys(layer.route.methods).join(', ').toUpperCase(), layer.route.path);
    }
});

// Redirect HTTP to HTTPS
if (process.env.NODE_ENV === "production") {
  http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
  }).listen(HTTP_PORT, () => {
    console.log(`HTTP server is redirecting to HTTPS on port ${HTTP_PORT}`);
  });

  https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log(`HTTPS server is running on port ${HTTPS_PORT}`);
  });
} else {
  
  // Local Development
  app.listen(HTTP_PORT, () => {
    console.log(`Server is running locally on http://localhost:${HTTP_PORT}`);
  });
}

// --- Original SSL Handling Code ---
/*
http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
  res.end();
}).listen(HTTP_PORT, () => {
  console.log(`HTTP server is redirecting to HTTPS on port ${HTTP_PORT}`);
});

https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
  console.log(`HTTPS server is running on port ${HTTPS_PORT}`);
});
*/
