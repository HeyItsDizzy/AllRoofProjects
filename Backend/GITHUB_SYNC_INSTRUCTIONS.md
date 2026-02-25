# Manual Steps to Sync Live Backend and Frontend to GitHub

## Step 1: Clone Repository
```bash
git clone https://github.com/HeyItsDizzy/AllRoofProjects.git
cd AllRoofProjects
```

## Step 2: Clear Existing Content
```bash
rm -rf Backend/* Frontend/*
mkdir -p Backend Frontend
```

## Step 3: Copy Live Backend Files
```bash
# Copy backend files (excluding sensitive data)
cp -r /root/ART/ProjectManagerApp/Backend/* Backend/
cd Backend

# Remove sensitive files and large data folders
rm -f apikeys.json
rm -rf node_modules logs uploads
# Remove all dot files and folders (contains sensitive/config data)
rm -rf .*

# Create .env template
cat > .env.template << 'EOF'
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

# Email Configuration
EMAIL_HOST=your_email_host
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASSWORD=your_email_password
EOF

cd ..
```

## Step 4: Copy Frontend Files
```bash
# You'll need to copy these from your Windows development machine
# The path is: C:\Coding\AllRoofsWebApps\ProjectManagerApp\Frontend\

# If you have access via mounted drive or network:
# cp -r /mnt/c/Coding/AllRoofsWebApps/ProjectManagerApp/Frontend/* Frontend/
# 
# Otherwise copy manually or use file transfer

cd Frontend
# Remove development artifacts
rm -rf node_modules dist .env .env.local

# Create .env template
cat > .env.template << 'EOF'
# API Configuration
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_NODE_ENV=production

# Feature Flags
VITE_ENABLE_SOCKET=true
VITE_ENABLE_DEBUG=false
EOF

cd ..
```

## Step 5: Create README.md
```bash
cat > README.md << 'EOF'
# All Roof Projects - Project Management System

A comprehensive project management system for roofing contractors.

## Tech Stack
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express + MySQL
- **Real-time**: Socket.io
- **Authentication**: JWT

## Setup

### Backend
```bash
cd Backend
npm install
cp .env.template .env
# Configure your .env file
npm run dev
```

### Frontend
```bash
cd Frontend
npm install
cp .env.template .env
# Configure your .env file
npm run dev
```

## Features
- Project Management
- User & Client Management
- Month-based Filtering
- Role-based Access Control
- Real-time Updates
- Responsive Design
EOF
```

## Step 6: Commit and Push
```bash
git add .
git commit -m "🚀 Initial commit - Live backend and frontend sync

Features included:
- Complete backend API with all routes
- Frontend with optimized month filtering
- Project management system
- User and client management
- Real-time socket functionality
- Responsive design
- Environment templates for easy setup"

git push origin main
```

## Alternative: Use GitHub CLI (if available)
```bash
# If you have GitHub CLI installed
gh repo clone HeyItsDizzy/AllRoofProjects
cd AllRoofProjects
# Follow steps 2-6 above
```

## Important Notes:
1. Make sure sensitive files (.env, apikeys.json) are not included
2. The .gitignore should exclude: node_modules, .env, logs, uploads
3. Update API URLs in frontend .env for your production environment
4. Test both frontend and backend after deployment