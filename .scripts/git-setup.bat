@echo off
rem 🔧 Git Configuration Setup for AllRoof Projects
rem Run this once to configure git with your details

echo 🔧 Setting up Git configuration for Dizzy...
echo.

rem Configure global git settings
git config --global user.name "Dizzy"
git config --global user.email "allrooftakeoffs@gmail.com"

rem Optional: Set default branch to main
git config --global init.defaultBranch main

rem Optional: Set up credential helper for Windows
git config --global credential.helper manager-core

echo ✅ Git configuration complete!
echo.
echo 📋 Current git configuration:
git config --global user.name
git config --global user.email
echo.
echo 🚀 Ready to use deployment scripts!
echo.
echo Next steps:
echo 1. Create repositories on GitHub:
echo    - https://github.com/HeyItsDizzy/AllRoofProjects-Backend
echo    - https://github.com/HeyItsDizzy/AllRoofProjects-Frontend
echo 2. Run: .scripts\deploy-project.bat
echo 3. Choose option 3 (Deploy Both)
echo.
pause