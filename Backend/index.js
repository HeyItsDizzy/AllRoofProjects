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
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
// Initialize Express
const app = express();
// Import Routes
const generalRoutes = require("./routes/generalRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const fileRoutes = require("./routes/fileRoutes");
const errorHandler = require("./routes/errorHandler");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//app.use("/api", router);


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
  "https://allrooftakeoffs.com.au",
  "https://www.allrooftakeoffs.com.au",
  "https://projects.allrooftakeoffs.com.au",
  "http://localhost:5000", // Backend development server
  "http://localhost:5173", // Frontend development server
];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// MongoDB Connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});
const userCollection = client.db("ART").collection("Users");
const projectsCollection = client.db("ART").collection("Projects");

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url} - Body: ${JSON.stringify(req.body)}`);
  next(); // Pass control to the next middleware or route
});


// Test MongoDB Connection
(async function run() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB!");
    await client.db("admin").command({ ping: 1 });
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
})();

// Route Middleware
app.use("/", generalRoutes); // (PUBLIC ROUTES) Handles `/register`, `/login`, and other general endpoints
app.use("/users", userRoutes); // Handles `/get-users`, `/block-user`, etc.
app.use("/projects", projectRoutes);
app.use("/files", fileRoutes);

// Error Handling Middleware
app.use(errorHandler);

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
