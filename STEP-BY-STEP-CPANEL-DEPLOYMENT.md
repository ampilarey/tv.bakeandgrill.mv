# Step-by-Step cPanel Deployment Guide
## Complete Clean Installation for Bake & Grill TV

---

## 🎯 Overview
You will:
1. Backup your database
2. Delete all old files
3. Upload fresh code (pre-built)
4. Configure environment
5. Start the server
6. Test the new theme

**Time needed:** 15-20 minutes

---

## 📦 STEP 1: Download the Deployment Package

**On your Mac (local computer):**

1. The deployment package is here:
   ```
   /Users/vigani/Website/tv/deployment-ready-20251116-140449.zip
   ```

2. Copy it to your Desktop or Downloads folder for easy access:
   - Open Finder
   - Go to `/Users/vigani/Website/tv/`
   - Find `deployment-ready-20251116-140449.zip`
   - Copy to Desktop

---

## 🗄️ STEP 2: Backup Your Database (CRITICAL!)

### Via cPanel File Manager:

1. **Login to cPanel**
   - Go to your cPanel URL (usually: `https://yourdomain.com:2083` or `https://yourdomain.com/cpanel`)
   - Username: `bakeandgrill`
   - Password: [your cPanel password]

2. **Open File Manager**
   - Look for the "File Manager" icon
   - Click it

3. **Navigate to your TV subdomain folder**
   - You'll see a list of folders on the left
   - Click on: `public_html`
   - Then find and click: `tv.bakeandgrill.mv` (or wherever your subdomain points)
   - Alternative paths might be:
     - `tv.bakeandgrill.mv/`
     - `subdomains/tv/`
     - Check with your host if unsure

4. **Download the database**
   - Navigate to: `server/database/`
   - Find: `database.sqlite`
   - **Right-click** on `database.sqlite`
   - Click **"Download"**
   - Save it to your Desktop as: `database-backup-20251116.sqlite`

   ✅ **IMPORTANT:** Keep this file safe! It has all your users, channels, favorites, and history.

---

## 🗑️ STEP 3: Delete ALL Old Files

**Still in cPanel File Manager:**

1. **Go back to your subdomain root folder**
   - Navigate back to: `public_html/tv.bakeandgrill.mv/`
   - You should see folders like:
     - `client/`
     - `server/`
     - `docs/`
     - Various files

2. **Select ALL files and folders**
   - Click the **top-left checkbox** (this selects everything)
   - OR press `Ctrl+A` (Windows) or `Cmd+A` (Mac)
   - All files/folders should now be highlighted

3. **Delete everything**
   - Click the **"Delete"** button at the top toolbar
   - A confirmation popup will appear
   - Click **"Confirm"** or **"Delete Files"**
   - Wait for deletion to complete (may take 10-30 seconds)

4. **Verify the folder is empty**
   - The folder should now show "No files found" or be completely empty
   - If any files remain, select and delete them individually

---

## 📤 STEP 4: Upload Fresh Code

**Still in cPanel File Manager:**

1. **Make sure you're in the subdomain root folder**
   - You should be at: `public_html/tv.bakeandgrill.mv/`
   - The folder should be empty

2. **Upload the deployment package**
   - Click the **"Upload"** button at the top toolbar
   - A new page/popup will open
   - Click **"Select File"** or drag-and-drop
   - Choose: `deployment-ready-20251116-140449.zip` from your Desktop
   - **Wait for upload to complete** (progress bar will show 100%)
   - The file is 1 MB, so it should upload in seconds
   - **Close the upload window** when done

3. **Go back to File Manager**
   - If you're still on the upload page, click "Go Back to..." or refresh File Manager
   - You should now see: `deployment-ready-20251116-140449.zip` in your folder

4. **Extract the zip file**
   - **Right-click** on `deployment-ready-20251116-140449.zip`
   - Click **"Extract"**
   - A popup appears asking where to extract
   - **Leave it as default** (current directory: `/public_html/tv.bakeandgrill.mv/`)
   - Click **"Extract File(s)"**
   - Wait for extraction (takes 5-10 seconds)
   - Click **"Close"** when it says "Extraction Complete"

5. **Delete the zip file**
   - Select `deployment-ready-20251116-140449.zip`
   - Click **"Delete"**
   - Confirm deletion

6. **Verify extraction worked**
   - You should now see folders:
     - `client/` (with a `dist/` folder inside)
     - `server/`
     - `docs/`
     - Files like `README.md`, `CLEAN-DEPLOYMENT-GUIDE.md`, etc.

7. **CRITICAL: Verify the built files exist**
   - Navigate to: `client/dist/assets/`
   - You should see:
     - `index-CavVanIM.js` ✅ (NEW BUILD - 207 KB)
     - `index-CHH5V4Nw.css` ✅ (NEW CSS - 34 KB)
     - `hls-vendor-swFHWmXm.js`
     - `react-vendor-DY6H39Bc.js`
   
   If you don't see `index-CavVanIM.js`, the extraction failed!

---

## ⚙️ STEP 5: Create .env Configuration File

**In cPanel File Manager:**

1. **Navigate to the server folder**
   - Click on: `server/`

2. **Check if .env already exists**
   - Look for a file named `.env` (starts with a dot)
   - If it exists, **download it first** as backup
   - Then delete it (we'll create a fresh one)

3. **Create new .env file**
   - Click the **"+ File"** button at the top
   - Name it exactly: `.env` (with the dot)
   - Click **"Create New File"**

4. **Edit the .env file**
   - **Right-click** on `.env`
   - Click **"Edit"**
   - Or click **"Code Editor"** if available
   - A text editor will open

5. **Paste this configuration** (UPDATE WITH YOUR DETAILS):

```env
# Database Configuration - UPDATE THESE!
DB_HOST=localhost
DB_USER=your_mysql_username_here
DB_PASSWORD=your_mysql_password_here
DB_NAME=your_database_name_here

# JWT Secret - CHANGE THIS to a random string!
JWT_SECRET=your-super-secret-random-string-CHANGE-THIS-12345

# Server Configuration
NODE_ENV=production
PORT=4000

# CORS Origins - UPDATE with your actual domains
CORS_ORIGINS=https://tv.bakeandgrill.mv,https://www.tv.bakeandgrill.mv,http://tv.bakeandgrill.mv

# Default Admin (for first-time setup only)
ALLOW_DEFAULT_ADMIN=true
DEFAULT_ADMIN_EMAIL=admin@bakegrill.com
DEFAULT_ADMIN_PASSWORD=BakeGrill2025!
```

6. **IMPORTANT: Update these values:**
   - `DB_USER` → Your MySQL username (ask your host)
   - `DB_PASSWORD` → Your MySQL password
   - `DB_NAME` → Your MySQL database name
   - `JWT_SECRET` → Create a random string (example: `JkLm9Pq3WxYz7Abc2Def5Ghi8Tuv`)
   - `CORS_ORIGINS` → Your actual domain(s)

7. **Save the file**
   - Click **"Save Changes"** or **"Save File"**
   - Close the editor

---

## 🔐 STEP 6: Set File Permissions (Security)

**In cPanel File Manager:**

1. **Protect .env file**
   - Navigate to: `server/`
   - **Right-click** on `.env`
   - Click **"Change Permissions"** or **"Permissions"**
   - Set to: **600** (Owner: Read+Write, Group: None, World: None)
   - Or check: `[x] Read [x] Write` for Owner only
   - Click **"Change Permissions"**

---

## 🚀 STEP 7: Install Dependencies & Start Server

### Option A: Via cPanel Terminal (if available)

1. **Open Terminal in cPanel**
   - Look for "Terminal" icon in cPanel
   - Click it to open

2. **Navigate to server folder**
   ```bash
   cd ~/public_html/tv.bakeandgrill.mv/server
   # or wherever your subdomain points
   ```

3. **Install dependencies**
   ```bash
   npm install --production
   ```
   - This will take 1-2 minutes
   - You'll see packages being installed

4. **Start the server**
   ```bash
   # Stop any old processes first
   killall node 2>/dev/null
   
   # Start in background
   nohup node server.js > server.log 2>&1 &
   
   # Check it started
   ps aux | grep node
   ```

5. **Test the server**
   ```bash
   curl http://localhost:4000/api/health
   ```
   - Should return: `{"status":"ok","timestamp":"...",...}`

### Option B: Via SSH (if cPanel Terminal not available)

1. **Connect via SSH**
   ```bash
   # On your Mac, open Terminal app
   ssh bakeandgrill@your-server-ip
   # Enter password when prompted
   ```

2. **Follow the same commands as Option A above**

### Option C: Contact Your Host

If you don't have Terminal or SSH access:
- Contact your hosting provider
- Ask them to:
  1. Run `npm install --production` in `server/`
  2. Start Node.js server with: `node server.js`
  3. Keep it running on port 4000

---

## 🌐 STEP 8: Configure Web Server Routing

### Create .htaccess for Apache:

1. **In cPanel File Manager**
   - Go back to subdomain root: `public_html/tv.bakeandgrill.mv/`

2. **Create .htaccess file**
   - Click **"+ File"**
   - Name: `.htaccess`
   - Click **"Create New File"**

3. **Edit .htaccess**
   - Right-click → Edit
   - Paste this:

```apache
# Enable RewriteEngine
RewriteEngine On

# API requests go to Node.js server
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^(.*)$ http://localhost:4000/$1 [P,L]

# Serve static files from client/dist
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ client/dist/$1 [L]

# Client-side routing - serve index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ client/dist/index.html [L]

# Cache busting for HTML/JS/CSS
<FilesMatch "\.(html|js|css)$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
  Header set Expires 0
</FilesMatch>

# Service worker configuration
<FilesMatch "sw\.js$">
  Header set Service-Worker-Allowed "/"
  Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>
```

4. **Save the file**

---

## ✅ STEP 9: Test Your Deployment

### 1. Check Server is Running

Via Terminal/SSH:
```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-11-16T...","version":"1.0.0","stats":{...}}
```

### 2. Check Files Are Served

```bash
cd ~/public_html/tv.bakeandgrill.mv/client/dist
cat index.html | grep "index-"
```

Should show: `index-CavVanIM.js` ✅

### 3. Visit Your Website

1. **Open browser (use Private/Incognito mode)**
   - Chrome: Ctrl+Shift+N (Windows) or Cmd+Shift+N (Mac)
   - Firefox: Ctrl+Shift+P or Cmd+Shift+P

2. **Go to:** `https://tv.bakeandgrill.mv`

3. **What you should see:**
   - **Background:** Deep navy/dark blue (#0A0E17)
   - **Login page:**
     - Large blue circular logo (with play icon)
     - "Bake and Grill TV" in big white text
     - Blue "Sign In" button
   - **NOT:** White page, old amber/orange theme, or errors

### 4. Check Browser Console

1. Press `F12` to open DevTools
2. Go to "Console" tab
3. Look for:
   ```
   📱 App Version: 1.0.6
   ✅ Same version - no cache clear needed
   ```
4. Go to "Network" tab
5. Refresh page
6. Look for: `index-CavVanIM.js` being loaded ✅

### 5. Clear Service Workers (if needed)

If you still see old version:
1. Press `F12` → "Application" tab
2. Click "Service Workers" on left
3. Click "Unregister" on any service workers listed
4. Click "Clear storage" → "Clear site data"
5. Hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`

---

## 🐛 Troubleshooting

### Problem: "Still seeing white page or old theme"

**Solution 1: Force clear everything in browser**
```
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
```

**Solution 2: Clear service workers**
```
1. F12 → Application → Service Workers
2. Unregister all
3. Application → Storage → Clear site data
4. Hard refresh
```

**Solution 3: Check server is actually serving new files**
```bash
# SSH to server
cd ~/public_html/tv.bakeandgrill.mv/client/dist/assets/
ls -lh index-*.js

# You MUST see:
# index-CavVanIM.js  (207K or 207.52 KB)

# If you see different file name, the upload failed!
```

### Problem: "Server won't start"

**Check if port is already in use:**
```bash
ps aux | grep node
# You'll see something like:
# bakeandgrill  12345  ... node server.js

# Kill the old process:
kill -9 12345
```

**Then start again:**
```bash
cd ~/public_html/tv.bakeandgrill.mv/server
node server.js &
```

### Problem: "Cannot find module" errors

**Solution:**
```bash
cd ~/public_html/tv.bakeandgrill.mv/server
rm -rf node_modules package-lock.json
npm install --production
```

### Problem: "Database connection error"

**Check .env file:**
```bash
cd ~/public_html/tv.bakeandgrill.mv/server
cat .env
```

Verify:
- DB_HOST is correct (usually `localhost`)
- DB_USER matches your MySQL username
- DB_PASSWORD is correct
- DB_NAME exists in MySQL

**Test MySQL connection:**
```bash
mysql -u your_username -p your_database_name
# Enter password when prompted
# If it connects, credentials are correct
```

---

## 📸 Visual Verification

After deployment, you should see:

### ✅ Login Page:
- Deep navy background (almost black with blue tint)
- Large blue gradient circle with play icon
- "Bake and Grill TV" in large white text
- Blue rounded form box
- Blue "Sign In" button
- Text is bright white/light gray (very readable)

### ✅ Dashboard (after login):
- Navy background throughout
- Top bar with blue gradient TV icon
- "Your Playlists" in big white text
- Blue "Add Playlist" button
- Playlist cards with navy background and borders
- Blue arrow icons on cards

### ✅ Player Page (Desktop):
- **Left panel:** Channel list (navy background)
- **Center:** Video player (16:9 black box with borders)
- **Right panel:** Channel info (navy background)
- All text is white/light gray on dark navy
- Selected channels have blue highlight
- Scrollable channel list

### ✅ Player Page (Mobile):
- Top banner: "Now Playing" with channel name
- Video player below (full width)
- Blue "Channels" button
- Bottom drawer slides up with channel list
- All backgrounds are solid (no transparency)

### ❌ What you should NOT see:
- All white page
- Old amber/orange/yellow theme
- Transparent containers
- Unreadable text
- Old script hashes like `index-0UrAJhdh.js`

---

## 🔄 If You Need to Re-deploy

If something goes wrong:

1. **Don't panic** - you have `database-backup-20251116.sqlite` on your Desktop
2. **Restore database:**
   - Upload `database-backup-20251116.sqlite` to `server/database/`
   - Rename it back to `database.sqlite`
3. **Repeat steps 3-8**

---

## 📞 Quick Reference Commands

**Check server status:**
```bash
ps aux | grep node
curl http://localhost:4000/api/health
```

**View server logs:**
```bash
cd ~/public_html/tv.bakeandgrill.mv/server
tail -50 server.log
```

**Restart server:**
```bash
cd ~/public_html/tv.bakeandgrill.mv/server
killall node
sleep 2
node server.js &
```

**Check what's being served:**
```bash
cd ~/public_html/tv.bakeandgrill.mv/client/dist
cat index.html | grep "index-"
```

---

## ✅ Success Checklist

Mark each as you complete:

- [ ] Database backed up to Desktop
- [ ] All old files deleted from subdomain
- [ ] `deployment-ready-20251116-140449.zip` uploaded
- [ ] Zip file extracted successfully
- [ ] Zip file deleted after extraction
- [ ] Files verified: `client/dist/assets/index-CavVanIM.js` exists
- [ ] `.env` file created in `server/` with correct MySQL credentials
- [ ] `.env` permissions set to 600
- [ ] `npm install --production` completed in `server/`
- [ ] `.htaccess` created in subdomain root
- [ ] Server started: `node server.js &`
- [ ] Health check passes: `curl http://localhost:4000/api/health`
- [ ] Website visited in Incognito mode
- [ ] New navy/blue theme visible
- [ ] Can login successfully
- [ ] Can select playlist and watch channels

---

## 🎉 You're Done!

When you see:
- ✅ Deep navy background
- ✅ Blue accent colors
- ✅ Modern 3-panel desktop layout
- ✅ Player-first mobile layout
- ✅ All text clearly readable

**Your deployment is successful!** 🚀

---

## Need More Help?

If stuck on any step:
1. Take a screenshot of what you see
2. Check browser console (F12) for errors
3. Check server logs: `tail -50 ~/public_html/tv.bakeandgrill.mv/server/server.log`
4. Verify `.env` has correct MySQL credentials
5. Make sure Node.js is installed on your server (ask your host)

