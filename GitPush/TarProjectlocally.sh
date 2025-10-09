#!/bin/bash

# Tar Backup Script for Local Project
# Creates a clean backup excluding node_modules, dot files, and other unnecessary files

echo "============================================"
echo "📦 CREATING TAR BACKUP OF LOCAL PROJECT 📦"
echo "============================================"
echo ""

# Navigate to the parent directory (AllRoofsWebApps) to tar the entire ProjectManagerApp folder
cd "$(dirname "$0")/../.."

PROJECT_NAME="ProjectManagerApp"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_NAME="${PROJECT_NAME}_backup_${TIMESTAMP}.tar.gz"
ARCHIVE_DIR="./ProjectManagerApp - Archive"
BACKUP_PATH="${ARCHIVE_DIR}/${BACKUP_NAME}"

# Create Archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

echo "📁 Current directory: $(pwd)"
echo "📦 Backup name: $BACKUP_NAME"
echo "💾 Backup location: $(pwd)/${ARCHIVE_DIR}/${BACKUP_NAME}"
echo ""

echo "📋 Creating tar backup with exclusions..."
echo "   Excluding: node_modules, dot files, logs, uploads, build files..."

# Create tar with exclusions (same rules as .gitignore)
tar -czf "$BACKUP_PATH" \
    --exclude='ProjectManagerApp/.*' \
    --exclude='ProjectManagerApp/*/node_modules' \
    --exclude='ProjectManagerApp/*/*/node_modules' \
    --exclude='ProjectManagerApp/*/*/*/node_modules' \
    --exclude='ProjectManagerApp/*/npm-debug.log*' \
    --exclude='ProjectManagerApp/*/yarn-debug.log*' \
    --exclude='ProjectManagerApp/*/yarn-error.log*' \
    --exclude='ProjectManagerApp/*/dist' \
    --exclude='ProjectManagerApp/*/build' \
    --exclude='ProjectManagerApp/*/*.tgz' \
    --exclude='ProjectManagerApp/*/*.log' \
    --exclude='ProjectManagerApp/*/logs' \
    --exclude='ProjectManagerApp/*/uploads' \
    --exclude='ProjectManagerApp/*/temp' \
    --exclude='ProjectManagerApp/*/.env' \
    --exclude='ProjectManagerApp/*/.env.local' \
    --exclude='ProjectManagerApp/*/.env.production' \
    --exclude='ProjectManagerApp/*/*.db' \
    --exclude='ProjectManagerApp/*/*.sqlite' \
    --exclude='ProjectManagerApp/*/.vscode' \
    --exclude='ProjectManagerApp/*/.idea' \
    --exclude='ProjectManagerApp/*/.DS_Store' \
    --exclude='ProjectManagerApp/*/Thumbs.db' \
    --exclude='ProjectManagerApp/*/apikeys.json' \
    --exclude='ProjectManagerApp/*/ecosystem.config.js' \
    --exclude='ProjectManagerApp/*/*.pem' \
    --exclude='ProjectManagerApp/*/*.key' \
    --exclude='ProjectManagerApp/*/*.crt' \
    --exclude='ProjectManagerApp/*/.pm2' \
    --exclude='ProjectManagerApp/*/*.zip' \
    --exclude='ProjectManagerApp/*/*.tar.gz' \
    --exclude='ProjectManagerApp/*/*.pdf' \
    --exclude='ProjectManagerApp/*/*.jpg' \
    --exclude='ProjectManagerApp/*/*.png' \
    --exclude='ProjectManagerApp/*/*.gif' \
    --exclude='ProjectManagerApp/*/*.mp4' \
    --exclude='ProjectManagerApp/*/coverage' \
    --exclude='ProjectManagerApp/*/.nyc_output' \
    --exclude='ProjectManagerApp/*/.cache' \
    ProjectManagerApp

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "🎉 BACKUP CREATED SUCCESSFULLY! 🎉"
    echo "============================================"
    echo ""
    
    # Get file size
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    
    echo "✅ Backup completed successfully"
    echo "📦 File: $BACKUP_NAME"
    echo "📁 Location: $(pwd)/${ARCHIVE_DIR}/${BACKUP_NAME}"
    echo "📏 Size: $BACKUP_SIZE"
    echo ""
    echo "🗂️  Excluded items:"
    echo "   • node_modules directories"
    echo "   • Dot files/folders (.*)"
    echo "   • Log files and uploads"
    echo "   • Build/dist directories"
    echo "   • Sensitive files (apikeys.json, .env, etc.)"
    echo "   • Large media files"
    echo ""
    echo "📝 To restore: tar -xzf $BACKUP_NAME"
else
    echo ""
    echo "❌ ERROR: Failed to create backup!"
    echo "Please check file permissions and available disk space"
fi

echo ""
echo "Press Enter to exit..."
read