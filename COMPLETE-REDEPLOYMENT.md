# 🔄 Complete Clean Redeployment Guide

## ⚠️ IMPORTANT: Backup First!

Before we start, **BACKUP YOUR DATABASE**:

```bash
# Create backup directory
mkdir -p ~/backups

# Backup database
mysqldump -u bakeandgrill -p bakeandgrill_tv > ~/backups/bakeandgrill_tv_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh ~/backups/ | tail -1
```

**Keep this backup safe!** You can restore it later if needed.

---

## 🧹 Step 1: Clean Everything on Production Server

```bash
# Stop the server
pkill -f "node.*server.js"
sleep 2

# Go to project directory
cd ~/tv.bakeandgrill.mv

# Stash any local changes (if any)
git stash

# Get latest code
git fetch origin
git reset --hard origin/main

# Clean node_modules and reinstall
cd server
rm -rf node_modules package-lock.json
npm install

# Go back to root
cd ~/tv.bakeandgrill.mv
```

---

## 🏗️ Step 2: Fresh Build on Local Machine

On your **LOCAL computer** (not server):

```bash
# Go to project directory
cd /Users/vigani/Website/tv

# Pull latest
git pull origin main

# Clean and rebuild frontend
cd client
rm -rf node_modules dist .vite
npm install
npm run build

# Verify build succeeded
ls -lh dist/assets/ | grep index-

# Go back to root
cd ..

# Commit and push the fresh build
git add -A
git commit -m "Clean rebuild - complete redeployment $(date +%Y%m%d_%H%M%S)"
git push origin main
```

---

## 🚀 Step 3: Deploy to Production

On your **PRODUCTION server**:

```bash
# Pull the fresh build
cd ~/tv.bakeandgrill.mv
git pull origin main

# Verify files are updated
ls -lh ~/tv.bakeandgrill.mv/client/dist/assets/ | grep index-
cat ~/tv.bakeandgrill.mv/client/dist/index.html | grep "index-"

# Check which migrations will run
ls -lh ~/tv.bakeandgrill.mv/server/database/migrations/

# Start the server
cd ~/tv.bakeandgrill.mv/server
nohup node server.js > ~/tv-server.log 2>&1 &

# Wait for startup
sleep 5

# Check if server started
ps aux | grep "[n]ode.*server.js"

# Check logs for any errors
tail -30 ~/tv-server.log

# Test health endpoint
curl http://localhost:4000/api/health
```

---

## ✅ Step 4: Verify Database

```bash
# Check all tables exist
mysql -u bakeandgrill -p bakeandgrill_tv -e "SHOW TABLES;"

# Verify watch_history table structure
mysql -u bakeandgrill -p bakeandgrill_tv -e "DESCRIBE watch_history;"

# Check users
mysql -u bakeandgrill -p bakeandgrill_tv -e "SELECT id, email, phone_number, first_name, role FROM users WHERE role='admin' LIMIT 3;"

# Check playlists
mysql -u bakeandgrill -p bakeandgrill_tv -e "SELECT id, name FROM playlists;"

# Clear old test history (optional)
mysql -u bakeandgrill -p bakeandgrill_tv -e "DELETE FROM watch_history WHERE channel_name='Test Channel';"
```

---

## 📱 Step 5: Test on Mobile (Fresh)

### Clear Everything on Mobile:

**Android Chrome:**
1. Open Chrome
2. Menu (⋮) > Settings
3. Site settings > All sites
4. Find "tv.bakeandgrill.mv"
5. Tap it > "Clear & reset"
6. Confirm

**iPhone Safari:**
1. Settings > Safari
2. "Clear History and Website Data"
3. Confirm

### Test the App:

1. **Close browser completely** (force quit the app)
2. **Reopen browser**
3. Go to **https://tv.bakeandgrill.mv**
4. Login with your admin credentials
5. **Check bottom navigation** - you should see:
   - 🏠 Home
   - ▶️ Watch
   - 📜 History ← **NEW!**
   - 👤 Profile
   - [Other tabs if admin]

6. **Test History Recording:**
   - Tap "Watch" (▶️)
   - Select the "watch TV" playlist
   - Pick any channel
   - Watch for **20+ seconds** (don't minimize)
   - Stay on the page

7. **Back on server, check:**
```bash
mysql -u bakeandgrill -p bakeandgrill_tv -e "SELECT id, user_id, channel_name, watched_at FROM watch_history ORDER BY watched_at DESC LIMIT 3;"
```

**Expected:** You should see a new record with the channel you just watched! ✅

---

## 🔍 Step 6: Verify All Features

### Test Checklist:

- [ ] Login works (email or phone)
- [ ] Dashboard loads
- [ ] History button visible on mobile bottom nav
- [ ] Can watch channels
- [ ] History is being recorded (check database)
- [ ] History page shows records
- [ ] Display Management works (if admin)
- [ ] Remote control works (if admin)
- [ ] No white text on light backgrounds
- [ ] All confirmation modals work (not browser alerts)
- [ ] Profile page works
- [ ] Can logout

---

## 🐛 Troubleshooting

### If Server Won't Start:

```bash
# Check logs for errors
tail -100 ~/tv-server.log

# Check if port 4000 is in use
lsof -ti:4000

# Kill anything on port 4000
lsof -ti:4000 | xargs kill -9

# Try again
cd ~/tv.bakeandgrill.mv/server
node server.js
# (Watch for errors, then Ctrl+C and run in background if it works)
```

### If History Still Not Working:

```bash
# Check if frontend files are correct
cd ~/tv.bakeandgrill.mv/client/dist
ls -lh assets/ | grep index-

# Should show: index-ZgN9OxFn.js (or newer)

# Check what index.html references
grep "index-" index.html

# Test history API directly
curl -X POST http://localhost:4000/api/history \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"playlist_id": 3, "channel_id": "test", "channel_name": "Test", "duration_seconds": 60}'
```

### If Mobile Still Shows Old Version:

The service worker is very aggressive. Try:

1. **Uninstall PWA** (if installed as app)
2. **Clear all site data** (not just cache)
3. **Use incognito/private mode** to test
4. **Try different browser** (if Chrome doesn't work, try Firefox)

---

## 📊 Success Indicators

You'll know it's working when:

1. ✅ Server logs show: "✅ Server started successfully!"
2. ✅ Health endpoint returns: `{"status":"ok","database":"connected"}`
3. ✅ Mobile shows History button (📜) in bottom nav
4. ✅ After watching 20+ seconds, database shows new record
5. ✅ History page displays your watch history

---

## 🆘 If You Need to Restore Backup

```bash
# Stop server
pkill -f "node.*server.js"

# Restore database
mysql -u bakeandgrill -p bakeandgrill_tv < ~/backups/YOUR_BACKUP_FILE.sql

# Restart server
~/restart-tv-server.sh
```

---

## 📝 Final Notes

- **Take your time** with each step
- **Check for errors** after each command
- **Send me any error messages** if something fails
- **Test thoroughly** before considering it done

---

**Ready to start? Begin with Step 1 (Backup)!** 🚀

