# 🎯 Deployment Scripts - Quick Reference

## 📋 Available Scripts

### **Main Deployment**
```bash
deploy-project.bat
```
**Interactive menu with options:**
- 1 = Backend only
- 2 = Frontend only  
- 3 = Both (Backend + Frontend)

### **Quick Deployments**
```bash
quick-deploy-backend.bat     # Fast Backend deployment
quick-deploy-frontend.bat    # Fast Frontend deployment
```

### **Setup**
```bash
git-setup.bat              # One-time git configuration
```

## 🔧 Configuration

- **Backend Repository:** https://github.com/HeyItsDizzy/AllRoofProjects-Backend.git
- **Frontend Repository:** https://github.com/HeyItsDizzy/AllRoofProjects-Frontend.git
- **Git User:** Dizzy (allrooftakeoffs@gmail.com)
- **Backend Path:** `../Backend`
- **Frontend Path:** `../Frontend`

## 🚀 Usage from VS Code Terminal

```bash
# From project root
.scripts\deploy-project.bat

# Or navigate to scripts folder
cd .scripts
deploy-project.bat
```

## 🔒 Protected Files

These files are automatically excluded from git:
- `Backend/.FM/` (client files)
- `Backend/apikeys.json`
- `Backend/config/api-keys.json`
- All `.env` files
- `logs/` folders
- `node_modules/`

---
*All scripts automatically handle git initialization, commits, and pushes*