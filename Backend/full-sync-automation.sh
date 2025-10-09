#!/bin/bash

# Full Automation Script for Backend + Frontend Sync to GitHub
# This script handles both backend (from VPS) and frontend (from local/remote source)

set -e  # Exit on any error

# Configuration
REPO_URL="https://github.com/HeyItsDizzy/AllRoofProjects.git"
TEMP_DIR="/tmp/allroof-sync"
BACKEND_SOURCE="/root/ART/ProjectManagerApp/Backend"
FRONTEND_SOURCE_REMOTE="https://github.com/HeyItsDizzy/AllRoofProjects.git"  # Will pull existing frontend
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "🚀 Starting FULL automation sync to GitHub repository..."
echo "📅 Timestamp: $TIMESTAMP"

# Clean up any existing temp directory
if [ -d "$TEMP_DIR" ]; then
    echo "🧹 Cleaning up existing temp directory..."
    rm -rf "$TEMP_DIR"
fi

# Clone the repository
echo "📥 Cloning repository..."
git clone "$REPO_URL" "$TEMP_DIR"
cd "$TEMP_DIR"

# Sync Backend Files
echo "📁 Syncing live backend files..."
rsync -av --delete \
    --exclude='.*' \
    --exclude='node_modules/' \
    --exclude='logs/' \
    --exclude='uploads/' \
    --exclude='*.log' \
    --exclude='apikeys.json' \
    --exclude='ecosystem.config.js' \
    "$BACKEND_SOURCE/" "$TEMP_DIR/Backend/"

# Create backend .env template
echo "📝 Creating backend .env template..."
cat > "$TEMP_DIR/Backend/.env.template" << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Email Configuration
EMAIL_HOST=your_email_host
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password

# API Keys
QUICKBOOKS_CLIENT_ID=your_quickbooks_client_id
QUICKBOOKS_CLIENT_SECRET=your_quickbooks_client_secret

# Server Configuration
PORT=3001
NODE_ENV=production
EOF

# Handle Frontend - Check if we have a way to get latest frontend
echo "📱 Handling frontend sync..."

# Option 1: If frontend already exists in repo, keep it and update specific files
if [ -d "$TEMP_DIR/Frontend" ]; then
    echo "✅ Frontend directory exists, preserving existing files..."
    
    # Create frontend .env template if it doesn't exist
    if [ ! -f "$TEMP_DIR/Frontend/.env.template" ]; then
        echo "📝 Creating frontend .env template..."
        cat > "$TEMP_DIR/Frontend/.env.template" << 'EOF'
# API Configuration
VITE_API_URL=https://api.allrooftakeoffs.com.au
VITE_SOCKET_URL=https://api.allrooftakeoffs.com.au

# Environment
VITE_NODE_ENV=production

# Feature Flags
VITE_ENABLE_DEBUG=false
VITE_ENABLE_SOCKET=true
EOF
    fi
else
    # Option 2: Create a basic frontend structure
    echo "📁 Creating frontend directory structure..."
    mkdir -p "$TEMP_DIR/Frontend/src"
    
    # Create basic frontend files
    cat > "$TEMP_DIR/Frontend/package.json" << 'EOF'
{
  "name": "allroof-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5"
  }
}
EOF
    
    cat > "$TEMP_DIR/Frontend/.env.template" << 'EOF'
# API Configuration
VITE_API_URL=https://api.allrooftakeoffs.com.au
VITE_SOCKET_URL=https://api.allrooftakeoffs.com.au

# Environment
VITE_NODE_ENV=production

# Feature Flags
VITE_ENABLE_DEBUG=false
VITE_ENABLE_SOCKET=true
EOF

    cat > "$TEMP_DIR/Frontend/README.md" << 'EOF'
# AllRoof Frontend

## Setup Instructions

1. Copy `.env.template` to `.env.local`
2. Update the environment variables
3. Run `npm install`
4. Run `npm run dev` for development

## Deployment

Run `npm run build` to create production build.
EOF
fi

# Create/update main .gitignore
echo "📝 Updating .gitignore..."
cat > "$TEMP_DIR/.gitignore" << 'EOF'
# Dot files and folders (security)
.*
!.gitignore
!.env.template

# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tgz

# Runtime files
*.log
logs/
uploads/
temp/

# Environment files
.env
.env.local
.env.production

# Database
*.db
*.sqlite

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Sensitive files
apikeys.json
ecosystem.config.js
*.pem
*.key
*.crt

# PM2
.pm2/

# Large files
*.zip
*.tar.gz
*.pdf
*.jpg
*.png
*.gif
*.mp4
EOF

# Create automation status file
echo "📊 Creating automation status..."
cat > "$TEMP_DIR/AUTOMATION_STATUS.md" << EOF
# Automation Status

## Last Sync: $TIMESTAMP

### Backend Sync ✅
- Live backend files synchronized
- Sensitive files excluded (dot files, apikeys.json, etc.)
- .env.template created

### Frontend Sync 📱
- Frontend structure maintained
- .env.template created
- Ready for local development files

### Security 🔒
- All dot files/folders excluded
- API keys and sensitive data protected
- Proper .gitignore configuration

### Next Steps
1. Update frontend files locally
2. Push changes to GitHub
3. Deploy as needed

---
*Generated by full-sync-automation.sh*
EOF

# Check git status
echo "📋 Checking changes..."
git add .

# Check if there are any changes
if git diff --staged --quiet; then
    echo "✅ No changes detected - everything is up to date!"
    echo "📍 Repository location: $TEMP_DIR"
    exit 0
else
    echo "📋 Staging changes..."
    
    # Commit changes
    echo "💾 Committing changes..."
    git commit -m "🚀 Full automation sync - Backend + Frontend - $TIMESTAMP

Backend:
- Live server files synchronized
- Sensitive data excluded
- Environment template updated

Frontend:
- Structure maintained/created
- Environment template updated
- Ready for local updates

Security:
- All dot files/folders excluded
- API keys protected
- Proper .gitignore enforced"
    
    # Push to GitHub
    echo "📤 Pushing to GitHub..."
    git push origin main
    
    echo ""
    echo "🎉 FULL AUTOMATION SYNC COMPLETE!"
    echo "✅ Backend synced from live VPS"
    echo "✅ Frontend structure maintained/created"
    echo "✅ Security exclusions enforced"
    echo "✅ Changes pushed to GitHub"
    echo ""
    echo "📍 Repository location: $TEMP_DIR"
    echo "🌐 GitHub: https://github.com/HeyItsDizzy/AllRoofProjects"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Your repository is now updated with latest backend"
    echo "   2. Frontend structure is ready for your local files"
    echo "   3. Use the PowerShell script or manual copy for frontend updates"
fi
EOF