#!/bin/bash

# Simple Git Push Script for Frontend + Backend
# Run this from your ProjectManagerApp directory

echo "============================================"
echo "🚀 PUSHING LOCAL PROJECT TO GITHUB 🚀"
echo "============================================"
echo ""

# Navigate to the project root (one level up from GitPush folder)
cd "$(dirname "$0")/.."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ ERROR: Not a git repository!"
    echo "Please run: git init"
    echo "Then: git remote add origin https://github.com/HeyItsDizzy/AllRoofProjects.git"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "📁 Current directory: $(pwd)"
echo ""

# Check git status
echo "📋 Checking git status..."
git status --short

echo ""
echo "� Removing secrets from git history..."
git rm --cached Frontend/.env.development 2>/dev/null || true
git rm -r --cached "Frontend/dist (Rollback)" 2>/dev/null || true
git rm --cached Backend/.env 2>/dev/null || true
git rm --cached Backend/apikeys.json 2>/dev/null || true

echo ""
echo "📝 Adding all files..."
git add .

echo ""
echo "💾 Committing changes..."
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "🏠 Push current local frontend + backend - $TIMESTAMP

Local Development State:
- Frontend: Current local development version  
- Backend: Current local development version
- Security: .env files removed from git tracking
- Ready for live backend sync overlay"

echo ""
echo "📤 Pushing to GitHub..."
echo "   (Force pushing to overwrite remote changes)"
if git push origin main --force; then
    echo ""
    echo "============================================"
    echo "🎉 SUCCESS! PROJECT PUSHED TO GITHUB! 🎉"
    echo "============================================"
    echo ""
    echo "✅ Frontend (local) pushed to GitHub"
    echo "✅ Backend (local) pushed to GitHub" 
    echo ""
    echo "🌐 Check your repo: https://github.com/HeyItsDizzy/AllRoofProjects"
    echo ""
    echo "📝 Next: Run live backend sync from VPS to overlay latest backend"
else
    echo ""
    echo "❌ ERROR: Failed to push to GitHub!"
    echo "Please check your internet connection and git remote setup"
fi

echo ""
echo "Press Enter to exit..."
read