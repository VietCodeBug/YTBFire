#!/bin/bash
# =====================================================
# IanTube VPS Deployment Script (No Docker)
# Deploy to Google Cloud Compute Engine via SSH
# =====================================================

echo "🚀 Deploying IanTube to VPS..."

# === Step 1: Install Node.js (if not installed) ===
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

node -v
npm -v

# === Step 2: Clone/Pull repository ===
APP_DIR="/home/$USER/iantube"

if [ -d "$APP_DIR" ]; then
    echo "📁 Updating existing installation..."
    cd $APP_DIR
    git pull origin main 2>/dev/null || true
else
    echo "📁 Creating app directory..."
    mkdir -p $APP_DIR
fi

# === Step 3: Install PM2 (process manager) ===
echo "🔧 Installing PM2..."
sudo npm install -g pm2

# === Step 4: Install dependencies ===
cd $APP_DIR
echo "📦 Installing npm dependencies..."
npm install

# === Step 5: Build Next.js ===
echo "🏗️ Building Next.js app..."
npm run build

# === Step 6: Start with PM2 ===
echo "▶️ Starting app with PM2..."
pm2 delete iantube 2>/dev/null || true
pm2 start npm --name "iantube" -- start
pm2 save

# === Step 7: Setup Nginx (optional) ===
echo "🌐 Setting up Nginx reverse proxy..."
sudo apt-get install -y nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/iantube > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase timeout for video streaming
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/iantube /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅ Deployment complete!"
echo "🌐 App running at http://<YOUR_VPS_IP>"
echo ""
echo "📋 Useful commands:"
echo "   pm2 status        - Check app status"
echo "   pm2 logs iantube  - View logs"
echo "   pm2 restart iantube - Restart app"
