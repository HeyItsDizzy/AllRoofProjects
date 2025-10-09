# Push Current Local Project to GitHub
# Run this from your local ProjectManagerApp directory in PowerShell

param(
    [string]$ProjectPath = "C:\Coding\AllRoofsWebApps\ProjectManagerApp"
)

Write-Host ""
Write-Host "============================================" -ForegroundColor White
Write-Host "🚀 PUSH LOCAL PROJECT TO GITHUB 🚀" -ForegroundColor Green -BackgroundColor Black
Write-Host "============================================" -ForegroundColor White
Write-Host ""

# Navigate to project directory
if (-not (Test-Path $ProjectPath)) {
    Write-Host "❌ ERROR: Project path not found: $ProjectPath" -ForegroundColor Red
    Write-Host "Please update the ProjectPath parameter or run from the correct directory" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to close..." -ForegroundColor White
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "📁 Project found at: $ProjectPath" -ForegroundColor Green
Set-Location $ProjectPath

# Initialize git if not already done
if (-not (Test-Path ".git")) {
    Write-Host "🔧 Initializing git repository..." -ForegroundColor Yellow
    git init
    git remote add origin https://github.com/HeyItsDizzy/AllRoofProjects.git
}

# Create/update .gitignore for local development
Write-Host "📝 Creating .gitignore..." -ForegroundColor Yellow
$GitIgnoreContent = @"
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

# IDE files
.vscode/
.idea/

# OS files
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
"@

$GitIgnoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8

# Stage all files
Write-Host "📋 Staging all local files..." -ForegroundColor Yellow
git add .

# Check if there are changes
$status = git status --porcelain
if ($status) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "💾 Committing local project..." -ForegroundColor Yellow
    git commit -m "🏠 Push current local frontend + backend - $timestamp

Local Development State:
- Frontend: Current local development version
- Backend: Current local development version
- Ready for live backend sync overlay"
    
    Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
    try {
        git push origin main -f  # Force push to ensure we overwrite
        Write-Host "✅ Push to GitHub successful!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ ERROR: Failed to push to GitHub!" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Press any key to close..." -ForegroundColor White
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    
    Write-Host ""
    Write-Host "🎉 LOCAL PROJECT PUSHED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "✅ Frontend (local) pushed to GitHub" -ForegroundColor Green
    Write-Host "✅ Backend (local) pushed to GitHub" -ForegroundColor Green
    Write-Host "📝 Next: VPS will sync live backend to overlay the backend portion" -ForegroundColor Cyan
} else {
    Write-Host "✅ No changes detected" -ForegroundColor Green
}

Write-Host ""
Write-Host "📍 Project pushed from: $ProjectPath" -ForegroundColor Cyan
Write-Host "🌐 GitHub: https://github.com/HeyItsDizzy/AllRoofProjects" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏭️  Next step: Run live backend sync from VPS" -ForegroundColor Yellow

# Final success confirmation
Write-Host ""
Write-Host "============================================" -ForegroundColor White
Write-Host "🎯 SCRIPT COMPLETED SUCCESSFULLY! 🎯" -ForegroundColor Green -BackgroundColor Black
Write-Host "============================================" -ForegroundColor White
Write-Host ""
Write-Host "Check your GitHub repo to confirm the push worked:" -ForegroundColor Yellow
Write-Host "https://github.com/HeyItsDizzy/AllRoofProjects" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")