# 🚀 Bake & Grill TV - Production Deployment Checklist

**Ready to deploy:** January 19, 2025  
**Audit status:** ✅ ALL COMPLETE (16/16 items)  
**Local testing:** ✅ PASSED

---

## Pre-Deployment Checklist

- [x] Full system audit completed
- [x] All security vulnerabilities fixed
- [x] Client builds successfully
- [x] Server syntax verified
- [x] No linter errors
- [x] Changes committed to main branch
- [x] Local testing passed

---

## Deployment Steps

### 1. Pull Latest Changes

```bash
cd ~/tv.bakeandgrill.mv && git pull origin main
```

Expected output:
```
Updating eaf6127..30efccc
Fast-forward
 AUDIT-2025.md                           | 630 +++++++++++++++++++++
 AUDIT-SUMMARY.md                        | 315 +++++++++++
 DEPLOY-CHECKLIST.md                     | XXX +++++++++++
 server/server.js                        |  11 +-
 server/database/init.js                 |  45 +-
 server/middleware/validation.js         |  XX +
 server/middleware/errorHandler.js       |  XX +
 server/routes/users.js                  | XXX +
 server/routes/analytics.js              |  XX +
 server/routes/history.js                |  XX +
 server/routes/notifications.js          |  XX +
 server/routes/pairing.js                |  XX +
 server/utils/logger.js                  |  80 +++
 client/src/pages/PlayerPage.jsx         | XXX +
 client/src/pages/KioskModePage.jsx      |  XX +
 client/src/pages/FirstTimeSetupPage.jsx |  XX +
 client/src/pages/ProfilePage.jsx        |   6 +-
 XX files changed, XXXX insertions(+), XXX deletions(-)
```

### 2. Restart Server

```bash
~/restart-tv-server.sh
```

Expected output:
```
🔄 Restarting TV Server...
✅ Server started
📋 Logs: tail -f ~/tv-server.log
```

### 3. Check Server Logs

```bash
tail -f ~/tv-server.log
```

Expected (NO errors, should see):
```
🚀 Starting Bake & Grill TV Server...
🗄️ Initializing MySQL database...
✅ Connected to MySQL
✅ Database schema created
✅ Migration applied: ...
✅ Database initialization complete!
✅ Server started successfully!
🌐 Server running on: http://localhost:4000
```

**⚠️ STOP if you see ANY errors in the logs!**

---

## Post-Deployment Testing

### Test 1: Health Endpoint ✅

```bash
curl https://tv.bakeandgrill.mv/api/health
```

Expected HTTP 200:
```json
{
  "status": "ok",
  "database": "connected",
  "stats": {
    "users": X,
    "playlists": X
  }
}
```

✅ PASS if status is "ok" and database is "connected"  
❌ FAIL if status is "error" or HTTP 500 (indicates DB issue)

### Test 2: Login System ✅

**Test Phone Number Login:**
1. Go to: https://tv.bakeandgrill.mv
2. Enter phone number: `XXXXXXX` (7 digits)
3. Enter password
4. Click "Sign In"

✅ PASS if login succeeds  
❌ FAIL if you see "500 error" or "Unknown column phone_number"

**Test Email Login:**
1. Enter email: `admin@bakegrill.com` (or your admin email)
2. Enter password
3. Click "Sign In"

✅ PASS if login succeeds

### Test 3: Now Playing Overlay 🆕

1. Login and go to Player page
2. Select any channel
3. Look for overlay in top-left corner
4. Verify it shows:
   - Channel name
   - Category
   - Current time
5. Wait 6 seconds - it should disappear
6. Click video - overlay should toggle back

✅ PASS if overlay appears and auto-hides  
❌ FAIL if overlay doesn't show or causes errors

### Test 4: Display Pairing ✅

**Mobile QR Code Pairing:**
1. On TV: Go to `tv.bakeandgrill.mv/#/pair`
2. On Phone: Login → Displays → Pair Display
3. Scan QR code shown on TV
4. Verify TV loads player automatically

✅ PASS if display pairs and loads player  
❌ FAIL if stuck on pairing screen

### Test 5: Remote Control ✅

1. Open Display Management on mobile
2. Click "Remote" on any online display
3. Try changing channel
4. Try volume/mute controls
5. Verify modal STAYS OPEN after commands

✅ PASS if commands work and modal stays open  
❌ FAIL if modal closes after each command

### Test 6: Mobile Footer ✅

**iPhone Test:**
1. Open site on iPhone
2. Navigate to different pages
3. Look at bottom of screen
4. Verify footer appears BELOW bottom navigation tabs

✅ PASS if footer is visible below tabs  
❌ FAIL if footer is hidden or overlaps tabs

---

## Rollback Plan (If Needed)

If critical issues found:

```bash
cd ~/tv.bakeandgrill.mv

# Rollback to previous version (find commit hash from history)
git log --oneline | head -20

# Rollback to specific commit BEFORE audit
git checkout <commit-hash-before-audit>

# Restart server
~/restart-tv-server.sh
```

**Note:** All audit changes are separate commits, so you can rollback incrementally if needed.

---

## Environment Variables Check

Ensure these are set in `~/tv.bakeandgrill.mv/server/.env`:

### Required (Already Set)
```env
PORT=4000
NODE_ENV=production
JWT_SECRET=<your-secret>
DB_HOST=localhost
DB_PORT=3306
DB_USER=<your-db-user>
DB_PASSWORD=<your-db-password>
DB_NAME=bakeandgrill_tv
```

### New (Optional, for first-time admin creation only)
```env
# Only needed if creating new admin user
# REMOVE after admin is created!
ALLOW_DEFAULT_ADMIN=false  # Keep false for security
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=YourSecure12CharPassword!
```

---

## Success Criteria

✅ Deployment is successful if ALL of these are true:

1. Server starts without errors
2. Health endpoint returns HTTP 200
3. Can login with phone number
4. Can login with email
5. Player loads and plays channels
6. Now Playing overlay appears
7. Display pairing works
8. Remote control works on mobile
9. Footer visible on iPhone
10. No console errors in browser

---

## Support

If you encounter issues:

1. **Check server logs:**
   ```bash
   tail -50 ~/tv-server.log
   ```

2. **Check browser console:**
   - Open DevTools (F12)
   - Look for red errors
   - Share the error messages

3. **Rollback if critical:**
   - Use rollback plan above
   - Report issues for investigation

---

## Final Notes

- All changes are **backward-compatible**
- No database migrations needed (phone_number columns already exist)
- No .env changes required (unless creating new admin)
- Safe to deploy during business hours

**🎉 Ready to deploy!**

