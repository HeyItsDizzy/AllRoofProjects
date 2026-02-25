# Simple Git Push Script for Frontend + Backend (PowerShell version)
# Run this from your GitPush directory

Write-Host "============================================" -ForegroundColor White
Write-Host "🚀 PUSHING LOCAL PROJECT TO GITHUB 🚀" -ForegroundColor Green -BackgroundColor Black
Write-Host "============================================" -ForegroundColor White
Write-Host ""

# Navigate to the project root (one level up from GitPush folder)
$ProjectRoot = Split-Path -Parent (Get-Location)
Set-Location $ProjectRoot

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ ERROR: Not a git repository!" -ForegroundColor Red
    Write-Host "Please run: git init" -ForegroundColor Yellow
    Write-Host "Then: git remote add origin https://github.com/HeyItsDizzy/AllRoofProjects.git" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press Enter to exit..." -ForegroundColor White
    Read-Host
    exit 1
}

Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Check git status
Write-Host "📋 Checking git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "� Removing secrets from git history..." -ForegroundColor Yellow
git rm --cached Frontend/.env.development -ErrorAction SilentlyContinue
git rm -r --cached "Frontend/dist (Rollback)" -ErrorAction SilentlyContinue
git rm --cached Backend/.env -ErrorAction SilentlyContinue
git rm --cached Backend/apikeys.json -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "📝 Adding all files..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "🏠 Push current local frontend + backend - $timestamp

Local Development State:
- Frontend: Current local development version  
- Backend: Current local development version
- Security: .env files removed from git tracking
- Ready for live backend sync overlay"

Write-Host ""
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "   (Force pushing to overwrite remote changes)" -ForegroundColor Cyan
try {
    git push origin main --force
    Write-Host ""
    Write-Host "============================================" -ForegroundColor White
    Write-Host "🎉 SUCCESS! PROJECT PUSHED TO GITHUB! 🎉" -ForegroundColor Green -BackgroundColor Black
    Write-Host "============================================" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ Frontend (local) pushed to GitHub" -ForegroundColor Green
    Write-Host "✅ Backend (local) pushed to GitHub" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Check your repo: https://github.com/HeyItsDizzy/AllRoofProjects" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Next: Run live backend sync from VPS to overlay latest backend" -ForegroundColor Yellow
}
catch {
    Write-Host ""
    Write-Host "❌ ERROR: Failed to push to GitHub!" -ForegroundColor Red
    Write-Host "Please check your internet connection and git remote setup" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor White
Read-Host