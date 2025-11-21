# Deploy Pairing Link Fix to Production

## Issue
The "Pair Display Now" button on https://tv.bakeandgrill.mv still shows `/#/pair` (old HashRouter format) instead of `/pair` (BrowserRouter format).

## Status
✅ **Fix is complete and pushed to GitHub**  
❌ **Production server needs to be updated**

---

## Deployment Steps

### 1. SSH into Production Server
```bash
ssh bakeandgrill@sg-s2.your-server.com
```

### 2. Pull Latest Changes
```bash
cd ~/tv.bakeandgrill.mv
git pull origin main
```

Expected output:
```
remote: Enumerating objects...
Updating ab882f3..173c6aa
Fast-forward
 client/src/pages/LoginPage.jsx | 4 ++--
 ...
```

### 3. Verify the Fix is There
```bash
# Check that LoginPage.jsx now uses Link component
grep -n "Link" ~/tv.bakeandgrill.mv/client/src/pages/LoginPage.jsx | head -5
```

Expected output:
```
2:import { useNavigate, Link } from 'react-router-dom';
251:              <Link
```

### 4. Copy Built Files to Public Web Directory
```bash
# Copy the updated client/dist files
cp -r ~/tv.bakeandgrill.mv/client/dist/* ~/public_html/tv.bakeandgrill.mv/

# Or if files are in a different location:
cp -r ~/tv.bakeandgrill.mv/client/dist/* ~/tv.bakeandgrill.mv/
```

### 5. Clear Browser Cache (IMPORTANT!)
The old files might be cached by:
- Service Worker (PWA)
- Browser cache
- Cloudflare (if using CDN)

**Options:**

**A. Force Cache Refresh (Recommended):**
```bash
# Update the app version to force cache clear
cd ~/tv.bakeandgrill.mv/client/src/utils
nano version.js
```

Change:
```javascript
export const APP_VERSION = '1.0.7';
```

To:
```javascript
export const APP_VERSION = '1.0.8';
```

Then rebuild and copy:
```bash
cd ~/tv.bakeandgrill.mv/client
npm run build
cp -r dist/* ~/public_html/tv.bakeandgrill.mv/
```

**B. Manual Clear (User side):**
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear browser cache
- Or test in incognito mode

---

## Verification

### Test the Fix
1. Open: https://tv.bakeandgrill.mv
2. Click "Pair Display Now" button
3. Should navigate to: https://tv.bakeandgrill.mv/pair (no `#`)
4. Should see the Display Pairing page

### If Still Not Working
Check browser console (F12) for errors and look for:
```
Loading: https://tv.bakeandgrill.mv/pair
```

NOT:
```
Loading: https://tv.bakeandgrill.mv/#/pair
```

---

## What Was Fixed

### Before (Broken)
```jsx
<a href="/#/pair">Pair Display Now</a>
```
- Uses HashRouter format
- Causes full page reload
- Doesn't work with BrowserRouter

### After (Fixed)
```jsx
<Link to="/pair">Pair Display Now</Link>
```
- Uses BrowserRouter format
- Client-side navigation
- Works smoothly

---

## Commits Applied
- `ab882f3` - Fix: Display pairing link on login page
- `173c6aa` - Fix: Display pairing link now uses React Router Link

---

## If Problems Persist

### Issue: 403 Error on `/pair`
**Solution:** Check `.htaccess` or `index.php` routes public paths correctly

### Issue: Still shows `/#/pair`
**Solution:** Hard refresh or clear service worker:
```javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
});
location.reload(true);
```

### Issue: Page loads but blank
**Solution:** Check server logs for errors:
```bash
tail -50 ~/tv-server.log
```

---

**Last Updated:** November 21, 2025

