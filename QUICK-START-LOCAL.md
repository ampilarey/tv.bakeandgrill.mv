# 🚀 QUICK START - See Changes Locally

**Follow these steps to see all the new features:**

---

## ⚡ QUICK STEPS (5 minutes)

### 1️⃣ **Restart Your Server** (IMPORTANT!)
```bash
# In Terminal 1 - Stop current server (Ctrl+C), then:
cd /Users/vigani/Website/tv/server
npm run dev
```

**This loads the new routes!** 🔄

---

### 2️⃣ **Restart Your Client** (if needed)
```bash
# In Terminal 2 - Stop current client (Ctrl+C), then:
cd /Users/vigani/Website/tv/client
npm run dev
```

---

### 3️⃣ **Hard Refresh Browser**
- **Mac:** `Cmd + Shift + R`
- **Windows:** `Ctrl + Shift + R`

Or:
1. Open DevTools (F12)
2. Right-click refresh button → "Empty Cache and Hard Reload"

---

### 4️⃣ **Login as Admin & Navigate**

1. **Login** at `http://localhost:5173/login`
2. **Go to Admin Dashboard:** `http://localhost:5173/admin/dashboard`
3. **Look for 3 NEW buttons:**
   - 📢 **Ticker Messages**
   - 📅 **Schedules**
   - 🎬 **Scenes & Modes**

---

## ✅ WHAT YOU SHOULD SEE

### **In Admin Dashboard** (`/admin/dashboard`):

**Before:** 3 buttons (Users, Displays, Analytics)  
**After:** 6 buttons (Users, Displays, Analytics, **Ticker**, **Schedules**, **Scenes**)

### **New Pages Available:**

1. **`/admin/ticker`** - Manage ticker messages
   - Create/edit/delete messages
   - Set priority, dates
   - Activate/deactivate

2. **`/admin/schedules`** - Advanced scheduling
   - Date range scheduling
   - Priority system
   - Apply presets
   - Check conflicts

3. **`/admin/scenes`** - Scene management
   - Create scenes (Busy Mode, Match Night, etc.)
   - Activate on displays
   - Set display modes (Normal/Kids/Training)

---

## 🎯 TEST NEW FEATURES

### **Test 1: Ticker Messages**
1. Go to `/admin/ticker`
2. Click "+ Add Message"
3. Enter: "🔥 Special Offer Today!"
4. Create message
5. Open display in kiosk mode (`/display?token=...`)
6. **See ticker scrolling at bottom!** ✅

### **Test 2: Announcements**
1. Go to `/admin/displays`
2. Click on a display
3. Look for "Send Announcement" button
4. Send message
5. **See full-screen announcement on display!** ✅

### **Test 3: Schedules**
1. Go to `/admin/schedules`
2. Select a display
3. Click "Apply Preset"
4. Choose "Breakfast Menu" preset
5. Apply to display
6. **Schedule is created!** ✅

### **Test 4: Scenes**
1. Go to `/admin/scenes`
2. Click "+ Create Scene"
3. Name: "Busy Mode"
4. Select playlist
5. Create scene
6. Activate on display
7. **Scene activated!** ✅

---

## 🔍 VERIFY EVERYTHING IS WORKING

### **Check Feature Flags:**
Visit: `http://localhost:4000/api/features`

**Should show:**
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
    ...
  }
}
```

### **Check Tables Exist:**
```bash
cd /Users/vigani/Website/tv/server
mysql -u root -p bakegrill_tv -e "SHOW TABLES;" | grep -E "(ticker|scenes|schedule_presets|playlist_items)"
```

**Should show:** 4+ tables

---

## ⚠️ IF STILL NOT SEEING CHANGES

### **Check 1: Server Running?**
```bash
# Should see server running on port 4000
curl http://localhost:4000/api/health
```

### **Check 2: Client Running?**
```bash
# Should see client running on port 5173 (or 3000)
# Open: http://localhost:5173
```

### **Check 3: Logged in as Admin?**
- Must be logged in as admin
- URL should be `/admin/dashboard`

### **Check 4: Routes Registered?**
Open browser console (F12) and check for errors.  
Routes should load without 404 errors.

---

## 📱 MOBILE MENU

**On mobile/small screen:**

1. Click hamburger menu (☰) in top-left
2. **You'll see new menu items:**
   - 📢 Ticker Messages
   - 📅 Schedules
   - 🎬 Scenes & Modes

---

## 🎯 DIRECT LINKS TO TEST

**Just copy and paste these URLs:**

1. **Ticker Management:**
   ```
   http://localhost:5173/admin/ticker
   ```

2. **Schedule Management:**
   ```
   http://localhost:5173/admin/schedules
   ```

3. **Scene Management:**
   ```
   http://localhost:5173/admin/scenes
   ```

---

## 🚀 SUMMARY

**To see changes:**
1. ✅ Restart server (`npm run dev` in server folder)
2. ✅ Restart client (`npm run dev` in client folder)
3. ✅ Hard refresh browser (Cmd+Shift+R)
4. ✅ Login as admin
5. ✅ Go to `/admin/dashboard`
6. ✅ See 3 new buttons!

**Everything is ready - just restart and refresh!** 🎉

---

**Need help?** Check `HOW-TO-SEE-CHANGES.md` for detailed troubleshooting!

