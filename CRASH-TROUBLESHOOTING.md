# 🔧 APP CRASH TROUBLESHOOTING

**Issue:** Mobile PWA showing "Oops! Something went wrong" error frequently

---

## 🔍 IMMEDIATE FIXES APPLIED

### 1. Global Error Tracking
- Added comprehensive error logging
- All errors now stored in localStorage
- Tracks context, stack traces, and user agent

### 2. Error Boundary
- Wrapped entire app in ErrorBoundary
- Catches React component errors
- Prevents full app crashes

### 3. Improved Service Worker
- Added periodic update checks (every 5 min)
- Better visibility change handling
- More robust update detection

---

## 📊 HOW TO DIAGNOSE CRASHES

### On Mobile PWA:

1. **Open Browser Dev Tools on Mobile:**
   - **Android Chrome:** chrome://inspect → Select device
   - **iOS Safari:** Settings → Safari → Advanced → Web Inspector

2. **Check Console:**
   - Look for error messages
   - Check for failed API calls (red in Network tab)

3. **View Stored Errors:**
   Open browser console and run:
   ```javascript
   console.log(JSON.parse(localStorage.getItem('app_errors')));
   ```

4. **Clear Error Log:**
   ```javascript
   localStorage.removeItem('app_errors');
   ```

---

## 🚨 COMMON CRASH CAUSES

### 1. API Endpoint Not Found (404/500)
**Symptom:** App crashes when navigating to new pages  
**Cause:** New routes not loaded on server  
**Fix:**
```bash
# On server
cd ~/tv.bakeandgrill.mv/
git pull origin main
touch server/tmp/restart.txt
```

### 2. Memory Issues (Out of Memory)
**Symptom:** App crashes after using for a while  
**Cause:** Too many cached items or memory leaks  
**Fix:**
- Clear browser cache
- Restart the PWA app
- On iOS: Settings → Safari → Clear History and Website Data

### 3. Service Worker Conflicts
**Symptom:** App crashes on startup or navigation  
**Cause:** Old service worker cached  
**Fix:**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister());
});
// Then hard refresh: Cmd+Shift+R
```

### 4. Network Errors
**Symptom:** Crashes when offline or poor connection  
**Cause:** API calls failing without proper error handling  
**Fix:** Already improved with error tracking utility

---

## 🔧 QUICK FIXES FOR USERS

### Fix 1: Force Refresh PWA
```
1. Close the PWA app completely
2. Swipe up to close (don't just minimize)
3. Reopen the app from home screen
4. Should check for updates and reload
```

### Fix 2: Clear App Data
**iOS:**
```
Settings → Safari → Advanced → Website Data
Find tv.bakeandgrill.mv → Delete
Reopen PWA
```

**Android:**
```
Settings → Apps → Bake & Grill TV → Storage
Clear Data / Clear Cache
Reopen PWA
```

### Fix 3: Reinstall PWA
```
1. Remove from home screen
2. Visit https://tv.bakeandgrill.mv in browser
3. Add to home screen again
4. Open the new PWA
```

---

## 📝 FOR DEVELOPERS: Check Error Logs

### View Errors in Console:
```javascript
// See all stored errors
const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
console.table(errors.slice(0, 10));

// Filter by error type
errors.filter(e => e.context.type === 'API_CALL');

// Clear errors
localStorage.removeItem('app_errors');
```

### Common Error Patterns:

**Pattern 1: "Cannot read property of undefined"**
- Missing null checks
- Data not loaded before access
- Fix: Add optional chaining (`?.`)

**Pattern 2: "Network request failed"**
- API endpoint doesn't exist
- Server not responding
- Fix: Check server logs, verify routes

**Pattern 3: "QuotaExceededError"**
- localStorage full
- Too much cache
- Fix: Clear old data, implement cleanup

---

## 🛡️ PREVENTIVE MEASURES (APPLIED)

✅ Global error handler installed  
✅ Error logging to localStorage  
✅ ErrorBoundary wrapping entire app  
✅ Better service worker update detection  
✅ Periodic update checks (5 min intervals)  
✅ Visibility change listeners  

---

## 🔄 NEXT STEPS

### On Live Server:
```bash
cd ~/tv.bakeandgrill.mv/
git pull origin main
mkdir -p server/tmp
touch server/tmp/restart.txt
```

### For Users:
- Close and reopen PWA
- Wait 5-10 minutes for auto-update
- Or manually clear cache and reinstall

---

## 📞 IF CRASHES PERSIST

1. **Check stored errors:**
   ```javascript
   localStorage.getItem('app_errors')
   ```

2. **Check server logs:**
   ```bash
   tail -100 ~/logs/tv.bakeandgrill.mv.log
   ```

3. **Test specific pages:**
   - Does login work?
   - Does dashboard load?
   - Which page causes the crash?

4. **Send error logs:**
   - Copy error logs from localStorage
   - Share with developer
   - Include: device type, OS version, browser

---

**Error tracking is now active. This will help identify the root cause of crashes.**

