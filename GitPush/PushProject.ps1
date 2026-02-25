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
Write-Host "🔒 Removing secrets and build files from git..." -ForegroundColor Yellow
Write-Host "   (Build files contain baked-in secrets and should never be committed)" -ForegroundColor Cyan
git rm --cached Frontend/.env.development 2>$null
git rm --cached Frontend/.env.production 2>$null
git rm --cached Frontend/.env 2>$null
git rm -r --cached "Frontend/dist" 2>$null
git rm -r --cached "Frontend/dist (Rollback)" 2>$null
git rm -r --cached "Frontend/build" 2>$null
git rm --cached Backend/.env 2>$null
git rm --cached Backend/apikeys.json 2>$null

Write-Host ""
Write-Host "📝 Adding source files only (no builds, no secrets)..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "🏠 Push current local frontend + backend - $timestamp

Local Development State:
- Frontend: Source code only (no build files)
- Backend: Source code only
- Security: All .env files excluded
- Build files: Excluded (build locally, deploy via FileZilla)
- Ready for live deployment"

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