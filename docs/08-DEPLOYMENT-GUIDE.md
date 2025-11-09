# Deployment Guide

## 🎯 cPanel Node.js Deployment

This guide walks through deploying **Bake and Grill TV** on cPanel Node.js hosting.

---

## 📋 Prerequisites

### What You Need:
1. **cPanel hosting account** with Node.js support
2. **Subdomain created:** `iptv.yourdomain.com`
3. **Node.js version:** 18+ (check cPanel)
4. **SSH access** (optional, but recommended)
5. **M3U playlist URL** ready

---

## 🔨 Step 1: Build the Frontend

On your local machine:

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Build for production
npm run build
```

**Output:** Creates `/client/dist` folder with optimized static files

**Verify build:**
```bash
ls -la dist/
# Should see: index.html, assets/, favicon, PWA icons
```

---

## 📦 Step 2: Prepare Server Files

### Install server dependencies:

```bash
# Navigate to server directory
cd ../server

# Install production dependencies
npm install --production
```

### Create `.env` file:

Create `/server/.env` with:
```env
PORT=4000
M3U_URL=https://your-playlist-url.m3u
JWT_SECRET=your-very-secret-random-string-here
NODE_ENV=production
```

**⚠️ IMPORTANT:** Change `JWT_SECRET` to a random 32+ character string!

Generate secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📤 Step 3: Upload to cPanel

### Option A: File Manager Upload

1. **Login to cPanel**
2. **Open File Manager**
3. **Navigate to your subdomain directory:**
   ```
   /home/USERNAME/public_html/iptv/
   ```
   (Or wherever your subdomain points)

4. **Upload entire project:**
   - Upload `/server` folder (including node_modules)
   - Upload `/client/dist` folder
   - **Important:** Maintain folder structure:
     ```
     /home/USERNAME/public_html/iptv/
     ├── server/
     │   ├── server.js
     │   ├── node_modules/
     │   ├── .env
     │   ├── package.json
     │   └── ... (all server files)
     └── client/
         └── dist/
             ├── index.html
             ├── assets/
             └── ... (built files)
     ```

### Option B: SSH/SCP Upload (Faster)

```bash
# From your local project root
# Replace USERNAME and yourdomain.com

scp -r server USERNAME@yourdomain.com:~/public_html/iptv/
scp -r client/dist USERNAME@yourdomain.com:~/public_html/iptv/client/
```

Then SSH in to install dependencies:
```bash
ssh USERNAME@yourdomain.com
cd ~/public_html/iptv/server
npm install --production
```

### Option C: Git Deploy (Recommended for updates)

**Initial setup:**
```bash
# On cPanel (SSH)
cd ~/public_html/iptv
git clone https://github.com/yourusername/bakegrill-tv.git .

cd server
npm install --production

cd ../client
npm install
npm run build
```

**Future updates:**
```bash
cd ~/public_html/iptv
git pull
cd server && npm install
cd ../client && npm install && npm run build
# Restart app in cPanel
```

---

## ⚙️ Step 4: Configure Node.js App in cPanel

1. **Login to cPanel**

2. **Find "Setup Node.js App"** (under Software section)

3. **Click "Create Application"**

4. **Fill in details:**
   - **Node.js version:** 18.x or higher
   - **Application mode:** Production
   - **Application root:** `public_html/iptv/server`
     (Full path: `/home/USERNAME/public_html/iptv/server`)
   - **Application URL:** `iptv.yourdomain.com`
   - **Application startup file:** `server.js`
   - **Passenger log file:** (default is fine)

5. **Click "Create"**

---

## 🔐 Step 5: Set Environment Variables

In the same Node.js App configuration page:

**Click "Environment Variables" section**

Add these variables:

| Key | Value |
|-----|-------|
| `PORT` | `4000` |
| `M3U_URL` | `https://your-playlist-url.m3u` |
| `JWT_SECRET` | `your-secret-from-step-2` |
| `NODE_ENV` | `production` |

**Click "Save"**

---

## 🚀 Step 6: Start the Application

1. **In cPanel Node.js App page:**
   - Your app should be listed
   - Status should show "Started" (green)

2. **If not started:**
   - Click "Start" button
   - Wait 10-30 seconds

3. **Check log** (if any errors):
   - Click "Open Logs" button
   - Look for errors in startup

---

## ✅ Step 7: Verify Deployment

### Test the application:

1. **Open in browser:**
   ```
   https://iptv.yourdomain.com
   ```

2. **You should see:**
   - Bake and Grill TV landing page
   - Login/Register options
   - No errors in browser console (F12)

3. **Test registration:**
   - Create a test account
   - Login successfully
   - Redirected to dashboard

4. **Test API:**
   ```
   https://iptv.yourdomain.com/api/health
   ```
   **Expected response:**
   ```json
   {
     "status": "ok",
     "timestamp": "2025-11-09T12:00:00Z",
     "uptime": 123,
     "database": "connected"
   }
   ```

---

## 🔧 Troubleshooting

### Issue: Application won't start

**Check:**
1. **Node.js version** is 18+
2. **Application root** path is correct
3. **server.js** exists in application root
4. **node_modules** folder exists

**Fix:**
```bash
# SSH into server
cd ~/public_html/iptv/server
npm install
# Then restart app in cPanel
```

---

### Issue: "Cannot find module" error

**Fix:**
```bash
# Reinstall dependencies
cd ~/public_html/iptv/server
rm -rf node_modules package-lock.json
npm install
```

---

### Issue: Database error

**Check:**
1. Database file has write permissions
2. Server has permissions to create database file

**Fix:**
```bash
# SSH into server
cd ~/public_html/iptv/server
chmod 755 .
# If database.db exists:
chmod 644 database.db
```

---

### Issue: 404 on frontend routes

**Cause:** Express not serving frontend correctly

**Check `/server/server.js` has:**
```javascript
// Serve static files from React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// All other routes return React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
```

---

### Issue: CORS errors

**Fix in `/server/server.js`:**
```javascript
const cors = require('cors');

const corsOptions = {
  origin: ['https://iptv.yourdomain.com', 'http://localhost:5173'],
  credentials: true,
};

app.use(cors(corsOptions));
```

---

### Issue: M3U playlist not loading

**Check:**
1. `M3U_URL` environment variable is set
2. URL is accessible (test in browser)
3. URL returns valid M3U content

**Test:**
```bash
curl "https://your-playlist-url.m3u"
```

**Check server logs:**
```bash
# In cPanel, click "Open Logs" on your Node.js app
```

---

### Issue: Video won't play

**Possible causes:**
1. **M3U URL invalid:** Check format
2. **Stream URL requires CORS:** Can't fix on client side
3. **HLS stream on HTTP site:** Must use HTTPS
4. **Stream offline:** Try different channel

**Debug:**
- Open browser console (F12)
- Look for CORS errors
- Check Network tab for failed requests

---

## 🔄 Updating the Application

### For code changes:

**Method 1: Manual Upload**
```bash
# Local machine:
cd client
npm run build

# Upload new /client/dist to server
# Then in cPanel, restart Node.js app
```

**Method 2: Git Pull (if using Git)**
```bash
# SSH into server
cd ~/public_html/iptv
git pull

cd client
npm install
npm run build

cd ../server
npm install

# In cPanel, restart Node.js app
```

**Method 3: PM2 (if available)**
```bash
# SSH into server
pm2 restart bakegrill-tv
# or
pm2 reload bakegrill-tv --update-env
```

---

## 🛡️ Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env` to Git
- ✅ Use strong JWT_SECRET (32+ chars)
- ✅ Change default admin password immediately

### 2. HTTPS
- ✅ Enable SSL certificate (free Let's Encrypt in cPanel)
- ✅ Force HTTPS redirect
- ✅ Set secure cookie flags (in production)

### 3. File Permissions
```bash
# SSH into server
cd ~/public_html/iptv

# Directories: 755
find . -type d -exec chmod 755 {} \;

# Files: 644
find . -type f -exec chmod 644 {} \;

# Server.js executable: 755
chmod 755 server/server.js

# Protect sensitive files: 600
chmod 600 server/.env
chmod 600 server/database.db
```

### 4. Database Backups
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp ~/public_html/iptv/server/database.db ~/backups/database_$DATE.db
# Keep only last 7 backups
ls -t ~/backups/database_*.db | tail -n +8 | xargs rm -f
EOF

chmod +x backup.sh

# Add to cron (daily at 3 AM)
crontab -e
# Add line:
0 3 * * * /home/USERNAME/backup.sh
```

---

## 📊 Monitoring

### Check Application Status

**cPanel Dashboard:**
- Node.js App section shows status (Started/Stopped)
- Click "Open Logs" to view recent logs
- CPU and Memory usage shown

**Health Check Endpoint:**
```bash
curl https://iptv.yourdomain.com/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T12:00:00Z",
  "uptime": 3600,
  "database": "connected"
}
```

### Monitor Displays

**Admin Dashboard:**
- Login as admin
- Navigate to Display Monitor
- See real-time status of all cafe displays
- Last heartbeat timestamps
- Online/offline indicators

---

## 🎯 Post-Deployment Checklist

After deployment, verify:

- [ ] Website accessible at subdomain
- [ ] SSL certificate installed (HTTPS)
- [ ] User registration works
- [ ] User login works
- [ ] Add playlist works
- [ ] Channels load from M3U URL
- [ ] Video playback works (test HLS stream)
- [ ] Favorites add/remove works
- [ ] Search channels works
- [ ] Admin login works (admin@bakegrillcafe.com)
- [ ] Admin can create displays
- [ ] Display mode works (with token URL)
- [ ] PWA installable on mobile
- [ ] Database file created and writable
- [ ] Environment variables set correctly
- [ ] File permissions secure
- [ ] Backups configured
- [ ] Error logging working

---

## 📱 Setting Up Cafe Displays

### Hardware Setup:

1. **TV/Monitor with HDMI input**
2. **Computer stick / Raspberry Pi / Small PC**
3. **Chrome browser installed**
4. **Reliable WiFi connection**

### Software Setup:

1. **Create display in admin dashboard:**
   - Login as admin
   - Navigate to Displays → Add New
   - Name: "Wall Display 1"
   - Location: "Main Cafe - North Wall"
   - Assign playlist
   - Copy generated URL

2. **On the display device:**
   - Open Chrome browser
   - Navigate to copied URL:
     ```
     https://iptv.yourdomain.com?display=TOKEN
     ```
   - Video starts playing automatically

3. **Enable kiosk mode:**
   - **Windows:** 
     ```
     chrome.exe --kiosk --app="https://iptv.yourdomain.com?display=TOKEN"
     ```
   - **Linux/Raspberry Pi:**
     ```bash
     chromium-browser --kiosk --app="https://iptv.yourdomain.com?display=TOKEN" --start-fullscreen
     ```
   - **macOS:**
     ```bash
     /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk --app="https://iptv.yourdomain.com?display=TOKEN"
     ```

4. **Auto-start on boot:**
   - **Windows:** Add to Startup folder
   - **Linux:** Add to crontab or systemd service
   - **Raspberry Pi:** Add to `/etc/xdg/lxsession/LXDE-pi/autostart`

5. **Verify in admin dashboard:**
   - Check display shows "Online"
   - Verify current channel playing
   - Test remote control (change channel from admin)

---

## 🔄 Maintenance Tasks

### Weekly:
- [ ] Check all displays online
- [ ] Review error logs
- [ ] Test video playback
- [ ] Verify SSL certificate valid

### Monthly:
- [ ] Update Node.js dependencies
- [ ] Review database size
- [ ] Clean up old watch history (if needed)
- [ ] Test backup restore

### As Needed:
- [ ] Add/remove users
- [ ] Create new displays
- [ ] Update playlists
- [ ] Change PWA icon
- [ ] Adjust display schedules

---

## 🆘 Support & Resources

### Logs Location:
- **cPanel:** Node.js App → Open Logs
- **SSH:** `~/public_html/iptv/server/logs/` (if configured)

### Restart Application:
- **cPanel:** Node.js App → Restart button
- **SSH with PM2:** `pm2 restart bakegrill-tv`

### Database Location:
```
~/public_html/iptv/server/database.db
```

### Documentation:
- Project docs: `/docs` folder
- API reference: `04-API-ENDPOINTS.md`
- Features list: `05-FEATURES-CHECKLIST.md`

---

**Deployment Complete! 🎉**

Your Bake and Grill TV platform is now live and ready for cafe displays and customers!

---

**Next:** Security Considerations

