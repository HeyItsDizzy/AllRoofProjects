# 🎯 AllRoof Projects - Quick Reference Card
**Repository:** https://github.com/HeyItsDizzy/AllRoofProjects
**Git User:** Dizzy (allrooftakeoffs@gmail.com)

## 🚀 First Time Setup
```bash
# 1. Run git configuration (one time only)
git-setup.bat

# 2. Create repository on GitHub: 
# https://github.com/HeyItsDizzy/AllRoofProjects

# 3. Initialize and deploy project
deploy-project.bat
# Choose option 3 (Deploy Both)
```

## 📦 Daily Deployment Commands

### Quick Individual Updates
```bash
quick-deploy-backend.bat     # Backend changes only
quick-deploy-frontend.bat    # Frontend changes only
```

### Combined Updates
```bash
deploy-project.bat           # Interactive menu
# Choose option 3 for both components
```

### VPS Deployment
```bash
deploy-project.bat           # After git push
# Choose option 4 for VPS deployment
```

## ⚡ Ultra-Quick Commands
```bash
# Backend quick commit
cd Backend && git add . && git commit -m "Quick fix" && git push

# Frontend quick commit  
cd Frontend && git add . && git commit -m "UI update" && git push
```

## 🔒 Protected Files (Never Committed)
- `Backend/.FM/` (client files)
- `Backend/apikeys.json`
- `Backend/config/api-keys.json`
- All `.env` files
- `logs/` folders
- `node_modules/`

## 🏗️ VPS Paths
- Backend: `/root/ART/ProjectManagerApp/Backend`
- Frontend: `/var/www/allroofs-frontend` (if separate)

## 🔧 Troubleshooting
```bash
# Check git config
git config --global user.name
git config --global user.email

# Re-add remote if needed
git remote add origin https://github.com/HeyItsDizzy/AllRoofProjects.git

# Check repository status
git status
git remote -v
```

---
🎉 **Your AllRoof deployment system is ready!**