#!/bin/bash

# Fast deployment script for Backend
echo "🚀 Starting fast deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo -e "${RED}❌ Error: package.json not found. Run this from the backend directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Checking git status...${NC}"
git status --porcelain

echo -e "${YELLOW}📦 Adding changes to git...${NC}"
git add .

echo -e "${YELLOW}💬 Committing changes...${NC}"
read -p "Enter commit message (or press Enter for auto-message): " commit_msg
if [[ -z "$commit_msg" ]]; then
    commit_msg="Backend update $(date '+%Y-%m-%d %H:%M:%S')"
fi

git commit -m "$commit_msg"

echo -e "${YELLOW}🔄 Pushing to repository...${NC}"
git push origin master

echo -e "${GREEN}✅ Local changes pushed to repository!${NC}"
echo -e "${YELLOW}📡 Now SSH to your VPS and run:${NC}"
echo -e "${GREEN}cd /path/to/your/backend && git pull && pm2 restart all${NC}"

echo -e "${YELLOW}🤖 Auto-deploy to VPS? (y/n):${NC}"
read -p "" autodeploy

if [[ "$autodeploy" == "y" || "$autodeploy" == "Y" ]]; then
    echo -e "${YELLOW}🔐 Enter your VPS details:${NC}"
    read -p "VPS IP/hostname: " vps_host
    read -p "VPS username: " vps_user
    read -p "Backend path on VPS: " vps_path
    
    echo -e "${YELLOW}🚀 Deploying to VPS...${NC}"
    ssh "$vps_user@$vps_host" "cd $vps_path && git pull && npm install --production && pm2 restart all"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}🎉 Deployment successful!${NC}"
    else
        echo -e "${RED}❌ Deployment failed. Check VPS manually.${NC}"
    fi
fi

echo -e "${GREEN}✅ Done!${NC}"