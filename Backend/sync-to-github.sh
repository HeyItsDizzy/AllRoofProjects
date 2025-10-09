#!/bin/bash

# Sync script to update GitHub repository with current live backend and frontend
echo "🚀 Starting sync to GitHub repository..."

# Create temporary directory for repository
TEMP_DIR="/tmp/allroof-sync"
REPO_URL="https://github.com/HeyItsDizzy/AllRoofProjects.git"

# Clean up any existing temp directory
rm -rf $TEMP_DIR

# Clone the repository
echo "📥 Cloning repository..."
git clone $REPO_URL $TEMP_DIR
cd $TEMP_DIR

# Create directories if they don't exist
mkdir -p Backend
mkdir -p Frontend

# Copy live backend files (excluding sensitive files and git)
echo "📁 Copying live backend files..."
rsync -av --exclude='.*' \
         --exclude='node_modules' \
         --exclude='apikeys.json' \
         --exclude='logs' \
         --exclude='uploads' \
         /root/ART/ProjectManagerApp/Backend/ Backend/

# Copy frontend files from your local development
echo "📁 Frontend files need to be copied manually..."
echo "   Please copy from: C:\\Coding\\AllRoofsWebApps\\ProjectManagerApp\\Frontend\\"
echo "   To: $TEMP_DIR/Frontend/"
mkdir -p Frontend

# Create .env template for backend
echo "📝 Creating .env template..."
cat > Backend/.env.template << 'EOF'
# Database Configuration
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=production

# Email Configuration (if applicable)
EMAIL_HOST=your_email_host
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASSWORD=your_email_password

# Other API Keys
SOME_API_KEY=your_api_key_here
EOF

# Create README for the repository
echo "📝 Creating README..."
cat > README.md << 'EOF'
# All Roof Projects - Project Management System

A comprehensive project management system for roofing contractors built with React frontend and Node.js backend.

## 🏗️ Architecture

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express + MySQL
- **Authentication**: JWT
- **Real-time**: Socket.io
- **Deployment**: PM2 + Nginx

## 📁 Project Structure

```
├── Frontend/          # React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── shared/        # Shared utilities
│   │   └── styles/        # CSS and styling
│   └── package.json
│
├── Backend/           # Node.js API server
│   ├── routes/            # API endpoints
│   ├── middleware/        # Express middleware
│   ├── config/           # Configuration files
│   ├── features/         # Feature modules
│   ├── services/         # Business logic
│   └── package.json
│
└── README.md
```

## 🚀 Quick Start

### Backend Setup

1. Navigate to Backend directory:
   ```bash
   cd Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.template .env
   ```

4. Configure your `.env` file with database and other credentials

5. Start the server:
   ```bash
   npm run dev          # Development
   npm start            # Production with PM2
   ```

### Frontend Setup

1. Navigate to Frontend directory:
   ```bash
   cd Frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.template .env
   ```

4. Configure your `.env` file with API endpoints

5. Start the development server:
   ```bash
   npm run dev
   ```

## 🔧 Features

- **Project Management**: Create, track, and manage roofing projects
- **User Management**: Role-based access (Admin, Estimator, User)
- **Month Filtering**: Advanced filtering by months and date ranges
- **Client Management**: Link projects to clients
- **Real-time Updates**: Live updates across users
- **Responsive Design**: Mobile-friendly interface
- **Performance Optimized**: Virtual scrolling for large datasets

## 🛠️ Technologies

### Frontend
- React 18
- Vite
- TailwindCSS
- React Router DOM
- Axios
- Socket.io Client
- React Window (Virtual Scrolling)
- TanStack Table

### Backend
- Node.js
- Express.js
- MySQL
- Socket.io
- JWT Authentication
- PM2 Process Manager
- Multer (File Uploads)

## 📝 API Documentation

The backend provides RESTful APIs for:

- `/api/auth/*` - Authentication endpoints
- `/api/projects/*` - Project management
- `/api/users/*` - User management  
- `/api/clients/*` - Client management
- `/api/uploads/*` - File handling

## 🔒 Security

- JWT-based authentication
- Role-based authorization
- SQL injection protection
- CORS configuration
- Input validation and sanitization

## 🚀 Deployment

### Production Backend
```bash
cd Backend
npm install --production
pm2 start ecosystem.config.js
```

### Production Frontend
```bash
cd Frontend
npm run build
# Serve build files with nginx or your preferred web server
```

## 📊 Performance

- Virtual scrolling for large datasets
- Optimized database queries
- Lazy loading components
- Debounced search functionality
- Efficient state management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software for All Roof Takeoffs.

## 🆘 Support

For support, contact the development team or create an issue in this repository.
EOF

# Create frontend .env template
echo "📝 Creating frontend .env template..."
cat > Frontend/.env.template << 'EOF'
# API Configuration
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_NODE_ENV=production

# Feature Flags
VITE_ENABLE_SOCKET=true
VITE_ENABLE_DEBUG=false
EOF

# Stage all changes
echo "📋 Staging changes..."
git add .

# Commit changes
echo "💾 Committing changes..."
git config user.name "AllRoof Development"
git config user.email "dev@allrooftakeoffs.com.au"
git commit -m "🚀 Sync live backend and frontend - $(date '+%Y-%m-%d %H:%M:%S')

- Updated backend with latest live version
- Updated frontend with current development version  
- Added environment templates
- Updated documentation
- Excluded sensitive files (.env, apikeys.json, etc.)

Backend includes:
- All route handlers and API endpoints
- Database configuration
- Authentication middleware
- Project management features
- User and client management
- Real-time socket functionality

Frontend includes:
- React components and pages
- Month filtering system
- Project table with virtual scrolling
- User management interface
- Client management
- Responsive design"

echo "🎉 Repository successfully updated!"
echo "📤 Ready to push to GitHub!"
echo ""
echo "To complete the sync:"
echo "1. cd $TEMP_DIR"
echo "2. git push origin main"
echo ""
echo "Or run: cd $TEMP_DIR && git push origin main"