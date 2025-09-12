#!/bin/bash

# VPS-side deployment script
# Save this as deploy-pull.sh on your VPS

echo "🔄 Pulling latest changes from repository..."

# Navigate to backend directory
cd /path/to/your/backend  # UPDATE THIS PATH

# Pull latest changes
git pull origin master

# Install any new dependencies
echo "📦 Installing dependencies..."
npm install --production

# Restart the application
echo "🔄 Restarting application..."
if command -v pm2 &> /dev/null; then
    pm2 restart all
    pm2 status
elif command -v systemctl &> /dev/null; then
    systemctl restart your-backend-service  # UPDATE SERVICE NAME
else
    echo "⚠️ Please manually restart your backend service"
fi

echo "✅ Deployment complete!"
echo "📊 Checking status..."
curl -s http://localhost:5000/api/version || echo "⚠️ Backend might not be responding"