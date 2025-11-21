# 📱 Mobile Testing Guide

## 🖥️ Local Development Server

### Backend (API)
- **URL:** `http://localhost:4000`
- **Status:** Running in background
- **Environment:** Development

### Frontend (UI)
- **URL:** `http://localhost:5173`
- **Status:** Running in background
- **Hot Reload:** Enabled

---

## 🌐 Production Server

### Live Production
- **URL:** `https://tv.bakeandgrill.mv`
- **Status:** Check with: `curl https://tv.bakeandgrill.mv/api/health`
- **Environment:** Production

---

## 📱 Testing on Mobile Device

### Option 1: Test Local Server on Mobile (Same WiFi)

**Your local IP address will be shown in the terminal output above.**

1. **Make sure your phone and computer are on the SAME WiFi network**

2. **Access local server from your phone:**
   - Replace `localhost` with your local IP (e.g., `192.168.1.100`)
   - Frontend: `http://[YOUR_LOCAL_IP]:5173`
   - Backend API: `http://[YOUR_LOCAL_IP]:4000`

3. **Update Vite config for mobile access:**
   The dev server should already be configured to accept connections from your network.

### Option 2: Test Production Server

Simply open `https://tv.bakeandgrill.mv` on your mobile browser.

---

## ✅ What to Test on Mobile

### 1. Display Management Page
- [ ] Open remote control modal
- [ ] Check that **NO browser alert/confirm dialogs** appear
- [ ] Verify confirmation modals are non-blocking (can scroll behind them)
- [ ] Test channel search (channels appear when typing)
- [ ] Test channel selection (atomic, no extra button needed)
- [ ] Verify text is readable (no white on light backgrounds)

### 2. User Management Page (Admin)
- [ ] Try to delete an inactive user
- [ ] Verify confirmation modal appears (not alert)
- [ ] Check reactivate/permanent delete options
- [ ] All text should be readable

### 3. Dashboard (Playlist Management)
- [ ] Delete a playlist
- [ ] Verify confirmation modal (not browser alert)
- [ ] Check mobile responsiveness

### 4. Permission Manager
- [ ] Update user permissions
- [ ] Verify inline success/error messages (not alerts)
- [ ] Check reset permissions confirmation

### 5. General UX
- [ ] Loading skeletons appear while fetching data
- [ ] Empty states show when no displays/playlists
- [ ] Footer is visible and correctly positioned
- [ ] Bottom navigation works properly
- [ ] All buttons are tappable and sized correctly

### 6. Battery/Performance
- [ ] Open DisplayManagement page
- [ ] Switch to another tab/app
- [ ] Switch back - polling should resume
- [ ] Check browser dev tools: Network requests should pause when tab is hidden

---

## 🔍 How to Check Implementation

### Browser Developer Tools (on Desktop)

**Before testing on mobile, verify on desktop:**

1. **Open browser DevTools (F12)**

2. **Check Response Compression:**
   - Go to Network tab
   - Refresh page
   - Look for `Content-Encoding: gzip` in Response Headers
   - Response size should be much smaller

3. **Check CSP Headers:**
   - Look for `Content-Security-Policy` in Response Headers

4. **Check M3U Caching:**
   - Go to Channels page
   - First load: See API call to `/api/channels`
   - Refresh within 5 minutes: Should be instant (cached)

5. **Check Visibility Detection:**
   - Open DisplayManagement page
   - Open DevTools Network tab
   - See heartbeat requests every 5 seconds
   - Switch to another tab
   - Switch back: Requests should have paused and resumed

### Mobile Browser DevTools

**For Android Chrome:**
1. Enable USB debugging on your phone
2. Connect phone to computer
3. Open `chrome://inspect` on desktop Chrome
4. Inspect your mobile browser
5. Check Network tab and Console

**For iOS Safari:**
1. Enable Web Inspector on iPhone (Settings > Safari > Advanced)
2. Connect iPhone to Mac
3. Open Safari on Mac > Develop > [Your iPhone]
4. Inspect the page

---

## 🐛 Common Issues

### Can't Access Local Server from Mobile

**Problem:** `ERR_CONNECTION_REFUSED` or can't load page

**Solutions:**
1. Verify both devices are on the **same WiFi network**
2. Check firewall settings (may need to allow port 5173 and 4000)
3. Try accessing `http://[YOUR_IP]:5173` directly
4. On Mac, System Preferences > Security & Privacy > Firewall > Allow incoming connections

### Vite Config for Network Access

If local server doesn't accept network connections, update `client/vite.config.js`:

```js
export default defineConfig({
  server: {
    host: '0.0.0.0', // Allow external access
    port: 5173
  }
})
```

### API CORS Issues

If you get CORS errors when accessing from mobile, verify `server/server.js`:

```js
app.use(cors({
  origin: '*', // For development only
  credentials: true
}));
```

---

## 📊 What You Should See

### Before This Update
- ❌ Browser alert/confirm dialogs (blocking)
- ❌ Remote modal closes after alert
- ❌ White text on light backgrounds
- ❌ No loading states
- ❌ Empty lists show nothing
- ❌ Polling runs even when tab hidden
- ⚠️ Large uncompressed responses

### After This Update
- ✅ Custom confirmation modals (non-blocking)
- ✅ Remote stays open after actions
- ✅ All text is readable with good contrast
- ✅ Loading skeletons during data fetch
- ✅ Empty states with helpful messages
- ✅ Polling pauses when tab hidden (battery saving)
- ✅ Compressed responses (60-80% smaller)

---

## 🎯 Priority Test Items

### Critical (Must Test)
1. **Confirmation modals work** (no browser alerts)
2. **Mobile text is readable** (contrast fixed)
3. **Remote control works smoothly** (no closing after actions)
4. **Display status updates** (online/offline colors correct)
5. **Footer visible on mobile** (not hidden under tabs)

### Important (Should Test)
6. **Loading skeletons appear** (better UX)
7. **Empty states show** (when no data)
8. **Visibility detection works** (battery saving)
9. **Channel search works** (appears when typing)
10. **User deletion workflow** (clear options)

### Nice to Have (Optional)
11. **Response compression** (check DevTools)
12. **M3U caching** (faster channel load)
13. **Rate limiting** (hard to test, works automatically)

---

## 🛑 Stop Servers

When done testing:

```bash
# Find and kill the processes
ps aux | grep "node server.js" | grep -v grep | awk '{print $2}' | xargs kill
ps aux | grep "vite" | grep -v grep | awk '{print $2}' | xargs kill
```

---

## 📞 Need Help?

If something doesn't work:
1. Check browser console for errors (F12)
2. Check server logs: `tail -f /Users/vigani/Website/tv/server/logs.txt`
3. Verify servers are running: `ps aux | grep node`
4. Test production instead: `https://tv.bakeandgrill.mv`

---

**Happy Testing! 🚀**

