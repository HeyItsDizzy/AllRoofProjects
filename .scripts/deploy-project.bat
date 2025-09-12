@echo off
rem 🚀 AllRoof Project Deployment Script (Windows)
rem Choose: Backend, Frontend, or Both

setlocal EnableDelayedExpansion

rem Colors
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

rem Configuration - Self-contained ProjectManagerApp repository
set "PROJECT_ROOT=%~dp0.."
set "REPO_URL=https://github.com/HeyItsDizzy/AllRoofProjects-ProjectManager.git"

echo %BLUE%🚀 AllRoof Project Deployment%NC%
echo %YELLOW%📅 Started at: %DATE% %TIME%%NC%
echo.

:main_menu
echo %BLUE%📋 Deployment Options:%NC%
echo 1. Deploy Backend changes only
echo 2. Deploy Frontend changes only
echo 3. Deploy All Changes (Full Project)
echo 4. Exit
echo.

set /p "choice=Choose option (1-4): "

if "%choice%"=="1" goto deploy_backend
if "%choice%"=="2" goto deploy_frontend
if "%choice%"=="3" goto deploy_both
if "%choice%"=="4" goto exit_script
goto invalid_option

:deploy_backend
echo %YELLOW%📦 Deploying Backend changes...%NC%

set /p "backend_msg=Backend commit message (or press Enter for auto-message): "
if "%backend_msg%"=="" set "backend_msg=Backend update - %DATE% %TIME%"

call :deploy_project "%backend_msg%"
goto end_script

:deploy_frontend
echo %YELLOW%📦 Deploying Frontend changes...%NC%

set /p "frontend_msg=Frontend commit message (or press Enter for auto-message): "
if "%frontend_msg%"=="" set "frontend_msg=Frontend update - %DATE% %TIME%"

call :deploy_project "%frontend_msg%"
goto end_script

:deploy_both
echo %YELLOW%📦 Deploying All Project Changes...%NC%

set /p "project_msg=Project commit message (or press Enter for auto-message): "
if "%project_msg%"=="" set "project_msg=ProjectManager update - %DATE% %TIME%"

call :deploy_project "%project_msg%"
goto end_script

:deploy_project
set "commit_message=%~1"

echo %YELLOW%📦 Deploying ProjectManagerApp...%NC%

cd /d "%PROJECT_ROOT%"

rem Check if it's a git repository
if not exist ".git" (
    echo %YELLOW%🔄 Initializing git repository...%NC%
    git init
    git branch -M main
    git remote add origin %REPO_URL%
)

rem Add all changes
echo %YELLOW%📋 Adding all changes...%NC%
git add .

rem Check if there are changes to commit
git diff --staged --quiet >nul 2>&1
if %errorlevel%==0 (
    echo %GREEN%✅ No changes to commit%NC%
    goto :eof
)

rem Commit changes
echo %YELLOW%💬 Committing changes...%NC%
git commit -m "%commit_message%"

rem Push changes
echo %YELLOW%🔄 Pushing to GitHub...%NC%
git push origin main

if %errorlevel%==0 (
    echo %GREEN%✅ ProjectManagerApp deployed successfully!%NC%
) else (
    echo %RED%❌ Push failed. Check authentication.%NC%
    echo %BLUE%💡 You may need to set up GitHub authentication%NC%
)

echo.
goto :eof

:invalid_option
echo %RED%❌ Invalid option selected%NC%
goto main_menu

:exit_script
echo %GREEN%👋 Deployment cancelled%NC%
goto end_script

:exit_error
echo %RED%❌ Deployment failed%NC%
pause
exit /b 1

:end_script
echo %GREEN%✨ Deployment script completed!%NC%
pause
exit /b 0