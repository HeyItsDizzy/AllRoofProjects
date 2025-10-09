#!/bin/bash

# Push only GitPush folder to GitHub
# This preserves our automation scripts before pulling

echo "============================================"
echo "📤 PUSHING GITPUSH SCRIPTS TO GITHUB 📤"
echo "============================================"
echo ""

# Navigate to the project root (one level up from GitPush folder)
cd "$(dirname "$0")/.."

echo "📁 Current directory: $(pwd)"
echo ""

# Add only GitPush folder files
echo "📋 Adding GitPush folder files..."
git add GitPush/

# Check if there are changes to commit
echo "📋 Checking for changes..."
git status GitPush/

if git diff --staged --quiet; then
    echo "✅ No changes in GitPush folder to commit"
else
    echo "💾 Committing GitPush folder changes..."
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    git commit -m "📁 Add GitPush automation scripts - $TIMESTAMP

Scripts added:
- PushProject.sh (bash version)
- PushProject.ps1 (PowerShell version)  
- TarProjectlocally.sh (backup script)
- PullFromGitHub.sh (pull script)

These scripts handle local development workflow"
    
    echo "📤 Pushing GitPush scripts to GitHub..."
    if git push origin main --force; then
        echo ""
        echo "============================================"
        echo "🎉 GITPUSH SCRIPTS PUSHED SUCCESSFULLY! 🎉"
        echo "============================================"
        echo ""
        echo "✅ GitPush automation scripts saved to GitHub"
        echo "✅ Scripts will be preserved during pull"
        echo ""
        echo "📝 Scripts now in GitHub:"
        echo "   • PushProject.sh (push local project)"
        echo "   • PushProject.ps1 (PowerShell version)"
        echo "   • TarProjectlocally.sh (create backup)"
        echo "   • PullFromGitHub.sh (pull from GitHub)"
    else
        echo "❌ ERROR: Failed to push GitPush scripts!"
    fi
fi

echo ""
echo "Press Enter to exit..."
read