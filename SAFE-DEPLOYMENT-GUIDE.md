# 🛡️ Safe Production Deployment - Complete Guide

**Date:** January 20, 2025  
**Local & Remote Status:** ✅ IN SYNC  
**Latest Commit:** `ae88aeb`

---

## ✅ VERIFICATION - Everything is Ready

### Local Status:
```
Commit: ae88aeb (Add production deployment ready documentation with complete changelog)
Branch: main
Status: Clean working tree
```

### Remote (GitHub) Status:
```
Commit: ae88aeb (same as local ✅)
All 28 commits pushed ✅
```

**✅ Local and remote are IDENTICAL** - Production will match local after pull.

---

## 🎯 DEPLOYMENT STEPS (Production Server)

### Step 1: Check Current Production Status

```bash
# Login to production
cd ~/tv.bakeandgrill.mv

# Check current commit
git log --oneline | head -1

# Check what will be pulled
git fetch origin main
git log --oneline HEAD..origin/main | head -30
```

**This shows all commits that will be pulled.**

---

### Step 2: Backup Current Production (SAFE!)

```bash
# Create backup of current code
cd ~
cp -r tv.bakeandgrill.mv tv.bakeandgrill.mv.backup-$(date +%Y%m%d-%H%M%S)

# Verify backup created
ls -la | grep tv.bakeandgrill.mv
```

**You'll see:**
```
tv.bakeandgrill.mv/                    (current)
tv.bakeandgrill.mv.backup-20250120-XXX/  (backup)
```

**If anything goes wrong, you can restore from backup.**

---

### Step 3: Pull Changes

```bash
cd ~/tv.bakeandgrill.mv
git pull origin main
```

**Expected output:**
```
From github.com:ampilarey/tv.bakeandgrill.mv
 * branch            main       -> FETCH_HEAD
   <old>..ae88aeb  main       -> origin/main
Updating <old>..ae88aeb
Fast-forward
 [Shows all changed files]
 XX files changed, XXXX insertions(+), XXX deletions(-)
 create mode 100644 AUDIT-2025.md
 create mode 100644 AUDIT-SUMMARY.md
 [etc...]
```

**✅ Success indicators:**
- "Fast-forward" (safe update)
- Shows file counts
- No conflicts

**❌ Stop if you see:**
- "CONFLICT" messages
- "error" or "fatal"
- Anything unusual

---

### Step 4: Restart Server

```bash
~/restart-tv-server.sh
```

**Expected output:**
```
🔄 Restarting TV Server...
✅ Server started
📋 Logs: tail -f ~/tv-server.log
```

---

### Step 5: Check Server Logs

```bash
tail -50 ~/tv-server.log
```

**✅ Good signs:**
```
🚀 Starting Bake & Grill TV Server...
🗄️ Initializing MySQL database...
✅ Connected to MySQL
✅ Database schema created
✅ Migration applied: [migrations...]
✅ Database initialization complete!
✅ Server started successfully!
🌐 Server running on: http://localhost:4000
```

**❌ Stop if you see:**
- "Unknown column 'phone_number'"
- "Error:" or "Failed:"
- Server crash or exit

---

### Step 6: Test Health Endpoint

```bash
curl https://tv.bakeandgrill.mv/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-20T...",
  "version": "1.0.0",
  "database": "connected",
  "stats": {
    "users": X,
    "playlists": X
  }
}
```

**✅ PASS if:**
- HTTP 200 status
- "status": "ok"
- "database": "connected"

**❌ FAIL if:**
- HTTP 500 status
- "status": "error"
- "database": "unavailable"

---

## 🧪 POST-DEPLOYMENT TESTING

### Test 1: Login (Critical!)

**On your phone or computer:**
1. Go to: https://tv.bakeandgrill.mv
2. **Test phone login:**
   - Phone: `7820288` (or your phone number)
   - Password: (your password)
   - Click "Sign In"
   
**✅ PASS if:** Login successful  
**❌ FAIL if:** "Unknown column phone_number" error

**If login fails with phone_number error:**
```bash
# Run this SQL fix:
mysql -u <your-db-user> -p<your-db-password> <your-db-name> -e "
ALTER TABLE users ADD COLUMN phone_number VARCHAR(7) UNIQUE NULL AFTER email;
ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT FALSE AFTER is_active;
CREATE INDEX idx_users_phone ON users(phone_number);
ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL;
"

# Then restart server
~/restart-tv-server.sh
```

---

### Test 2: Now Playing Overlay (New Feature)

1. Login
2. Go to Player page
3. Select any channel
4. **Look for overlay in top-left corner**
5. Should show channel name, category, time
6. Should auto-hide after 6 seconds

**✅ PASS if:** Overlay appears and auto-hides  
**❌ FAIL if:** No overlay or causes errors

---

### Test 3: Remote Control Search (New Feature)

1. Go to Display Management
2. Click "📱 Remote" on any display
3. **Type in search box:** "news" or "sport"
4. Channels should filter as you type
5. Click any channel → Highlights in maroon
6. Click "Change Channel"

**✅ PASS if:** Search filters instantly and channel changes  
**❌ FAIL if:** Search doesn't work or modal closes

---

### Test 4: Back Navigation (New Feature)

1. Go to Profile page → Click ← Back
2. Go to History page → Click ← Back
3. Go to Player page → Click ← Back
4. Each should navigate back to Dashboard/Admin

**✅ PASS if:** All back buttons work  
**❌ FAIL if:** Back button doesn't exist or doesn't work

---

### Test 5: Mobile Layout

**On iPhone/Android:**
1. Login page - layout looks good
2. Player page - Now Playing overlay appears
3. Display Management - Remote control search works
4. Profile page - back button works
5. Footer - visible below bottom tabs

**✅ PASS if:** All mobile layouts work correctly  
**❌ FAIL if:** Buttons hidden or overlapping

---

## 🔄 ROLLBACK PLAN (If Needed)

### If Critical Issues Found:

```bash
cd ~/tv.bakeandgrill.mv

# Stop current server
kill $(ps aux | grep "[n]ode.*server.js" | awk '{print $2}')

# Rollback to backup
cd ~
rm -rf tv.bakeandgrill.mv
mv tv.bakeandgrill.mv.backup-YYYYMMDD-HHMMSS tv.bakeandgrill.mv

# Restart old version
~/restart-tv-server.sh
```

**Or rollback to specific commit:**
```bash
cd ~/tv.bakeandgrill.mv

# Find commit before audit (show last 30 commits)
git log --oneline | head -30

# Rollback to before audit (example)
git checkout <commit-before-audit>

# Restart
~/restart-tv-server.sh
```

---

## 📊 WHAT CHANGED (Summary)

### Files Modified: ~45 files

**Backend:**
- 11 route/middleware files
- 1 new utility file (logger.js)
- Database validation improvements

**Frontend:**
- 11 page components
- Better mobile UX
- New features (Now Playing, search)

**Documentation:**
- 5 new documentation files
- Complete audit trail

---

## 🎯 SUCCESS CRITERIA

**Deployment is successful if ALL these are true:**

1. ✅ Server starts without errors
2. ✅ Health endpoint returns HTTP 200
3. ✅ Can login with phone number
4. ✅ Can login with email
5. ✅ Player loads and plays channels
6. ✅ Now Playing overlay appears
7. ✅ Remote control search works
8. ✅ Back buttons work on all pages
9. ✅ Mobile layout looks correct
10. ✅ No console errors in browser

**If ANY fail:** Use rollback plan above.

---

## 💡 TIPS

### Before Deploying:
- ✅ Backup created
- ✅ Know how to access server logs
- ✅ Have rollback plan ready

### During Deployment:
- Watch the pull output carefully
- Check for "CONFLICT" or "error" messages
- Verify server restart succeeds

### After Deployment:
- Test login immediately
- Check health endpoint
- Browse site on mobile
- Monitor server logs for errors

---

## 📞 IF SOMETHING GOES WRONG

1. **Check server logs:**
   ```bash
   tail -100 ~/tv-server.log
   ```

2. **Check if server is running:**
   ```bash
   ps aux | grep "[n]ode.*server.js"
   ```

3. **Restart server:**
   ```bash
   ~/restart-tv-server.sh
   ```

4. **If database error:**
   - Check phone_number column exists
   - Run SQL fix (provided above)

5. **If all else fails:**
   - Use rollback plan
   - Restore from backup
   - Report the error

---

## ✅ YOU'RE READY!

**Local commit:** `ae88aeb` ✅  
**Remote commit:** `ae88aeb` ✅  
**Build status:** SUCCESS ✅  
**Everything pushed:** YES ✅

**Run this command to deploy:**

```bash
cd ~/tv.bakeandgrill.mv && git pull origin main && ~/restart-tv-server.sh
```

**After pulling, production will be EXACTLY like your local version!** 🎯

