# 🚀 Git Deployment Setup Guide
## AllRoofs Project Manager - Complete Git Workflow

### 📋 Quick Setup Checklist

**Before first deployment:**
1. ✅ Initialize git repositories 
2. ✅ Configure remote repositories
3. ✅ Verify .gitignore files protect sensitive data
4. ✅ Test deployment scripts

### 🔧 Initial Git Setup

#### Option 1: Combined Repository (Recommended for most workflows)
```bash
# From project root (c:\Coding\AllRoofsWebApps\ProjectManagerApp\)
git init
git branch -M main
git add .
git commit -m "Initial project setup - Backend + Frontend"
git remote add origin https://github.com/HeyItsDizzy/AllRoofProjects.git
git push -u origin main
```

#### Option 2: Separate Repositories
```bash
# Backend setup
cd Backend
git init
git branch -M main
git add .
git commit -m "Initial backend setup"
git remote add origin <backend-repository-url>
git push -u origin main

# Frontend setup  
cd ../Frontend
git init
git branch -M main
git add .
git commit -m "Initial frontend setup"
git remote add origin <frontend-repository-url>
git push -u origin main
```

### 🎯 Deployment Scripts Overview

**Main Deployment Script:**
- `deploy-project.bat` / `deploy-project.sh` - Full interactive deployment

**Quick Deployment Scripts:**
- `quick-deploy-backend.bat` / `.sh` - Backend only
- `quick-deploy-frontend.bat` / `.sh` - Frontend only

### 📦 Deployment Options

#### 1. **Combined Deployment (Most Common)**
```bash
# Windows
deploy-project.bat
# Select option 3 (Deploy Both)

# Linux/macOS
./deploy-project.sh
# Select option 3 (Deploy Both)
```

#### 2. **Individual Component Updates**
```bash
# Backend only
quick-deploy-backend.bat    # Windows
./quick-deploy-backend.sh   # Linux/macOS

# Frontend only
quick-deploy-frontend.bat   # Windows  
./quick-deploy-frontend.sh  # Linux/macOS
```

#### 3. **VPS Deployment**
```bash
# After git push, deploy to VPS
deploy-project.bat
# Select option 4 (Deploy to VPS)
```

### 🔒 Security Protection

**Critical files automatically excluded from git:**

**Backend:**
- `.FM/` folder (client files)
- `apikeys.json`
- `config/api-keys.json`
- `.env` files
- `logs/`

**Frontend:**
- `.env` files
- `dist/` build folder
- `node_modules/`

### 🔄 Typical Workflow Examples

#### Daily Development:
```bash
# Make changes to backend
# Quick commit and push:
quick-deploy-backend.bat

# Make changes to frontend  
# Quick commit and push:
quick-deploy-frontend.bat
```

#### Major Updates:
```bash
# Make changes to both components
# Deploy together with custom message:
deploy-project.bat
# Choose option 3, enter descriptive commit message
```

#### Production Deployment:
```bash
# 1. Deploy to git first
deploy-project.bat (option 3)

# 2. Deploy to VPS  
deploy-project.bat (option 4)
```

### 🏗️ VPS Integration

**Prerequisites:**
- SSH access to VPS configured
- Git repositories cloned on VPS
- PM2 setup for backend (if using)
- Web server configured for frontend

**VPS Paths Example:**
```
Backend VPS: /root/ART/ProjectManagerApp/Backend
Frontend VPS: /var/www/allroofs-frontend
```

### 🔧 Troubleshooting

**No remote repository configured:**
```bash
git remote add origin <repository-url>
```

**Authentication issues:**
```bash
# Setup SSH key or use personal access token
git config --global user.name "Dizzy"
git config --global user.email "allrooftakeoffs@gmail.com"
```

**VPS deployment fails:**
```bash
# Check SSH connection
ssh user@your-vps-ip

# Verify git is installed on VPS
git --version

# Check PM2 status (for backend)
pm2 list
```

### 📱 Mobile/Quick Access Commands

**Ultra-quick commits:**
```bash
# Backend
cd Backend && git add . && git commit -m "Quick fix" && git push

# Frontend  
cd Frontend && git add . && git commit -m "UI update" && git push
```

### 🎯 Best Practices

1. **Always test locally before deploying**
2. **Use descriptive commit messages**
3. **Deploy during low-traffic hours**
4. **Keep .FM folder backups separate**
5. **Monitor VPS logs after deployment**
6. **Test critical features after each deployment**

---

## 🚀 Ready to Deploy!

Choose your deployment method:
- **Quick individual updates:** Use `quick-deploy-*.bat`
- **Combined deployments:** Use `deploy-project.bat` 
- **VPS deployment:** Use `deploy-project.bat` option 4

**Next Steps:**
1. Set up your git repositories (GitHub, GitLab, etc.)
2. Run initial git setup (see above)
3. Test deployment scripts
4. Configure VPS deployment (optional)
5. Start your development workflow!