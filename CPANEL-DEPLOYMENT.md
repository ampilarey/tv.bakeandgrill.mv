# 🚀 cPanel Deployment Guide
**Deploy Bake & Grill TV to tv.bakeandgrill.mv**

---

## 📋 Pre-Deployment Checklist

```bash
Local Setup (Complete These First):
[x] Code committed to GitHub
[x] .env.example created
[x] Database schema ready
[x] Frontend builds successfully
[ ] Generate strong JWT_SECRET
[ ] Test application locally
[ ] Backup current database
```

---

## 🌐 Your Deployment Details

**Domain:** tv.bakeandgrill.mv  
**Server:** cPanel Node.js hosting  
**Database:** MySQL  
**Repository:** https://github.com/ampilarey/tv

---

## 🔧 Step-by-Step Deployment

### PHASE 1: Prepare Local Files (10 minutes)

#### 1.1 Generate JWT Secret
```bash
cd /Users/vigani/Website/tv/server
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copy the output - you'll need it later!
# Example output: a1b2c3d4e5f6...
```

#### 1.2 Build Frontend
```bash
cd /Users/vigani/Website/tv/client
npm run build

# This creates client/dist/ folder
# Verify it exists:
ls dist/
# You should see: index.html, assets/, etc.
```

#### 1.3 Prepare Files for Upload
```bash
# Create a deployment package (optional)
cd /Users/vigani/Website/tv

# Verify these folders exist:
ls server/          # Backend code
ls client/dist/     # Built frontend
ls docs/            # Documentation
```

---

### PHASE 2: cPanel Setup (15 minutes)

#### 2.1 Login to cPanel
1. Go to your cPanel URL (usually: https://bakeandgrill.mv:2083)
2. Login with your cPanel credentials
3. Look for **"Node.js App"** or **"Setup Node.js App"** icon

#### 2.2 Create MySQL Database

**Navigate to:** MySQL® Databases

**Create Database:**
```
Database Name: bakegrill_tv
(Full name will be: cpanelusername_bakegrill_tv)
```

**Create Database User:**
```
Username: tv_user
Password: [Generate strong password]
(Save this password - you'll need it!)
```

**Add User to Database:**
- Select user: `cpanelusername_tv_user`
- Select database: `cpanelusername_bakegrill_tv`
- Click "Add"
- Grant **ALL PRIVILEGES**
- Click "Make Changes"

**Note Your Credentials:**
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=cpanelusername_tv_user
DB_PASSWORD=[the password you generated]
DB_NAME=cpanelusername_bakegrill_tv
```

#### 2.3 Upload Files

**Option A: Using cPanel File Manager (Easier)**

1. Go to **File Manager**
2. Navigate to `/home/cpanelusername/`
3. Create folder: `tv`
4. Upload these folders:
   - Upload entire `server/` folder → `/home/cpanelusername/tv/server/`
   - Upload `client/dist/` contents → `/home/cpanelusername/tv/client/dist/`

**Option B: Using Git (Better)**

1. Open **Terminal** in cPanel
2. Run:
```bash
cd ~/
git clone https://github.com/ampilarey/tv.git
cd tv/client
npm install
npm run build
```

**Option C: Using FTP/SFTP**
- Use FileZilla or similar FTP client
- Connect to your server
- Upload folders to `/home/cpanelusername/tv/`

---

### PHASE 3: Configure Node.js App (15 minutes)

#### 3.1 Create Node.js Application

**Navigate to:** Setup Node.js App → Create Application

**Configuration:**
```
Node.js version: 18.x or higher
Application mode: Production
Application root: /home/cpanelusername/tv/server
Application URL: tv.bakeandgrill.mv
Application startup file: server.js
Passenger log file: (leave default)
```

**Click:** CREATE

#### 3.2 Set Environment Variables

**In the Node.js App interface, scroll to "Environment Variables"**

**Add these variables (click "Add Variable" for each):**

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=cpanelusername_tv_user
DB_PASSWORD=your_database_password_here
DB_NAME=cpanelusername_bakegrill_tv

# Security (CRITICAL!)
JWT_SECRET=paste-your-generated-64-char-hex-string-here

# Server Configuration
PORT=4000
NODE_ENV=production

# Admin Credentials (Change These!)
DEFAULT_ADMIN_EMAIL=admin@bakeandgrill.mv
DEFAULT_ADMIN_PASSWORD=YourStrongPassword123!

# Application Settings
APP_NAME=Bake and Grill TV
SESSION_TIMEOUT_DAYS=7
MAX_PLAYLISTS_PER_USER=10
```

**IMPORTANT:** Replace:
- `cpanelusername` with your actual cPanel username
- `your_database_password_here` with the DB password you created
- `paste-your-generated-64-char-hex-string-here` with the JWT_SECRET you generated
- `YourStrongPassword123!` with a strong admin password

#### 3.3 Install Dependencies

**In cPanel Terminal:**
```bash
cd /home/cpanelusername/tv/server

# Enter Node.js virtual environment
source /home/cpanelusername/nodevenv/tv/server/18/bin/activate

# Install dependencies
npm install

# Initialize database
node database/init.js

# Exit virtual environment
deactivate
```

**You should see:**
```
✅ Connected to MySQL
✅ Database schema created
✅ Default admin created: admin@bakeandgrill.mv
⚠️  IMPORTANT: Change password after first login!
✅ Database initialization complete!
```

#### 3.4 Configure .htaccess (For Frontend Routing)

**Create/Edit:** `/home/cpanelusername/tv/client/dist/.htaccess`

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### 3.5 Start Application

**Back in Setup Node.js App:**
- Click **"Restart"** button
- Wait 10-15 seconds
- Status should show **"Running"** in green

---

### PHASE 4: SSL Certificate (10 minutes)

#### 4.1 Enable SSL (HTTPS)

**Navigate to:** SSL/TLS Status

**Steps:**
1. Find `tv.bakeandgrill.mv` in the list
2. Click **"Run AutoSSL"**
3. Wait 2-5 minutes for certificate installation
4. Refresh page - you should see ✅ next to your subdomain

**Verify:**
- Visit: https://tv.bakeandgrill.mv
- Should show secure padlock icon 🔒

#### 4.2 Force HTTPS (Recommended)

**Create/Edit:** `/home/cpanelusername/public_html/.htaccess`

Add:
```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

### PHASE 5: Testing (15 minutes)

#### 5.1 Test Backend API

Visit: https://tv.bakeandgrill.mv/api/health

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T...",
  "version": "1.0.0",
  "stats": {
    "users": 1,
    "playlists": 0
  }
}
```

#### 5.2 Test Frontend

Visit: https://tv.bakeandgrill.mv

**You should see:**
- ✅ Login page loads
- ✅ Bake & Grill branding
- ✅ No console errors

#### 5.3 Test Login

**Default Credentials:**
```
Email: admin@bakeandgrill.mv
(or whatever you set in DEFAULT_ADMIN_EMAIL)

Password: YourStrongPassword123!
(or whatever you set in DEFAULT_ADMIN_PASSWORD)
```

**After Login:**
- ✅ Dashboard loads
- ✅ Can add playlist
- ✅ Can browse channels
- ✅ Video player works

#### 5.4 Test Admin Panel

1. Login as admin
2. Click **"Admin Panel"**
3. Check:
   - ✅ User Management loads
   - ✅ Display Management loads
   - ✅ Can create display

#### 5.5 Test Display Mode

1. Create a display in Admin Panel
2. Copy the display token
3. Visit: https://tv.bakeandgrill.mv/display?token=YOUR_TOKEN
4. Verify:
   - ✅ Display auto-logs in
   - ✅ Video auto-plays
   - ✅ Remote control works

---

### PHASE 6: Security Hardening (10 minutes)

#### 6.1 Change Admin Password

1. Login to: https://tv.bakeandgrill.mv
2. Go to Profile/Settings
3. Change password to something strong
4. Save

#### 6.2 Verify JWT_SECRET

1. Check Node.js App environment variables
2. Make sure JWT_SECRET is the 64-character hex string
3. **Never** share this secret

#### 6.3 Setup Database Backups

**In cPanel Terminal:**
```bash
# Create backup directory
mkdir -p ~/backups

# Create backup script
cat > ~/backup-tv-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u cpanelusername_tv_user -p'your_db_password' cpanelusername_bakegrill_tv > ~/backups/tv_backup_$DATE.sql
# Keep only last 7 days
find ~/backups -name "tv_backup_*.sql" -mtime +7 -delete
EOF

# Make executable
chmod +x ~/backup-tv-db.sh

# Test it
./backup-tv-db.sh

# Schedule daily backups (2 AM)
crontab -e
# Add: 0 2 * * * ~/backup-tv-db.sh
```

#### 6.4 Monitor Application

**Check logs:**
```bash
# Node.js logs (in cPanel: Setup Node.js App → View logs)
# Or in terminal:
tail -f /home/cpanelusername/logs/tv_log.txt
```

---

## 🎯 Post-Deployment Tasks

### Configure Display Devices

For each cafe TV/tablet:

1. **Create Display in Admin Panel:**
   - Name: "Main Wall Display"
   - Location: "Main Dining Area"
   - Playlist: Select your M3U playlist

2. **Copy Display URL:**
   ```
   https://tv.bakeandgrill.mv/display?token=abc-123-xyz
   ```

3. **Setup Device:**
   - iPad: Add to home screen for PWA mode
   - Browser: Open URL in kiosk mode
   - Keep device plugged in and charging

4. **Test Remote Control:**
   - From admin panel on phone
   - Try changing channels
   - Try volume control
   - Try mute/unmute

---

## 🐛 Troubleshooting

### Issue: "Cannot GET /"

**Problem:** Frontend not loading

**Fix:**
```bash
# Verify client/dist/ exists and has files
ls /home/cpanelusername/tv/client/dist/

# If empty, rebuild:
cd /home/cpanelusername/tv/client
npm install
npm run build

# Check server.js serves static files in production
```

### Issue: "Database connection failed"

**Problem:** Can't connect to MySQL

**Fix:**
```bash
# Verify database exists:
mysql -u cpanelusername_tv_user -p
# Enter password when prompted
SHOW DATABASES;
USE cpanelusername_bakegrill_tv;
SHOW TABLES;
exit;

# Check environment variables in Node.js App
# Make sure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME are correct
```

### Issue: "JWT must be provided"

**Problem:** JWT_SECRET not set

**Fix:**
1. Go to Setup Node.js App
2. Check Environment Variables
3. Make sure JWT_SECRET exists and is 64+ characters
4. Restart app

### Issue: "Port already in use"

**Problem:** Another app using port 4000

**Fix:**
- Change PORT environment variable to 4001 or 4002
- Restart Node.js app

### Issue: Video won't play

**Problem:** M3U URL not accessible

**Fix:**
1. Test M3U URL directly in VLC player
2. Make sure URL is publicly accessible
3. Check CORS settings
4. Try different playlist

### Issue: Remote control not working

**Problem:** Display not polling or commands not reaching

**Fix:**
1. Check display is online (green status in admin)
2. Check display token is correct
3. Wait 2 seconds (polling interval)
4. Check browser console for errors
5. Verify heartbeat is updating

---

## 📊 Monitoring & Maintenance

### Daily Checks
- [ ] Check application is running (visit site)
- [ ] Check displays are online
- [ ] Review error logs

### Weekly Tasks
- [ ] Review database backups
- [ ] Check disk space usage
- [ ] Review access logs
- [ ] Test display remote control

### Monthly Tasks
- [ ] Update dependencies (npm update)
- [ ] Review security updates
- [ ] Test full backup restore
- [ ] Review analytics

---

## 🔄 Updating Application

### When You Make Code Changes:

**Method 1: Git Pull (If deployed via Git)**
```bash
# SSH to server
cd ~/tv
git pull origin main

# Backend changes
cd server
npm install  # If package.json changed
# Restart via cPanel Node.js App interface

# Frontend changes
cd ../client
npm install  # If package.json changed
npm run build
```

**Method 2: Upload Files**
1. Build locally: `npm run build`
2. Upload `client/dist/` via File Manager
3. Upload `server/` changes if needed
4. Restart Node.js app via cPanel

---

## 📞 Support Contacts

### cPanel Support
- Check with your hosting provider
- Usually available 24/7

### Application Issues
- Check logs in cPanel
- Review TROUBLESHOOTING.md
- Check GitHub issues: https://github.com/ampilarey/tv/issues

---

## ✅ Deployment Checklist

```bash
BEFORE DEPLOYMENT:
[x] Generated JWT_SECRET
[x] Built frontend (npm run build)
[x] Tested locally
[ ] Documented database credentials

CPANEL SETUP:
[ ] Created MySQL database
[ ] Created database user
[ ] Granted privileges
[ ] Uploaded files to server
[ ] Created Node.js app
[ ] Set environment variables
[ ] Installed npm dependencies
[ ] Initialized database
[ ] Started application

SSL & SECURITY:
[ ] Installed SSL certificate
[ ] Forced HTTPS
[ ] Changed admin password
[ ] Verified JWT_SECRET
[ ] Setup database backups

TESTING:
[ ] /api/health returns OK
[ ] Frontend loads
[ ] Can login
[ ] Can add playlist
[ ] Video plays
[ ] Admin panel works
[ ] Display mode works
[ ] Remote control works

POST-DEPLOYMENT:
[ ] Setup display devices
[ ] Test from mobile devices
[ ] Configure monitoring
[ ] Document custom changes
[ ] Train staff on system
```

---

## 🎉 Success!

Your application should now be live at:

**🌐 Main Site:** https://tv.bakeandgrill.mv  
**🔧 API Health:** https://tv.bakeandgrill.mv/api/health  
**📺 Display Mode:** https://tv.bakeandgrill.mv/display?token=YOUR_TOKEN

**Next Steps:**
1. Change admin password
2. Add your M3U playlists
3. Setup cafe displays
4. Test remote control
5. Train staff

---

**Deployment Date:** [DATE]  
**Deployed By:** [YOUR NAME]  
**Domain:** tv.bakeandgrill.mv  
**Status:** ✅ Live

**🔥 Enjoy your IPTV system!**

