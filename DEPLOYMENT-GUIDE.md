# Complete Deployment Guide - Bake & Grill TV

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Git Deployment Workflow](#git-deployment-workflow)
4. [Environment Configuration](#environment-configuration)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance](#maintenance)

---

## Prerequisites

### Required Services
- **cPanel Hosting** with:
  - Node.js support (v18+)
  - MySQL database
  - Git access
  - SSH access
- **GitHub Account** for code repository
- **Domain/Subdomain** configured (e.g., `tv.bakeandgrill.mv`)

### Database Setup
1. Go to **cPanel → MySQL Databases**
2. Create database: `bakeandgrill_tv` (or `yourusername_tv`)
3. Create user: `bakeandgrill_tv` with a strong password
4. Add user to database with **ALL PRIVILEGES**
5. **Save these credentials** - you'll need them for `.env` file

---

## Initial Setup

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create repository: `tv.bakeandgrill.mv` (or your preferred name)
3. Set to **Private** (recommended) or Public
4. Don't initialize with README (we'll push existing code)

### Step 2: Set Up SSH Deploy Key

**On your local machine:**

Generate SSH key for deployment:
```bash
ssh-keygen -t ed25519 -C "tv.bakeandgrill.mv" -f ~/.ssh/tv_deploy_key
```

**On cPanel Server (via SSH):**

Generate SSH key on server:
```bash
ssh-keygen -t ed25519 -C "tv.bakeandgrill.mv" -f ~/.ssh/tv_deploy_key
```

Display the public key:
```bash
cat ~/.ssh/tv_deploy_key.pub
```

**Add to GitHub:**

1. Go to: https://github.com/YOUR_USERNAME/tv.bakeandgrill.mv/settings/keys/new
2. **Title:** `cPanel Deploy Key`
3. **Key:** Paste the public key from above
4. ✅ Check **"Allow write access"**
5. Click **"Add key"**

### Step 3: Clone Repository on Server

SSH into your cPanel and run:

```bash
cd ~
git clone git@github.com:YOUR_USERNAME/tv.bakeandgrill.mv.git tv.bakeandgrill.mv
cd tv.bakeandgrill.mv
```

Configure Git to use the deploy key:
```bash
git config core.sshCommand "ssh -i ~/.ssh/tv_deploy_key -F /dev/null"
```

### Step 4: Set Up Node.js Application

1. Go to **cPanel → Setup Node.js App**
2. Click **"Create Application"**
3. Configure:
   - **Node.js version:** 18.20.8 (or latest 18.x)
   - **Application mode:** Production
   - **Application root:** `tv.bakeandgrill.mv/server`
   - **Application URL:** Select your subdomain (e.g., `tv.bakeandgrill.mv`)
   - **Application startup file:** `server.js`
4. Click **"Create"**
5. Click **"Run NPM Install"** to install dependencies
6. **Don't start yet** - we need to configure environment first

### Step 5: Configure Environment Variables

Create `.env` file on server:

```bash
cd ~/tv.bakeandgrill.mv/server
cat > .env << 'EOF'
PORT=4000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

# MySQL Database - UPDATE WITH YOUR CREDENTIALS
DB_HOST=localhost
DB_PORT=3306
DB_USER=bakeandgrill_tv
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=bakeandgrill_tv

# Admin defaults
DEFAULT_ADMIN_EMAIL=admin@bakeandgrill.mv
DEFAULT_ADMIN_PASSWORD=BakeGrill2025!

# App settings
APP_NAME=Bake and Grill TV
MAX_PLAYLISTS_PER_USER=10
SESSION_TIMEOUT_DAYS=7
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=5
EOF
```

**IMPORTANT:** Replace:
- `YOUR_MYSQL_PASSWORD_HERE` with your actual MySQL password
- `JWT_SECRET` with a random 32+ character string

### Step 6: Configure Apache (.htaccess)

The `.htaccess` file should already be in the root, but verify it contains:

```bash
cat ~/tv.bakeandgrill.mv/.htaccess
```

Should contain:
```apache
# Never cache HTML
<FilesMatch "\.(html|htm)$">
  Header set Cache-Control "no-cache, no-store, must-revalidate, max-age=0"
  Header set Pragma "no-cache"
  Header set Expires "0"
</FilesMatch>

# Cache assets forever (they have hash in name)
<FilesMatch "\.(js|css|png|jpg|jpeg|svg|woff|woff2)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

RewriteEngine On
RewriteCond %{REQUEST_URI} ^/api
RewriteRule ^(.*)$ http://127.0.0.1:4000/$1 [P,L]

RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^(.*)$ index.html [L]

AddType application/javascript .js
AddType text/css .css
```

### Step 7: Set Document Root

1. Go to **cPanel → Domains**
2. Find your subdomain (e.g., `tv.bakeandgrill.mv`)
3. Click **"Manage"**
4. Change **Document Root** to: `/home/yourusername/tv.bakeandgrill.mv`
5. Click **"Save"**

### Step 8: Deploy Frontend Files

```bash
cd ~/tv.bakeandgrill.mv
cp -r client/dist/* .
```

### Step 9: Start the Application

Go to **cPanel → Setup Node.js App** and click **"START APP"**

Or via SSH:
```bash
cd ~/tv.bakeandgrill.mv/server
source /home/yourusername/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
nohup node server.js > ../server.log 2>&1 &
```

### Step 10: Test the Application

1. Visit: `https://tv.bakeandgrill.mv`
2. You should see the login page
3. Login with:
   - **Email:** `admin@bakeandgrill.mv`
   - **Password:** `BakeGrill2025!`
4. **IMPORTANT:** Change the admin password immediately after first login

---

## Git Deployment Workflow

### Complete Deployment Command

After making changes locally and pushing to GitHub, run this **ONE command** on your cPanel server:

```bash
cd ~/tv.bakeandgrill.mv && git pull origin main && cp -r client/dist/assets/* assets/ && cp client/dist/*.html . && cp client/dist/*.js . && cp client/dist/*.webmanifest .
```

Then restart the Node.js app in cPanel.

### Step-by-Step Workflow

**On Your Local Machine:**

1. Make your code changes
2. Build the frontend:
   ```bash
   cd client && npm run build
   ```

3. Commit and push:
   ```bash
   git add -A
   git commit -m "Your commit message"
   git push origin main
   ```

4. Force-add built assets (if needed):
   ```bash
   git add -f client/dist/assets/*.js client/dist/assets/*.css
   git commit -m "Add built assets"
   git push origin main
   ```

**On cPanel Server (via SSH):**

1. Pull latest changes:
   ```bash
   cd ~/tv.bakeandgrill.mv
   git pull origin main
   ```

2. Deploy frontend files:
   ```bash
   cp -r client/dist/assets/* assets/
   cp client/dist/*.html .
   cp client/dist/*.js .
   cp client/dist/*.webmanifest .
   ```

3. Restart Node.js:
   - Go to **cPanel → Setup Node.js App**
   - Click **"RESTART"**

4. Clear browser cache (first time only):
   - Users need to clear cache once
   - After that, auto-reload will work

---

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend server port | `4000` |
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | Secret key for JWT tokens | `random-32-char-string` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `bakeandgrill_tv` |
| `DB_PASSWORD` | MySQL password | Your password |
| `DB_NAME` | MySQL database name | `bakeandgrill_tv` |
| `DEFAULT_ADMIN_EMAIL` | Admin email | `admin@bakeandgrill.mv` |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin password | `BakeGrill2025!` |

### Security Notes

- **Never commit `.env` file** to Git (already in `.gitignore`)
- Change `JWT_SECRET` to a random string
- Change admin password after first login
- Use strong MySQL password
- Keep `.env` file permissions: `chmod 600 .env`

---

## Troubleshooting

### Issue: Blank White Page After Deployment

**Cause:** Browser cache or Service Worker holding old version

**Solution:**
1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Application tab
3. Clear storage and unregister Service Workers
4. Hard reload: Ctrl+Shift+R (Cmd+Shift+R on Mac)
5. After this ONE-TIME clear, auto-reload will work for future updates

### Issue: 503 Error - Backend Not Running

**Check if server is running:**
```bash
ps aux | grep server.js
```

**Check server logs:**
```bash
tail -50 ~/tv.bakeandgrill.mv/server.log
```

**Restart server:**
```bash
pkill -f "node.*server.js"
cd ~/tv.bakeandgrill.mv/server
source /home/yourusername/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
nohup node server.js > ../server.log 2>&1 &
```

Or use cPanel Node.js App manager.

### Issue: Cannot Login - Invalid Credentials

**Check database connection:**
```bash
mysql -u bakeandgrill_tv -p bakeandgrill_tv
# Enter your MySQL password
# Run: SELECT * FROM users;
# Exit: exit
```

**Recreate admin user:**
```bash
cd ~/tv.bakeandgrill.mv/server
source /home/yourusername/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
node database/init.js
```

### Issue: Git Pull Fails - Authentication Error

**Check SSH key configuration:**
```bash
ssh -T git@github.com
# Should show: "Hi username! You've successfully authenticated..."
```

**Reconfigure deploy key:**
```bash
cd ~/tv.bakeandgrill.mv
git config core.sshCommand "ssh -i ~/.ssh/tv_deploy_key -F /dev/null"
git pull origin main
```

### Issue: Missing Assets (JS/CSS files)

**Ensure files are copied correctly:**
```bash
cd ~/tv.bakeandgrill.mv
ls -la assets/
# Should show .js and .css files
```

**Re-copy from dist:**
```bash
rm -rf assets/*
cp -r client/dist/assets/* assets/
cp client/dist/index.html .
```

### Issue: API Calls Return 404

**Check `.htaccess` proxy rule:**
```bash
cat ~/tv.bakeandgrill.mv/.htaccess
# Should contain: RewriteRule ^(.*)$ http://127.0.0.1:4000/$1 [P,L]
```

**Check server is on port 4000:**
```bash
lsof -i :4000
# Or check .env file: cat server/.env | grep PORT
```

---

## Maintenance

### Daily Checks

1. **Monitor server status:**
   ```bash
   ps aux | grep server.js
   ```

2. **Check error logs:**
   ```bash
   tail -50 ~/tv.bakeandgrill.mv/server.log
   ```

### Database Backup (Weekly)

```bash
mysqldump -u bakeandgrill_tv -p bakeandgrill_tv > ~/backups/tv_$(date +%Y%m%d).sql
```

Automate with cron:
```bash
crontab -e
# Add: 0 2 * * 0 mysqldump -u bakeandgrill_tv -pYOUR_PASSWORD bakeandgrill_tv > ~/backups/tv_$(date +\%Y\%m\%d).sql
```

### Update Dependencies (Monthly)

```bash
cd ~/tv.bakeandgrill.mv/server
source /home/yourusername/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
npm update
```

Then test thoroughly before deploying.

### Monitor Disk Space

```bash
du -sh ~/tv.bakeandgrill.mv
# Check uploads folder size
du -sh ~/tv.bakeandgrill.mv/server/uploads
```

---

## Quick Reference

### One-Command Deployment

```bash
cd ~/tv.bakeandgrill.mv && git pull origin main && cp -r client/dist/assets/* assets/ && cp client/dist/*.html . && cp client/dist/*.js . && cp client/dist/*.webmanifest .
```

### Restart Server

**Via cPanel:** Setup Node.js App → RESTART button

**Via SSH:**
```bash
pkill -f "node.*server.js" && cd ~/tv.bakeandgrill.mv/server && source /home/yourusername/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate && nohup node server.js > ../server.log 2>&1 &
```

### Check Server Status

```bash
# Is it running?
ps aux | grep server.js

# Check logs
tail -50 ~/tv.bakeandgrill.mv/server.log

# Test API
curl http://localhost:4000/api/health
```

### Admin Credentials

- **Email:** `admin@bakeandgrill.mv`
- **Password:** `BakeGrill2025!` (change after first login!)

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs: `~/tv.bakeandgrill.mv/server.log`
3. Check browser console for frontend errors (F12 → Console)
4. Verify all environment variables are set correctly

---

**Last Updated:** November 12, 2025

