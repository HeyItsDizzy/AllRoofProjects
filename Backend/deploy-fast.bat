@echo off
setlocal enabledelayedexpansion

REM Fast deployment script for Backend (Windows)
echo 🚀 Starting fast deployment...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Run this from the backend directory.
    pause
    exit /b 1
)

echo 📋 Checking git status...
git status --porcelain

echo 📦 Adding changes to git...
git add .

echo 💬 Committing changes...
set /p commit_msg="Enter commit message (or press Enter for auto-message): "
if "!commit_msg!"=="" (
    for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
    set "timestamp=!dt:~0,4!-!dt:~4,2!-!dt:~6,2! !dt:~8,2!:!dt:~10,2!:!dt:~12,2!"
    set "commit_msg=Backend update !timestamp!"
)

git commit -m "!commit_msg!"

echo 🔄 Pushing to repository...
git push origin master

echo ✅ Local changes pushed to repository!
echo 📡 Now SSH to your VPS and run:
echo cd /path/to/your/backend ^&^& git pull ^&^& pm2 restart all

echo.
set /p autodeploy="🤖 Auto-deploy to VPS? (y/n): "

if /i "!autodeploy!"=="y" (
    set /p vps_host="VPS IP/hostname: "
    set /p vps_user="VPS username: "
    set /p vps_path="Backend path on VPS: "
    
    echo 🚀 Deploying to VPS...
    ssh !vps_user!@!vps_host! "cd !vps_path! && git pull && npm install --production && pm2 restart all"
    
    if !errorlevel! equ 0 (
        echo 🎉 Deployment successful!
    ) else (
        echo ❌ Deployment failed. Check VPS manually.
    )
)

echo ✅ Done!
pause