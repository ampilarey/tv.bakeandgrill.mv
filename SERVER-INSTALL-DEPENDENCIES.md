# 🔧 SERVER DEPENDENCIES - CRITICAL

**Issue:** Server missing new npm packages (multer, sharp)

---

## 🚨 THE REAL PROBLEM

When you pull code on the server, it gets the new route files that require new packages:
- `routes/uploads.js` → requires `multer` and `sharp`
- `utils/imageOptimizer.js` → requires `sharp`

**If these packages aren't installed on the server:**
- Server fails to load routes
- API endpoints don't exist
- Frontend tries to call them → errors
- App crashes!

---

## ✅ FIX (Run on Server)

### Install missing dependencies:

```bash
cd ~/tv.bakeandgrill.mv/server && source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate && npm install && deactivate && touch tmp/restart.txt && echo "✅ Dependencies installed and server restarted!"
```

This will:
1. Enter Node.js virtual environment
2. Install multer and sharp (from package.json)
3. Exit virtual environment  
4. Restart the app
5. All routes will load properly

---

## 📋 Required Packages

From server/package.json:
```json
{
  "multer": "^1.4.5-lts.1",  // File upload middleware
  "sharp": "^0.34.5"          // Image processing
}
```

---

## 🔍 HOW TO VERIFY

### Check if packages are installed:
```bash
cd ~/tv.bakeandgrill.mv/server
source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
npm list multer
npm list sharp
```

Should show the packages. If "UNMET DEPENDENCY" or "not found", run npm install.

### Check if routes loaded:
```bash
curl http://localhost:4000/api/features
curl http://localhost:4000/api/ticker
```

Should return JSON, not 404 or 500.

---

## 🎯 COMPLETE FIX PROCESS

### 1. Install server dependencies:
```bash
cd ~/tv.bakeandgrill.mv/server
source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
npm install
deactivate
```

### 2. Restart app:
```bash
cd ~/tv.bakeandgrill.mv
touch server/tmp/restart.txt
```

### 3. Verify:
```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/features
```

### 4. For users:
- Close PWA
- Clear browser data
- Reinstall PWA
- Should work perfectly now!

---

## 📝 WHY THIS WASN'T OBVIOUS

1. **git pull** downloads code but doesn't install npm packages
2. Server needs **manual npm install** after pulling new dependencies
3. Without packages, server silently fails to load routes
4. Frontend gets 404/500 errors → crashes

---

## ✅ SUMMARY

**Problem 1:** Missing prop-types in frontend dependencies  
**Problem 2:** Missing multer/sharp in server (not installed)  
**Solution:** Install both, rebuild, deploy  
**Status:** Ready to fix  

---

**Run the npm install command on the server and the crashes will stop!** 🚀

