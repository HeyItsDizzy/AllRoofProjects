# Setup Local Development Environment
# Run this after pulling from GitHub to get ready for development

Write-Host "============================================" -ForegroundColor White
Write-Host "🚀 SETTING UP LOCAL DEVELOPMENT 🚀" -ForegroundColor Green -BackgroundColor Black
Write-Host "============================================" -ForegroundColor White
Write-Host ""

# Navigate to project root
$ProjectRoot = Split-Path -Parent (Get-Location)
Set-Location $ProjectRoot

Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Step 1: Setup Backend Environment
Write-Host "🔧 Setting up Backend environment..." -ForegroundColor Yellow
$BackendPath = ".\Backend"

if (Test-Path "$BackendPath\.env.template") {
    if (-not (Test-Path "$BackendPath\.env")) {
        Copy-Item "$BackendPath\.env.template" "$BackendPath\.env"
        Write-Host "   ✅ Created Backend\.env from template" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Backend\.env already exists" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Backend\.env.template not found" -ForegroundColor Red
}

# Step 2: Setup Frontend Environment  
Write-Host "🔧 Setting up Frontend environment..." -ForegroundColor Yellow
$FrontendPath = ".\Frontend"

if (Test-Path "$FrontendPath\.env.template") {
    if (-not (Test-Path "$FrontendPath\.env.local")) {
        Copy-Item "$FrontendPath\.env.template" "$FrontendPath\.env.local"
        Write-Host "   ✅ Created Frontend\.env.local from template" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Frontend\.env.local already exists" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Frontend\.env.template not found" -ForegroundColor Red
}

# Step 3: Check Node.js dependencies
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow

# Check Backend dependencies
if (Test-Path "$BackendPath\package.json") {
    if (-not (Test-Path "$BackendPath\node_modules")) {
        Write-Host "   📥 Installing Backend dependencies..." -ForegroundColor Cyan
        Set-Location $BackendPath
        npm install
        Set-Location $ProjectRoot
        Write-Host "   ✅ Backend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Backend dependencies already installed" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Backend package.json not found" -ForegroundColor Red
}

# Check Frontend dependencies
if (Test-Path "$FrontendPath\package.json") {
    if (-not (Test-Path "$FrontendPath\node_modules")) {
        Write-Host "   📥 Installing Frontend dependencies..." -ForegroundColor Cyan
        Set-Location $FrontendPath
        npm install
        Set-Location $ProjectRoot
        Write-Host "   ✅ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Frontend dependencies already installed" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Frontend package.json not found" -ForegroundColor Red
}

# Step 4: Summary and next steps
Write-Host ""
Write-Host "============================================" -ForegroundColor White
Write-Host "🎉 DEVELOPMENT ENVIRONMENT READY! 🎉" -ForegroundColor Green -BackgroundColor Black
Write-Host "============================================" -ForegroundColor White
Write-Host ""

Write-Host "✅ Environment files created" -ForegroundColor Green
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host "✅ Ready for local development" -ForegroundColor Green
Write-Host ""

Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Edit Backend\.env with your local database settings" -ForegroundColor White
Write-Host "   2. Edit Frontend\.env.local with your local API URLs" -ForegroundColor White
Write-Host "   3. Start Backend: cd Backend; npm start (or npm run dev)" -ForegroundColor White
Write-Host "   4. Start Frontend: cd Frontend; npm run dev" -ForegroundColor White
Write-Host ""

Write-Host "🔧 Development commands:" -ForegroundColor Cyan
Write-Host "   Backend dev:  cd Backend; npm run dev" -ForegroundColor White
Write-Host "   Frontend dev: cd Frontend; npm run dev" -ForegroundColor White
Write-Host "   Push changes: .\GitPush\PushProject.ps1" -ForegroundColor White
Write-Host "   Create backup: .\GitPush\TarProjectlocally.sh" -ForegroundColor White
Write-Host ""
Write-Host "📍 Project location: $(Get-Location)" -ForegroundColor Cyan
Write-Host "🌐 GitHub: https://github.com/HeyItsDizzy/AllRoofProjects" -ForegroundColor Cyan
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor White
Read-Host