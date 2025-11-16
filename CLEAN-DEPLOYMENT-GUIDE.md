# Clean Deployment Guide - cPanel/Live Server

## ✅ Successfully Built Locally
- **Date:** 2025-11-16
- **New Build Hash:** `index-CavVanIM.js` (207.52 KB)
- **New CSS Hash:** `index-CHH5V4Nw.css` (34.87 KB)
- **Theme:** Modern premium dark navy/blue

---

## 🗑️ Step 1: Clean Your Live Server (cPanel)

### Via SSH:
```bash
# Connect to your server
ssh bakeandgrill@your-server-ip

# Navigate to your web directory
cd ~/tv.bakeandgrill.mv

# IMPORTANT: Backup database first (if not already backed up)
cp server/database/database.sqlite server/database/database.sqlite.backup-$(date +%Y%m%d)

# Delete everything EXCEPT database
find . -mindepth 1 -maxdepth 1 ! -name 'server' -exec rm -rf {} +
cd server
find . -mindepth 1 -maxdepth 1 ! -name 'database' ! -name '.env' -exec rm -rf {} +
cd ..

# OR use cPanel File Manager:
# 1. Login to cPanel
# 2. Go to File Manager
# 3. Navigate to tv.bakeandgrill.mv subdomain directory
# 4. Select ALL files/folders EXCEPT:
#    - server/database/ (contains your data)
#    - server/.env (contains your secrets)
# 5. Click "Delete" and confirm
```

---

## 📤 Step 2: Upload Fresh Code

### Option A: Via Git (Recommended)
```bash
# On your live server
cd ~/tv.bakeandgrill.mv

# Clone fresh copy
git clone https://github.com/ampilarey/tv.bakeandgrill.mv.git temp
mv temp/* temp/.* . 2>/dev/null
rm -rf temp

# Or if git is already initialized:
git fetch origin
git reset --hard origin/main
```

### Option B: Via cPanel File Manager
1. On your LOCAL machine, create a clean zip (without node_modules):
   ```bash
   cd /Users/vigani/Website/tv
   zip -r deploy-$(date +%Y%m%d-%H%M%S).zip . \
     -x "*.git*" \
     -x "*node_modules*" \
     -x "*.zip" \
     -x "client/dist/*" \
     -x "server/database/database.sqlite*"
   ```

2. Upload `deploy-*.zip` via cPanel File Manager
3. Extract it in the subdomain directory
4. Delete the zip file after extraction

---

## 🔧 Step 3: Install Dependencies & Build

```bash
# On your live server
cd ~/tv.bakeandgrill.mv

# Install server dependencies
cd server
npm install --production

# Install client dependencies (needed for build)
cd ../client
npm install

# Build the client (this generates the dist/ folder with new theme)
npm run build

# Verify the build
ls -lh dist/assets/index-*.js dist/assets/index-*.css
# You should see: index-CavVanIM.js and index-CHH5V4Nw.css
```

---

## ✅ Step 4: Verify Environment & Start Server

```bash
cd ~/tv.bakeandgrill.mv/server

# Verify .env file exists and has required variables
cat .env
# Should contain:
# DB_HOST=localhost
# DB_USER=your_mysql_user
# DB_PASSWORD=your_mysql_password
# DB_NAME=your_database_name
# JWT_SECRET=your-super-secret-jwt-key-here
# NODE_ENV=production
# PORT=4000

# Kill any old processes
ps aux | grep node
kill -9 <PID_of_old_node_process>

# Start the server
NODE_ENV=production npm start &

# Verify it's running
curl http://localhost:4000/api/health
```

---

## 🧪 Step 5: Test the Deployment

1. **Clear browser cache completely:**
   - Chrome: Ctrl+Shift+Delete → Clear "Cached images and files"
   - Or use Incognito/Private mode

2. **Visit your site:**
   - https://tv.bakeandgrill.mv or your subdomain URL

3. **Check for new theme:**
   - Background should be deep navy (#0A0E17)
   - Accent color should be blue (#3B82F6)
   - Text should be bright white/light gray
   - Desktop: 3-panel layout
   - Mobile: Player-first with bottom drawer

4. **Check browser console:**
   - Should see version logs
   - Check which JS/CSS files are loading (should be `index-CavVanIM.js`)

---

## 🚨 If You Still See Old Version:

### Force Cache Clear on Server:
```bash
cd ~/tv.bakeandgrill.mv/client/dist

# Check what's actually being served
ls -lh assets/index-*.js
cat index.html | grep "index-"

# The index.html should reference: index-CavVanIM.js
```

### Add cache-busting to .htaccess (if using Apache):
```bash
cd ~/tv.bakeandgrill.mv/client/dist

# Create/edit .htaccess
cat > .htaccess << 'EOF'
# Disable caching for HTML, JS, CSS
<FilesMatch "\.(html|js|css)$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
  Header set Expires 0
</FilesMatch>

# Disable caching for service worker
<FilesMatch "sw\.js$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
  Header set Expires 0
</FilesMatch>
EOF
```

### Clear CloudFlare/CDN cache (if applicable):
- If your domain uses CloudFlare or another CDN
- Login to CloudFlare dashboard
- Go to Caching → Purge Everything

---

## 📋 Quick Checklist

- [ ] Database backed up
- [ ] Old files deleted (except database & .env)
- [ ] Fresh code uploaded
- [ ] `npm install` completed (server & client)
- [ ] `npm run build` completed successfully
- [ ] New files verified: `index-CavVanIM.js` exists in `dist/assets/`
- [ ] Server started and health check passes
- [ ] Browser cache cleared
- [ ] New theme visible (deep navy + blue)

---

## 🆘 Troubleshooting

**Problem:** Still seeing old white/amber theme
**Solutions:**
1. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. Open in Incognito/Private mode
3. Clear service workers: Browser DevTools → Application → Service Workers → Unregister
4. Check server is serving new files: `curl https://tv.bakeandgrill.mv | grep "index-"`
5. Add .htaccess cache-busting (see above)

**Problem:** Build fails with "Out of memory"
**Solution:**
```bash
# Increase Node memory
NODE_OPTIONS='--max-old-space-size=4096' npm run build
```

**Problem:** Server won't start
**Solutions:**
1. Check port 4000 is free: `netstat -tlnp | grep :4000` or `ss -tlnp | grep :4000`
2. Kill process: `kill -9 <PID>`
3. Check .env file exists and has JWT_SECRET
4. Check MySQL is running and credentials are correct

---

## 📞 Need Help?
Check the server logs:
```bash
# If running in background
tail -f ~/tv.bakeandgrill.mv/server/logs/app.log

# Or check process output
ps aux | grep node
```

