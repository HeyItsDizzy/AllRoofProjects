#!/bin/bash

# Pull Latest Project from GitHub
# This will get your local frontend + latest live backend

echo "============================================"
echo "📥 PULLING LATEST PROJECT FROM GITHUB 📥"
echo "============================================"
echo ""

# Navigate to the project root (one level up from GitPush folder)
cd "$(dirname "$0")/.."

echo "📁 Current directory: $(pwd)"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ ERROR: Not a git repository!"
    echo "Please initialize git first or check your directory"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "📋 Checking current git status..."
git status --short

echo ""
echo "📥 Fetching latest changes from GitHub..."
git fetch origin main

echo ""
echo "🔄 Pulling latest changes..."
if git pull origin main; then
    echo ""
    echo "============================================"
    echo "🎉 SUCCESS! PROJECT UPDATED FROM GITHUB! 🎉"
    echo "============================================"
    echo ""
    echo "✅ Your local frontend (preserved)"
    echo "✅ Latest live backend (updated)"
    echo "✅ All automation scripts (updated)"
    echo ""
    echo "📝 What you now have:"
    echo "   • Frontend: Your local development version"
    echo "   • Backend: Latest live VPS version"
    echo "   • Perfect setup for local development"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Check that everything looks correct"
    echo "   2. Copy .env.template to .env in Backend and Frontend"
    echo "   3. Update .env files with your local settings"
    echo "   4. Run npm install in Frontend and Backend if needed"
    echo "   5. Start developing locally!"
else
    echo ""
    echo "❌ ERROR: Failed to pull from GitHub!"
    echo ""
    echo "This might be due to:"
    echo "   • Local changes that conflict with remote"
    echo "   • Network connection issues"
    echo ""
    echo "💡 If you have local changes you want to keep:"
    echo "   git stash"
    echo "   git pull origin main"
    echo "   git stash pop"
    echo ""
    echo "💡 If you want to reset to match GitHub exactly:"
    echo "   git reset --hard origin/main"
fi

echo ""
echo "Press Enter to exit..."
read