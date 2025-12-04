# 📦 cPanel NPM Install Guide

**Issue:** Can't run `npm install` directly in cPanel terminal

**Reason:** cPanel Node.js Selector uses virtual environments differently

---

## ✅ SOLUTION: Use cPanel Interface

### **Method 1: Run NPM Install Button**

1. **Login to cPanel**
2. **Navigate to:** `Setup Node.js App`
3. **Find your app:** `tv.bakeandgrill.mv`
4. **Look for:** `Run NPM Install` button or `Package Manager` section
5. **Click:** `Run NPM Install`
6. **Wait:** Until it completes (may take 2-5 minutes)
7. **Click:** `Restart` button
8. **Done!** Packages installed

---

### **Method 2: Auto-Install on Restart**

Some cPanel setups auto-install from package.json:

1. **Just restart the app:**
   - cPanel → Setup Node.js App
   - Find: tv.bakeandgrill.mv
   - Click: `Restart`
   
2. **cPanel will:**
   - Read package.json
   - Auto-install missing packages
   - Start the app

---

### **Method 3: Via Terminal (Advanced)**

If you must use terminal:

```bash
cd ~/tv.bakeandgrill.mv

# Remove existing node_modules symlink
rm -f server/node_modules

# Run npm install through the proper environment
cd server
source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
npm install --production
deactivate

# Restart via cPanel Interface (not via touch tmp/restart.txt)
```

Then go to cPanel and click Restart.

---

## 🔍 VERIFY PACKAGES INSTALLED

### Check in cPanel:
1. Setup Node.js App → tv.bakeandgrill.mv
2. Look for package list or dependencies section
3. Should show multer and sharp

### Test API:
```bash
curl https://tv.bakeandgrill.mv/api/health
curl https://tv.bakeandgrill.mv/api/features
```

Both should return JSON (not 404).

---

## 🚨 IF RESTART BUTTON MISSING

Some cPanel versions don't have "Run NPM Install" button.

**Solution:**
1. Stop the app (Stop button)
2. Wait 10 seconds
3. Start the app (Start button)
4. cPanel auto-installs from package.json on start

---

## 📋 REQUIRED PACKAGES

These are in package.json and need to be installed:
- `multer` (file uploads)
- `sharp` (image processing)
- All other existing packages

---

## ✅ SIMPLEST APPROACH

**Just restart the app in cPanel:**

1. cPanel → Setup Node.js App
2. Click `Restart` button on tv.bakeandgrill.mv
3. Wait 30 seconds
4. Check if app is running

cPanel should auto-install packages from package.json.

---

## 🎯 SUMMARY

**Don't use:** `npm install` in terminal (causes errors)  
**Do use:** cPanel interface Restart or Run NPM Install button  

**After restart:** App should work without crashes!

