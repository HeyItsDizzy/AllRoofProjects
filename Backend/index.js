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
const { checkVersion, versionInfo } = require("./middleware/versionCheck");
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
const clientRoutes = require('./routes/clientRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const quickbooksRoutes = require('./routes/quickbooksRoutes');
const linkingRoutes = require('./routes/linkingRoutes');
const loyaltyTierRoutes = require('./routes/loyaltyTierRoutes');
const invoiceSyncRoutes = require('./routes/invoiceSyncRoutes');
const invoiceImportRoutes = require('./routes/invoiceImportRoutes');
const errorHandler = require("./routes/errorHandler");
const fileRoutes = require("./features/fileManager/routes/fileRoutes");
const projectDashboardRoutes = require("./routes/projectDashboardRoutes");

// Import RecycleBin System
const { initializeRecycleBinSystem } = require('./recycleBinIntegration');
// Note: recycleBinRoutes will be imported after service initialization

// Import Socket App
const { server: socketServer, createSocketIO } = require("./features/socketApp/socketApp");


// Middlewares
app.use(express.json({ limit: '50mb' }));  // Body parsing for JSON with 50MB limit for email attachments
app.use(express.urlencoded({ extended: true, limit: '50mb' }));  // Body parsing for URL-encoded data with 50MB limit
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
const IS_DEV_MODE = process.argv.includes('--dev');
const HTTP_PORT = IS_DEV_MODE ? (process.env.HTTP_PORT_DEV || 5002) : (process.env.HTTP_PORT || 5000);
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const SOCKET_PORT = IS_DEV_MODE ? (process.env.SOCKET_PORT_DEV || 3002) : (process.env.SOCKET_PORT || 5001); // Changed to 5001 for production

console.log("Mode:", IS_DEV_MODE ? "DEVELOPMENT" : "PRODUCTION");
console.log("HTTP_PORT:", HTTP_PORT);
console.log("HTTPS_PORT:", HTTPS_PORT);
console.log("SOCKET_PORT:", SOCKET_PORT);

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
  origin: (origin, callback) => {
    // Skip verbose CORS logging for static file requests (avatars, uploads, etc.)
    const isStaticFile = callback.req && (
      callback.req.url.includes('/uploads/') || 
      callback.req.url.includes('/avatars/') ||
      callback.req.url.includes('/assets/') ||
      callback.req.url.includes('/images/') ||
      callback.req.url.includes('.jpg') || 
      callback.req.url.includes('.jpeg') ||
      callback.req.url.includes('.png') ||
      callback.req.url.includes('.gif') ||
      callback.req.url.includes('.svg') ||
      callback.req.url.includes('.ico')
    );
    
    if (!isStaticFile) {
      console.log("🌐 CORS request from origin:", origin || 'undefined');
      if (callback.req && callback.req.headers) {
        console.log("📋 Request headers:", {
          'user-agent': callback.req.headers['user-agent']?.substring(0, 50) + '...',
          'referer': callback.req.headers['referer'],
          'host': callback.req.headers['host']
        });
      }
    }
    
    // Define allowed origins
    const allowedOrigins = [
      "https://projects.allrooftakeoffs.com.au",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      // Allow all valid origins, or if there is no origin (e.g. direct postman requests)
      callback(null, true); 
    } else {
      callback(new Error("CORS policy error")); // Reject any other origin
    }
  },
  credentials: true,  // Allow credentials (cookies, authorization headers)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-App-Version', 'X-Deployment-Id'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  console.log(`🔄 Preflight request for: ${req.url} from origin: ${req.headers.origin}`);
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-App-Version, X-Deployment-Id');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// ✅ Mount file manager routes AFTER app is created  
/*const FMindex = require("./features/fileManager/FMindex");
FMindex(app);*/

// Import Database connection
const { connectDB, userCollection, projectsCollection, clientCollection } = require('./db');

// Log incoming requests (excluding static files to reduce noise)
app.use((req, res, next) => {
  const now = new Date();
  const timestamp = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
  
  // Skip verbose logging for static file requests (avatars, uploads, etc.)
  const isStaticFile = (
    req.url.includes('/uploads/') || 
    req.url.includes('/avatars/') ||
    req.url.includes('/assets/') ||
    req.url.includes('/images/') ||
    req.url.includes('.jpg') || 
    req.url.includes('.jpeg') ||
    req.url.includes('.png') ||
    req.url.includes('.gif') ||
    req.url.includes('.svg') ||
    req.url.includes('.ico') ||
    req.url.includes('/favicon')
  );
  
  if (!isStaticFile) {
    console.log(timestamp, `- Incoming request: ${req.method} ${req.url} - Body: ${JSON.stringify(req.body)}`);
  }

  next(); // Pass control to the next middleware or route
});

// Add deployment ID to all responses for frontend sync
app.use((req, res, next) => {
  // Add deployment ID header to all responses
  const { DEPLOYMENT_ID } = require('./config/version');
  res.set('X-Deployment-Id', DEPLOYMENT_ID);
  next();
});

// Version info route (public)
app.get("/api/version", versionInfo);

// Apply version check middleware to all API routes (except public ones)
app.use("/api", checkVersion());

// Register public routes
console.log('🔧 Registering routes...');
app.use("/api", generalRoutes);           // Now: /api/login, /api/register, etc.
console.log('✅ generalRoutes registered');
app.use("/api/users", userRoutes);        // Now: /api/users, /api/users/get-users, etc.
console.log('✅ userRoutes registered');
app.use("/api/projects", projectRoutes);  // Now: /api/projects
console.log('✅ projectRoutes registered');
app.use('/api/clients', clientRoutes);   // Now: /api/clients
console.log('✅ clientRoutes registered');
app.use('/api/permissions', permissionRoutes); // Now: /api/permissions
console.log('✅ permissionRoutes registered');
app.use('/api/quickbooks', quickbooksRoutes); // Now: /api/quickbooks
console.log('✅ quickbooksRoutes registered');
app.use('/api/qb-company', require('./routes/qbCompanyRoutes')); // Company-level QB integration
console.log('✅ qbCompanyRoutes registered');
app.use('/api/linking', linkingRoutes);   // Now: /api/linking
console.log('✅ linkingRoutes registered');
app.use('/api/loyalty', loyaltyTierRoutes); // Now: /api/loyalty
console.log('✅ loyaltyTierRoutes registered');
app.use('/api/invoices', invoiceSyncRoutes); // Now: /api/invoices/sync, /api/invoices/local
console.log('✅ invoiceSyncRoutes registered');
app.use('/api/invoices/import', invoiceImportRoutes); // Now: /api/invoices/import/csv, /api/invoices/import/status
console.log('✅ invoiceImportRoutes registered');
app.use("/api/files", fileRoutes);        // Now: /api/files
console.log('✅ fileRoutes registered');
app.use("/api", projectDashboardRoutes); // Now: /api/projects/:id/dashboard
console.log('✅ projectDashboardRoutes registered');
console.log('🎉 All basic routes registered successfully!');




// Error handling middleware
app.use(errorHandler);

// Test MongoDB Connection and Initialize Systems
(async function run() {
  try {
    const db = await connectDB(); // Use db.js connection
    console.log("Successfully connected to MongoDB!");
    console.log("==================================");
    
    // Test the connection with a ping
    await db.admin().command({ ping: 1 });
    
    // Initialize RecycleBin System after DB connection
    let io = null; // Will be set up later when socket server starts
    
    try {
      const recycleBinService = await initializeRecycleBinSystem(db, io);
      
      // Initialize recycle bin routes with the service instance
      const { router: recycleBinRoutes, initializeRecycleBinRoutes } = require('./routes/recycleBinRoutes');
      initializeRecycleBinRoutes(recycleBinService);
      
      // Register recycle bin routes now that service is initialized
      app.use('/api/recycle-bin', recycleBinRoutes);
      console.log('✅ recycleBinRoutes registered with service');
      
      console.log("✅ RecycleBin system initialized successfully");
      
      // Store recycle bin service globally for file operations
      global.recycleBinService = recycleBinService;
    } catch (recycleBinError) {
      console.warn("⚠️ RecycleBin system initialization failed:", recycleBinError.message);
    }
    
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

// Add test route for socket functionality (only in dev mode)
if (IS_DEV_MODE) {
  app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Folder Sync Test</title>
      </head>
      <body>
        <h1>Live Folder Sync Test</h1>
        <div id="status">Connecting...</div>
        <div>
          <input type="text" id="projectIdInput" placeholder="Enter Project ID" value="test123" />
          <button onclick="subscribeToProject()">Subscribe to Project</button>
        </div>
        <div id="events" style="margin-top: 20px; max-height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 10px;"></div>

        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io('http://145.223.23.243:${SOCKET_PORT}');
          const statusDiv = document.getElementById('status');
          const eventsDiv = document.getElementById('events');

          socket.on('connect', () => {
            statusDiv.textContent = 'Connected to Socket.io server';
            statusDiv.style.color = 'green';
            console.log('Connected to Socket.io server');
          });

          socket.on('disconnect', () => {
            statusDiv.textContent = 'Disconnected from Socket.io server';
            statusDiv.style.color = 'red';
            console.log('Disconnected from Socket.io server');
          });

          socket.on('folder_sync', (eventInfo) => {
            console.log('Folder sync event:', eventInfo);
            const eventDiv = document.createElement('div');
            eventDiv.innerHTML = \`
              <strong>\${eventInfo.timestamp}</strong> - 
              Project: \${eventInfo.projectName} (\${eventInfo.projectId}) - 
              <em>\${eventInfo.actionType}</em>: \${eventInfo.folderOrFileName}
            \`;
            eventDiv.style.margin = '5px 0';
            eventDiv.style.padding = '5px';
            eventDiv.style.backgroundColor = eventInfo.actionType.includes('added') ? '#d4edda' : '#f8d7da';
            eventDiv.style.border = '1px solid #ccc';
            eventDiv.style.borderRadius = '3px';
            eventsDiv.insertBefore(eventDiv, eventsDiv.firstChild);
            
            while (eventsDiv.children.length > 10) {
              eventsDiv.removeChild(eventsDiv.lastChild);
            }
          });

          function subscribeToProject() {
            const projectId = document.getElementById('projectIdInput').value;
            if (projectId) {
              socket.emit('subscribe_project', projectId);
              console.log('Subscribed to project:', projectId);
              statusDiv.textContent = \`Connected - Watching project: \${projectId}\`;
              statusDiv.style.color = 'blue';
            }
          }
        </script>
      </body>
      </html>
    `);
  });
}

// HTTP and HTTPS server setup
if (process.env.NODE_ENV === "production") {
  // HTTP server - serve the Express app for internal nginx proxy calls
  const httpServer = http.createServer(app);
  httpServer.listen(HTTP_PORT, 'localhost', () => {
    console.log(`HTTP server serving API for nginx proxy on localhost:${HTTP_PORT}`);
    
    // Initialize cron jobs after server starts
    try {
      const setupCronJobs = require('./cronJobs');
      setupCronJobs();
      console.log('✅ Cron jobs initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize cron jobs:', error.message);
    }
  });

  // HTTPS server - for direct external access (with SSL certificates)
  const httpsServer = https.createServer(sslOptions, app);
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`HTTPS server is running on port ${HTTPS_PORT}`);
  });

  // Separate Socket.io server for production (port 5001)
  const ENABLE_SOCKET_SERVER = process.env.ENABLE_SOCKET_SERVER === 'true';
  if (ENABLE_SOCKET_SERVER) {
    // Create dedicated HTTPS server for socket.io on port 5001
    const socketHttpsServer = https.createServer(sslOptions);
    const io = createSocketIO(socketHttpsServer);
    
    socketHttpsServer.listen(SOCKET_PORT, '0.0.0.0', () => {
      console.log(`Socket.io HTTPS server running on port ${SOCKET_PORT} (all interfaces)`);
      console.log(`Socket.io available at wss://projects.allrooftakeoffs.com.au:${SOCKET_PORT}/socket.io/`);
    });
  }
} else {
  
  // Local Development
  app.listen(HTTP_PORT, () => {
    console.log(`Server is running locally on http://localhost:${HTTP_PORT}`);
    
    // Initialize cron jobs after server starts
    try {
      const setupCronJobs = require('./cronJobs');
      setupCronJobs();
      console.log('✅ Cron jobs initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize cron jobs:', error.message);
    }
  });

  // Start Socket Server for live folder sync (dev mode or with ENABLE_SOCKET_SERVER=true)
  const ENABLE_SOCKET_SERVER = process.env.ENABLE_SOCKET_SERVER === 'true' || IS_DEV_MODE;
  if (ENABLE_SOCKET_SERVER) {
    socketServer.listen(SOCKET_PORT, '0.0.0.0', () => {
      console.log(`Socket.io server running on port ${SOCKET_PORT} (all interfaces)`);
    });
  }
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
