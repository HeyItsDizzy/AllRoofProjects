@echo off
rem 🎨 Quick Frontend Deployment (Project-wide)

set "PROJECT_ROOT=%~dp0.."
set "REPO_URL=https://github.com/HeyItsDizzy/AllRoofProjects-ProjectManager.git"

cd /d "%PROJECT_ROOT%"

echo 🔄 Quick Frontend deployment (full project)...

rem Initialize git if needed
if not exist ".git" (
    echo 🔄 Initializing git repository...
    git init
    git branch -M main
    git remote add origin %REPO_URL%
)

git add .

git diff --staged --quiet >nul 2>&1
if %errorlevel%==0 (
    echo ✅ No changes to commit
    pause
    exit /b 0
)

set /p "commit_msg=💬 Enter commit message (or press Enter for auto-message): "

if "%commit_msg%"=="" set "commit_msg=Frontend quick update - %DATE% %TIME%"

git commit -m "%commit_msg%"
git push origin main

if %errorlevel%==0 (
    echo 🎉 ProjectManagerApp deployed successfully!
) else (
    echo ❌ Push failed - check authentication
)

pause