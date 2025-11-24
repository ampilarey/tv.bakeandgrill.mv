# 🔐 ADMIN ACCESS GUIDE

**Your admin account is ready!**

---

## 👤 YOUR ADMIN CREDENTIALS

Based on your database, you have an admin user:

**Email:** `7820288@gamil.com`  
**Phone:** `7820288`  
**Role:** `admin`

**Password:** (Use the password you set when creating this account)

---

## 🚀 HOW TO ACCESS ADMIN FEATURES

### **Step 1: Open Browser**
```
http://localhost:5173
```

### **Step 2: Login**
1. Go to: `http://localhost:5173/login`
2. Enter your credentials:
   - **Email:** `7820288@gamil.com`
   - **Password:** (your password)
   
   OR
   
   - **Phone:** `7820288`
   - **Password:** (your password)

### **Step 3: Go to Admin Dashboard**
After login, you'll be redirected to dashboard.

**Or go directly to:**
```
http://localhost:5173/admin/dashboard
```

### **Step 4: See New Features!**
In Admin Dashboard, you'll see **6 buttons**:

**Original:**
- 👥 Manage Users
- 🖥️ Manage Displays
- 📊 View Analytics

**NEW (Phase 1-8):**
- 📢 **Ticker Messages** ← NEW!
- 📅 **Schedules** ← NEW!
- 🎬 **Scenes & Modes** ← NEW!

---

## 🎯 DIRECT ADMIN LINKS

Once logged in, visit these directly:

1. **Admin Dashboard:**
   ```
   http://localhost:5173/admin/dashboard
   ```

2. **Ticker Management:**
   ```
   http://localhost:5173/admin/ticker
   ```

3. **Schedule Management:**
   ```
   http://localhost:5173/admin/schedules
   ```

4. **Scene Management:**
   ```
   http://localhost:5173/admin/scenes
   ```

5. **User Management:**
   ```
   http://localhost:5173/admin/users
   ```

6. **Display Management:**
   ```
   http://localhost:5173/admin/displays
   ```

---

## 🔍 IF YOU FORGOT PASSWORD

**Reset via database:**
```bash
cd /Users/vigani/Website/tv/server
mysql -u root -p bakegrill_tv

# Then run:
UPDATE users 
SET password_hash = '$2b$10$YourNewHashHere' 
WHERE email = '7820288@gamil.com';
```

**Or create new admin:**
```bash
# Via API or database directly
```

---

## ✅ VERIFY ADMIN ACCESS

**Check your role:**
1. Login at `/login`
2. Check URL - should redirect to `/dashboard` or `/admin/dashboard`
3. Look for admin menu items
4. Should see "Admin Dashboard" option

**If you see admin features, you're in!** ✅

---

## 🎯 WHAT YOU CAN DO AS ADMIN

### **New Features (Phase 1-8):**

1. **📢 Ticker Messages**
   - Create scrolling messages
   - Set priorities
   - Schedule start/end dates
   - Display-specific or global

2. **📅 Advanced Scheduling**
   - Date range scheduling
   - Priority system
   - Apply presets (Breakfast, Lunch, Ramadan, etc.)
   - Check conflicts

3. **🎬 Scenes & Modes**
   - Create scenes (Busy Mode, Match Night)
   - Activate on displays
   - Set display modes (Normal/Kids/Training)

4. **📸 Image Upload**
   - Upload food photos
   - Auto-optimization
   - Create image slides

5. **📱 QR Codes**
   - Generate QR codes
   - 3 layout options
   - Link to menus, WiFi, etc.

6. **🎥 YouTube & Videos**
   - Embed YouTube videos
   - Upload MP4 videos
   - OneDrive integration

7. **💬 Announcements**
   - Send quick messages to displays
   - Full-screen overlays
   - Quick templates

---

## 🚀 QUICK START

1. **Open:** `http://localhost:5173`
2. **Login** with your admin credentials
3. **Go to:** `/admin/dashboard`
4. **Click** any of the 3 new buttons
5. **Start using** the new features!

---

**Your admin account is ready!**  
**Just login and explore the new features!** 🎉

