# 🏗️ AllRoof Project Manager

> **Professional project management system for AllRoof takeoffs and client management**

## 🚀 Quick Start

### **First Time Setup:**
```bash
# 1. Configure git (one time only)
.scripts\git-setup.bat

# 2. Deploy your project
.scripts\deploy-project.bat
# Choose option 3 (Deploy Both)
```

### **Daily Development:**
```bash
# Quick deployments
.scripts\quick-deploy-backend.bat     # Backend only
.scripts\quick-deploy-frontend.bat    # Frontend only

# Full deployment with menu
.scripts\deploy-project.bat
```

## 📁 Project Structure

```
ProjectManagerApp/
├── .scripts/           # All deployment and setup scripts
├── Backend/            # Node.js/Express API server
├── Frontend/           # React/Vite client application
└── README.md          # This file
```

## 🔧 Scripts Overview

| Script | Purpose |
|--------|---------|
| `deploy-project.bat` | Interactive deployment (Backend/Frontend/Both) |
| `quick-deploy-backend.bat` | Fast Backend deployment |
| `quick-deploy-frontend.bat` | Fast Frontend deployment |
| `git-setup.bat` | One-time git configuration |

## 🔒 Security Features

- ✅ `.FM` folder protected (client files never committed)
- ✅ API keys and credentials excluded
- ✅ Environment files protected
- ✅ Automated .gitignore management

## 🌐 Repositories

- **Backend:** https://github.com/HeyItsDizzy/AllRoofProjects-Backend
- **Frontend:** https://github.com/HeyItsDizzy/AllRoofProjects-Frontend

> Each component is a separate, self-contained repository

## 🏗️ VPS Integration

- **Backend VPS:** `/root/ART/ProjectManagerApp/Backend`
- **Local Development:** `c:\Coding\AllRoofsWebApps\ProjectManagerApp\`
- **VPS Mount:** `Y:\Backend` (live backend access)

## 💡 Development Workflow

1. **Make changes** to Backend and/or Frontend
2. **Test locally** to ensure everything works
3. **Deploy** using the scripts in `.scripts` folder
4. **Monitor** VPS for successful deployment

---

### 🎯 **Ready to Deploy?**

Run: `.scripts\deploy-project.bat` and choose your deployment option!

*For detailed documentation, see the guides in each component folder.*