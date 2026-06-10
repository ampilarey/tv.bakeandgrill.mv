# 🚨 EMERGENCY FIX - App Still Crashing

**Issue:** Mobile app showing "Oops! Something went wrong" repeatedly

---

## 🔧 IMMEDIATE FIX (Run on Server)

### Option 1: Disable New Features (Safe Rollback)

```bash
cd ~/tv.bakeandgrill.mv/server && mysql -u root -p bakegrill_tv -e "
UPDATE feature_flags 
SET is_enabled = FALSE 
WHERE flag_name IN ('info_ticker', 'announcements');
" && touch ~/tv.bakeandgrill.mv/server/tmp/restart.txt && echo "✅ Disabled potentially problematic features"
```

This will disable ticker and announcements temporarily.

---

### Option 2: Check What's Causing the Crash

Run in mobile browser console:
```javascript
// See stored errors
localStorage.getItem('app_errors')

// Or formatted
JSON.parse(localStorage.getItem('app_errors') || '[]').forEach(e => console.log(e))
```

---

## 🔍 LIKELY CAUSES

### 1. New API Endpoints Not Loaded
**Symptom:** Crashes when components try to call `/api/ticker`, `/api/features`, etc.

**Fix:**
```bash
cd ~/tv.bakeandgrill.mv/server
# Check if new routes are in the code
ls -la routes/ | grep -E "ticker|features|scenes"

# If missing, pull again
cd ~/tv.bakeandgrill.mv
git pull origin main
touch server/tmp/restart.txt
```

### 2. Missing Dependencies
**Symptom:** "Module not found" errors

**Fix:**
```bash
cd ~/tv.bakeandgrill.mv/server
source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
npm install
deactivate
touch tmp/restart.txt
```

### 3. Service Worker Conflict
**Symptom:** Crashes on app open

**User Fix:**
```javascript
// In mobile browser console
localStorage.clear();
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
// Then hard refresh
location.reload();
```

---

## 🛡️ SAFE MODE (Temporary Fix for Users)

**If app keeps crashing, use browser instead of PWA:**

1. Open Safari/Chrome on mobile
2. Visit: `https://tv.bakeandgrill.mv`
3. Use as web app (don't add to home screen)
4. Should work without crashes

---

## 🔍 DEBUG STEPS

### On Server - Check if routes loaded:
```bash
cd ~/tv.bakeandgrill.mv
curl http://localhost:4000/api/features 2>&1 | head -5
curl http://localhost:4000/api/ticker 2>&1 | head -5
```

Should return JSON, not 404 errors.

### On Server - Check server logs:
```bash
tail -100 ~/logs/tv.bakeandgrill.mv.log | grep -i error
```

### On Mobile - Check console errors:
1. Connect phone to computer
2. Enable debugging
3. Open Chrome DevTools → Remote Devices
4. Inspect the PWA
5. Check console for errors

---

## ⚡ QUICK ROLLBACK (If Nothing Works)

```bash
cd ~/tv.bakeandgrill.mv
git log --oneline -10  # Find last stable version
git reset --hard 15a4796  # Roll back to before new features
touch server/tmp/restart.txt
```

This rolls back to the version before all the new phases.

---

## 📝 NEXT STEPS

1. **Disable new features** temporarily (Option 1 above)
2. **Check error logs** in browser console
3. **Share error logs** with me
4. **I'll fix the specific issue** causing crashes

---

**For now, safest approach: disable ticker and announcements, keep the app stable.**

