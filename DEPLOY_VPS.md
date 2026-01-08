# IanTube - Hướng dẫn Deploy lên Google Cloud VPS

## Bước 1: SSH vào VPS

```bash
# Thay YOUR_VPS_IP bằng IP external của Compute Engine
ssh username@YOUR_VPS_IP
```

Hoặc dùng **gcloud** CLI:
```bash
gcloud compute ssh YOUR_VM_NAME --zone YOUR_ZONE
```

---

## Bước 2: Upload code lên VPS

### Cách 1: Dùng SCP (từ máy local của bạn)
```powershell
# Chạy trên PowerShell Windows
scp -r d:\Ark_3\YTBCloneVideo username@YOUR_VPS_IP:/home/username/iantube
```

### Cách 2: Git Clone (nếu code đã up GitHub)
```bash
# Chạy trên VPS
cd ~
git clone https://github.com/YOUR_USERNAME/iantube.git
cd iantube
```

### Cách 3: Dùng gcloud scp
```powershell
gcloud compute scp --recurse d:\Ark_3\YTBCloneVideo YOUR_VM_NAME:/home/username/iantube --zone YOUR_ZONE
```

---

## Bước 3: Cài đặt trên VPS

SSH vào VPS rồi chạy:

```bash
# 1. Cài Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Cài PM2 (process manager)
sudo npm install -g pm2

# 3. Vào thư mục app
cd ~/iantube

# 4. Cài dependencies
npm install

# 5. Build production
npm run build

# 6. Start với PM2
pm2 start npm --name "iantube" -- start
pm2 save
pm2 startup  # Tự động start khi reboot
```

---

## Bước 4: Mở firewall port 3000 hoặc cài Nginx

### Option A: Mở port 3000 trực tiếp (nhanh)
```bash
# Trên GCP Console > VPC Network > Firewall Rules
# Tạo rule cho tcp:3000
# Hoặc dùng gcloud:
gcloud compute firewall-rules create allow-iantube \
  --allow tcp:3000 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow IanTube port 3000"
```

Sau đó truy cập: `http://YOUR_VPS_IP:3000`

### Option B: Dùng Nginx reverse proxy (port 80, khuyến khích)
```bash
# Cài Nginx
sudo apt-get install -y nginx

# Tạo config
sudo nano /etc/nginx/sites-available/iantube
```

Paste nội dung:
```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300;
    }
}
```

Kích hoạt:
```bash
sudo ln -sf /etc/nginx/sites-available/iantube /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Truy cập: `http://YOUR_VPS_IP`

---

## Bước 5: Kiểm tra

```bash
# Xem status
pm2 status

# Xem logs
pm2 logs iantube

# Restart
pm2 restart iantube
```

---

## Troubleshooting

### Lỗi ytdl bị rate limit (429)
Cần thêm cookies YouTube. Trên VPS:
```bash
# Mở Firefox hoặc Chrome, login YouTube
# Export cookies bằng extension "cookies.txt"
# Copy file cookies.txt vào ~/iantube/cookies.txt
```

### Lỗi CORS
Đảm bảo trong `next.config.mjs` có cấu hình đúng domains.

### Xem logs chi tiết
```bash
pm2 logs iantube --lines 100
```
