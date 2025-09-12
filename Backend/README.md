# All Roof Takeoffs - Project Manager API (Backend)

A robust Node.js API backend for the All Roof Takeoffs project management system, providing authentication, file management, project tracking, and real-time communication features.

## 🚀 Features

### Core API Services
- **Authentication**: JWT-based auth with role management (Admin, Estimator, Client)
- **Project Management**: CRUD operations for roofing projects and estimates
- **Client Management**: Comprehensive client database with contact management
- **File Management**: Upload, download, and live folder synchronization
- **Email Services**: Template-based email system for project communication
- **Socket Integration**: Real-time communication and live updates

### Advanced Features
- **Live Folder Sync**: Real-time file system monitoring and updates
- **Email Templates**: Professional email generation with dynamic content
- **Role-based Access**: Granular permissions for different user types
- **Auto-numbering**: Intelligent project number assignment system
- **Logging System**: Comprehensive error tracking and debug logs

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcrypt
- **File Handling**: Multer + fs-extra
- **Email**: Nodemailer with HTML templates
- **Real-time**: Socket.IO
- **Process Management**: PM2 (production)

## 📁 Project Structure

```
Backend/
├── config/              # Configuration files
│   ├── mongoose.js      # Database connection
│   ├── Client.js        # Client model
│   └── User.js          # User model
├── routes/              # API route handlers
├── services/            # Business logic services
├── middleware/          # Express middleware
│   ├── auth.js          # Authentication middleware
│   ├── upload.js        # File upload handling
│   └── extensionLoader.js # Dynamic extension loading
├── features/            # Feature modules
│   ├── fileManager/     # File management features
│   └── socketApp/       # Socket.IO integration
├── templates/           # Email templates
├── utils/               # Utility functions
├── uploads/             # File upload storage
└── logs/                # Application logs
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 4.4+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone [repository-url]
cd Backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/allrooftakeoffs
JWT_SECRET=your-jwt-secret-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:5173
```

## 📋 Available Scripts

```bash
npm start            # Start production server
npm run dev          # Start development server with nodemon
npm run socket       # Start standalone socket server
npm test             # Run test suite
```

## 🔗 API Endpoints

### Authentication
```
POST /api/auth/login     # User login
POST /api/auth/register  # User registration
GET  /api/auth/me        # Get current user
```

### Projects
```
GET    /api/projects     # Get all projects
POST   /api/projects     # Create new project
PUT    /api/projects/:id # Update project
DELETE /api/projects/:id # Delete project
```

### Clients
```
GET    /api/clients      # Get all clients
POST   /api/clients      # Create new client
PUT    /api/clients/:id  # Update client
DELETE /api/clients/:id  # Delete client
```

### Files
```
POST   /api/upload       # Upload files
GET    /api/files/:path  # Download file
DELETE /api/files/:path  # Delete file
GET    /api/sync         # Get sync status
```

## 🗄️ Database Models

### User Model
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  role: String (Admin|Estimator|Client),
  createdAt: Date,
  lastLogin: Date
}
```

### Client Model
```javascript
{
  clientName: String,
  contactName: String,
  email: String,
  phone: String,
  address: Object,
  projectHistory: [ObjectId],
  createdAt: Date
}
```

### Project Model
```javascript
{
  projectNumber: String,
  clientId: ObjectId,
  status: String,
  estimate: Object,
  files: [String],
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 Key Features

### Live Folder Sync
- **File**: `useLiveFolderSync.js`
- **Purpose**: Real-time monitoring of upload directory
- **Features**: File change detection, socket broadcasting, auto-cleanup

### Authentication System
- **File**: `middleware/auth.js`
- **Purpose**: JWT-based authentication and authorization
- **Features**: Role-based access, token validation, protected routes

### Email Templates
- **Directory**: `templates/`
- **Purpose**: Professional email generation
- **Features**: Dynamic content, HTML templates, client customization

### Socket Integration
- **File**: `features/socketApp/`
- **Purpose**: Real-time communication
- **Features**: File sync updates, live notifications, client updates

## 🐛 Bug Reports & Improvements

See [BUGS_AND_IMPROVEMENTS.md](BUGS_AND_IMPROVEMENTS.md) for current issues and planned features.

## 📦 Deployment

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'allrooftakeoffs-api',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

### Production Deployment
```bash
# Build and deploy
npm install --production
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔍 Monitoring & Logs

### Log Files
- `logs/deprecation.log` - Deprecation warnings
- `logs/error.log` - Error logging
- `logs/access.log` - Request logging

### Health Checks
```bash
# Check API status
curl http://localhost:5000/api/health

# Check database connection
curl http://localhost:5000/api/db-status
```

## 🤝 Contributing

1. Follow Express.js best practices
2. Use proper error handling and logging
3. Implement proper validation for all inputs
4. Update API documentation for new endpoints
5. Test thoroughly before submitting

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-based Access**: Granular permission system
- **Input Validation**: Comprehensive request validation
- **File Security**: Safe file upload handling
- **CORS Configuration**: Proper cross-origin setup

---

Built with 🛡️ for secure and efficient project management.
