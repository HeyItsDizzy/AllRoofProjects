# Fast Development & Deployment Workflow

## 🚀 Quick Deployment Options

### 1. Fast Git-Based Deployment (Recommended)
```bash
# Windows
npm run deploy:fast:win

# Linux/Mac  
npm run deploy:fast
```

### 2. Quick Git Push Only
```bash
npm run git:push
```

### 3. Manual Steps
```bash
git add .
git commit -m "Your message"
git push origin master
```

## 🔧 Local Development

### Start Development Server
```bash
# Windows
./dev-start.bat

# Or manually
npm run dev
```

### Test Locally
```bash
npm run local:test
```

## 📡 VPS Deployment

### Option A: Automatic (if configured in deploy-fast script)
- Run `npm run deploy:fast:win` and choose 'y' for auto-deploy

### Option B: Manual VPS Commands
```bash
# SSH to your VPS, then:
cd /path/to/your/backend
git pull origin master
npm install --production
pm2 restart all
```

### Option C: VPS Script (recommended for VPS)
```bash
# Copy vps-deploy-pull.sh to your VPS and run:
./deploy-pull.sh
```

## 🔄 Workflow Summary

1. **Make changes locally**
2. **Test with** `npm run dev`
3. **Deploy with** `npm run deploy:fast:win`
4. **VPS automatically pulls and restarts**

## 📋 Files Created for This Workflow

- `deploy-fast.bat/sh` - Main deployment script
- `dev-start.bat` - Local development setup  
- `vps-deploy-pull.sh` - VPS-side deployment script
- Updated `package.json` - Added convenience scripts
- Updated `.gitignore` - Excludes sensitive files

## ⚡ Benefits

- **Fast**: Only transfers git changes (not entire codebase)
- **Safe**: Test locally before deploying
- **Automatic**: One command deploys everything
- **Rollback**: Git history allows easy rollbacks

## 🔐 Security Notes

- Sensitive files (`.env`, `apikeys.json`) are excluded from git
- Configure these separately on your VPS
- Use SSH keys for passwordless deployment