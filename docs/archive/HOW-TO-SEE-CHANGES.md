# 🔍 HOW TO SEE THE NEW FEATURES

**If you don't see any difference locally, follow these steps:**

---

## ✅ STEP 1: Check Database Tables

The new features require database tables. Let's verify they exist:

```bash
cd /Users/vigani/Website/tv/server
mysql -u root -p bakegrill_tv -e "SHOW TABLES;"
```

**You should see these NEW tables:**
- `playlist_items`
- `ticker_messages`
- `scenes`
- `feature_flags`
- `schedule_presets`
- `announcements`
- `slide_templates`
- `screen_profiles`
- `schedule_conflicts`

**If tables are missing**, run the migrations:
```bash
cd /Users/vigani/Website/tv/server
node database/run-migration.js migrations/2025-11-21-phase1-foundation.sql
node database/run-migration.js migrations/2025-11-21-phase5-advanced-scheduling.sql
```

---

## ✅ STEP 2: Restart Your Dev Server

**The server needs to load the new routes!**

```bash
# Stop current server (Ctrl+C)

# Restart server
cd /Users/vigani/Website/tv/server
npm run dev
```

**Important:** The server needs to be restarted to load:
- New route files
- New middleware
- Updated server.js

---

## ✅ STEP 3: Rebuild Frontend (if needed)

```bash
cd /Users/vigani/Website/tv/client
npm run dev
```

**If using production build:**
```bash
cd /Users/vigani/Website/tv/client
npm run build
```

---

## ✅ STEP 4: Hard Refresh Browser

**Clear cache and reload:**

- **Chrome/Edge:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox:** `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- **Safari:** `Cmd+Option+R` (Mac)

**Or:**
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

---

## ✅ STEP 5: Access New Pages

### **Admin Dashboard** (`/admin/dashboard`)

**You should now see 3 NEW buttons:**

1. **📢 Ticker Messages** - Manage scrolling messages
2. **📅 Schedules** - Advanced scheduling with dates
3. **🎬 Scenes & Modes** - One-click configurations

### **Direct URLs:**

- **Ticker Management:** `http://localhost:5173/admin/ticker`
- **Schedule Management:** `http://localhost:5173/admin/schedules`
- **Scene Management:** `http://localhost:5173/admin/scenes`

### **Mobile Menu:**

Click the hamburger menu (☰) and you'll see:
- 📢 Ticker Messages
- 📅 Schedules
- 🎬 Scenes & Modes

---

## ✅ STEP 6: Test Feature Flags

**Check if features are enabled:**

```bash
curl http://localhost:4000/api/features
```

**Or visit:** `http://localhost:4000/api/features`

**You should see:**
```json
{
  "success": true,
  "flags": {
    "image_slides": true,
    "qr_codes": true,
    "info_ticker": true,
    "announcements": true,
    "youtube_embed": true,
    "advanced_scheduling": true,
    "scenes": true,
    "kids_mode": true,
    "staff_training_mode": true,
    "slide_templates": true,
    "upsell_logic": true,
    "offline_cache": true
  }
}
```

---

## ✅ STEP 7: Test New Features

### **Test Ticker:**
1. Go to `/admin/ticker`
2. Click "+ Add Message"
3. Enter message: "🔥 Special: 50% Off Today!"
4. Click "Create Message"
5. Open a display in kiosk mode - you'll see ticker scrolling at bottom!

### **Test Schedules:**
1. Go to `/admin/schedules`
2. Select a display
3. Click "+ Add Schedule"
4. Choose schedule type (Time of Day, Date Range, etc.)
5. Set times/dates
6. Click "Create Schedule"

### **Test Scenes:**
1. Go to `/admin/scenes`
2. Click "+ Create Scene"
3. Enter name: "Busy Mode"
4. Select playlist
5. Enable/disable ticker, audio, etc.
6. Click "Create Scene"
7. Activate on a display!

---

## ⚠️ COMMON ISSUES

### **Issue: 404 on new pages**
**Solution:** 
- Restart server (`npm run dev` in server folder)
- Hard refresh browser

### **Issue: Tables don't exist**
**Solution:**
```bash
cd /Users/vigani/Website/tv/server
node database/run-migration.js migrations/2025-11-21-phase1-foundation.sql
```

### **Issue: Features not showing**
**Solution:**
- Check feature flags: `curl http://localhost:4000/api/features`
- Enable missing flags:
```bash
cd /Users/vigani/Website/tv/server
node database/enable-phase2-features.js
node database/enable-phase3-features.js
node database/enable-phase4-features.js
node database/enable-phase5-features.js
node database/enable-phase6-features.js
node database/enable-phase7-features.js
node database/enable-phase8-features.js
```

### **Issue: Routes not working**
**Solution:**
- Check server logs for errors
- Verify routes are registered in `server/server.js`
- Check console for JavaScript errors

---

## 🎯 QUICK CHECKLIST

- [ ] Database tables exist (10 new tables)
- [ ] Server restarted (`npm run dev` in server folder)
- [ ] Client restarted (`npm run dev` in client folder)
- [ ] Browser hard refreshed (Ctrl+Shift+R)
- [ ] Logged in as admin
- [ ] Navigated to `/admin/dashboard`
- [ ] See new buttons (Ticker, Schedules, Scenes)
- [ ] Feature flags enabled (check `/api/features`)

---

## 📞 STILL NOT WORKING?

**Debug steps:**

1. **Check server logs:**
```bash
# Look for route registration messages
# Should see: "Mount API routes" messages
```

2. **Check browser console:**
```bash
# Open DevTools (F12)
# Look for JavaScript errors
# Check Network tab for failed requests
```

3. **Check API directly:**
```bash
# Test feature flags
curl http://localhost:4000/api/features

# Test ticker endpoint
curl http://localhost:4000/api/ticker \
  -H "Authorization: Bearer YOUR_TOKEN"
```

4. **Verify files exist:**
```bash
ls /Users/vigani/Website/tv/server/routes/features.js
ls /Users/vigani/Website/tv/client/src/pages/admin/TickerManagement.jsx
ls /Users/vigani/Website/tv/client/src/pages/admin/ScheduleManagement.jsx
ls /Users/vigani/Website/tv/client/src/pages/admin/SceneManagement.jsx
```

---

## 🚀 EXPECTED BEHAVIOR

**After following all steps, you should:**

1. ✅ See 3 new buttons in Admin Dashboard
2. ✅ Access `/admin/ticker` page
3. ✅ Access `/admin/schedules` page
4. ✅ Access `/admin/scenes` page
5. ✅ See ticker in kiosk mode (bottom of screen)
6. ✅ See announcements when sent to display
7. ✅ Create schedules with date ranges
8. ✅ Create scenes and activate them

---

**If still not working, share:**
1. Server logs
2. Browser console errors
3. Network tab errors
4. Current URL you're on

**We'll fix it together!** 🚀

