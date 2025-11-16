# Clean cPanel Deployment Instructions

## ✅ Built Locally - Ready to Deploy
- **Build Date:** November 16, 2025
- **New Theme:** Modern premium dark navy/blue
- **Build Hash:** `index-CavVanIM.js`
- **Package:** `deployment-ready-YYYYMMDD-HHMMSS.zip`

---

## 🗑️ STEP 1: Delete Everything on cPanel Subdomain

### Via cPanel File Manager (Easiest):

1. **Login to cPanel:**
   - URL: Your cPanel login URL
   - Username: `bakeandgrill`

2. **Open File Manager:**
   - Click "File Manager" icon

3. **Navigate to subdomain:**
   - Go to: `public_html/tv.bakeandgrill.mv` or wherever your subdomain points

4. **⚠️ IMPORTANT - Backup Database First:**
   - Download `server/database/database.sqlite` to your computer
   - This contains all your users, playlists, favorites, history

5. **Delete ALL files/folders in the subdomain directory:**
   - Select All (Ctrl+A or Cmd+A)
   - Click "Delete"
   - Confirm deletion

   **OR delete selectively:**
   - Select everything EXCEPT:
     - Don't select anything - delete it all, we'll upload fresh

---

## 📤 STEP 2: Upload Fresh Code

1. **In cPanel File Manager:**
   - Navigate to your now-empty subdomain directory
   - Click "Upload" button
   
2. **Upload the deployment zip:**
   - Select: `deployment-ready-YYYYMMDD-HHMMSS.zip`
   - Wait for upload to complete

3. **Extract the zip:**
   - Right-click the uploaded zip file
   - Click "Extract"
   - Confirm extraction
   - **Delete the zip file** after extraction

4. **Verify structure:**
   - You should now see:
     - `client/` folder (with `dist/` inside)
     - `server/` folder
     - `docs/` folder
     - Various `.md` files

---

## 🔧 STEP 3: Configure Environment

### Via cPanel Terminal (if available):

```bash
cd ~/public_html/tv.bakeandgrill.mv/server

# Create/verify .env file
cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-random-string-change-this

# Server Configuration
NODE_ENV=production
PORT=4000

# CORS Origins (your domain)
CORS_ORIGINS=https://tv.bakeandgrill.mv,https://www.tv.bakeandgrill.mv

# Default Admin (only for first setup)
ALLOW_DEFAULT_ADMIN=true
DEFAULT_ADMIN_EMAIL=admin@bakegrill.com
DEFAULT_ADMIN_PASSWORD=BakeGrill2025!
EOF

# Set proper permissions
chmod 600 .env
```

### Via cPanel File Manager (if no terminal):

1. Navigate to `server/` folder
2. Click "+ File" → Create file named `.env`
3. Right-click `.env` → Edit
4. Paste the content above (with your actual database credentials)
5. Save

---

## 📦 STEP 4: Install Dependencies (Server Only)

### Via cPanel Terminal:

```bash
cd ~/public_html/tv.bakeandgrill.mv/server

# Install production dependencies
npm install --production

# Verify installation
ls -la node_modules/
```

### If you don't have terminal access:
- You may need to contact your hosting provider
- Or use SSH if available
- Node.js must be installed on your server

---

## 🚀 STEP 5: Start the Server

### Via cPanel Terminal or SSH:

```bash
cd ~/public_html/tv.bakeandgrill.mv/server

# Stop any old processes first
killall node 2>/dev/null

# Start the server in background
nohup node server.js > server.log 2>&1 &

# Verify it's running
curl http://localhost:4000/api/health

# Should return: {"status":"ok",...}
```

### Alternative - Using PM2 (if available):

```bash
cd ~/public_html/tv.bakeandgrill.mv/server

# Install PM2 globally (if not installed)
npm install -g pm2

# Start with PM2
pm2 start server.js --name "bake-grill-tv"

# Save PM2 process list
pm2 save

# Setup PM2 to start on reboot
pm2 startup
```

---

## 🌐 STEP 6: Configure Web Server (Apache/Nginx)

### For Apache (.htaccess):

Create `.htaccess` in subdomain root:

```bash
cd ~/public_html/tv.bakeandgrill.mv

cat > .htaccess << 'EOF'
# Enable RewriteEngine
RewriteEngine On

# Serve static files from client/dist
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ client/dist/$1 [L]

# If file doesn't exist in dist, proxy to Node.js server
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^(.*)$ http://localhost:4000/$1 [P,L]

# Fallback to index.html for client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ client/dist/index.html [L]

# Disable caching for critical files
<FilesMatch "\.(html|js|css)$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
  Header set Expires 0
</FilesMatch>

# Allow service worker
<FilesMatch "sw\.js$">
  Header set Service-Worker-Allowed "/"
  Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>
EOF
```

### Via cPanel:
1. Navigate to subdomain root
2. Click "+ File" → `.htaccess`
3. Edit and paste the above content

---

## ✅ STEP 7: Verify Deployment

### 1. Check server is running:
```bash
curl http://localhost:4000/api/health
```

### 2. Check what files are being served:
```bash
cd ~/public_html/tv.bakeandgrill.mv/client/dist
cat index.html | grep "index-"
# Should show: index-CavVanIM.js (NEW BUILD)
```

### 3. Visit your site:
- **URL:** https://tv.bakeandgrill.mv
- **Clear cache:** Ctrl+Shift+R (hard refresh)
- **Or use:** Private/Incognito mode

### 4. Check for new theme:
- Background should be **deep navy** (#0A0E17)
- Accent should be **blue** (#3B82F6), not amber
- Desktop: 3 panels (channels | player | info)
- Mobile: Player at top with bottom drawer

---

## 🐛 Troubleshooting

### Still seeing old version?

**1. Clear service workers:**
- Open Browser DevTools (F12)
- Go to Application tab → Service Workers
- Click "Unregister" on all service workers
- Hard refresh

**2. Check actual files on server:**
```bash
cd ~/public_html/tv.bakeandgrill.mv/client/dist/assets
ls -lh index-*.js

# You should see:
# index-CavVanIM.js  (NEW - 207.52 KB)
```

**3. Force cache clear via .htaccess** (already included above)

**4. Check server logs:**
```bash
cd ~/public_html/tv.bakeandgrill.mv/server
tail -50 server.log
# or
tail -50 nohup.out
```

### Server won't start?

**Check port availability:**
```bash
netstat -tlnp | grep :4000
# or
ss -tlnp | grep :4000

# If port is in use, kill the process:
kill -9 <PID>
```

**Check .env file:**
```bash
cd ~/public_html/tv.bakeandgrill.mv/server
cat .env
# Verify all required variables are set
```

**Check Node.js version:**
```bash
node --version
# Should be v18+ or v20+
```

---

## 📋 Quick Checklist

- [ ] Database backed up (`database.sqlite` downloaded)
- [ ] Old files deleted from subdomain
- [ ] `deployment-ready-*.zip` uploaded and extracted
- [ ] `.env` file created with correct database credentials
- [ ] `npm install --production` completed in `server/`
- [ ] Node.js server started (port 4000)
- [ ] `.htaccess` configured for routing and cache-busting
- [ ] Health endpoint responds: `curl http://localhost:4000/api/health`
- [ ] Browser cache cleared (hard refresh)
- [ ] New theme visible (deep navy + blue)

---

## 🎯 Expected Result

After deployment, you should see:
- **Login page:** Deep navy background, large blue gradient logo, modern elevated form
- **Dashboard:** Navy background, blue accent, clean card layout
- **Player page (Desktop):** 3 columns - channels on left, player in center, info on right
- **Player page (Mobile):** Player first, "Now Playing" banner at top, channel drawer slides up from bottom
- **All text:** Clear and readable (no transparency issues)
- **Colors:** Navy (#0A0E17), Blue accent (#3B82F6), bright white text (#F8FAFC)

---

## 📞 Support

If you need help with any step:
1. Check server logs: `tail -f ~/public_html/tv.bakeandgrill.mv/server/server.log`
2. Check browser console for errors
3. Verify files are actually deployed: Check dist/assets/ for `index-CavVanIM.js`

