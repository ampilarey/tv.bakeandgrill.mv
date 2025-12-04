# ✅ DEPLOYMENT CHECKLIST - Crash Fix

Run these commands in order on the server:

---

## 1. Verify Code is Updated

```bash
cd ~/tv.bakeandgrill.mv/server
grep "Public routes (BEFORE rate limiter)" server.js
```

**Expected:** Should show the comment  
**If not:** Run `cd ~/tv.bakeandgrill.mv && git pull origin main`

---

## 2. Restart App via cPanel

**Cannot be done via terminal!**

### Via cPanel Interface:
1. Login to cPanel
2. Setup Node.js App
3. Find: tv.bakeandgrill.mv
4. Click: STOP
5. Wait: 10 seconds
6. Click: START
7. Wait: 10 seconds

### Alternative - Kill Process:
```bash
# Find process ID
ps aux | grep "server.js" | grep -v grep

# Kill it (replace PID with actual process ID)
kill -9 PID

# Then restart via cPanel interface
```

---

## 3. Verify Server Restarted

```bash
curl https://tv.bakeandgrill.mv/api/health
```

Should show version 1.0.8 (not 1.0.0).

---

## 4. Test Feature Flags Endpoint

```bash
curl https://tv.bakeandgrill.mv/api/features
```

**Success:** Returns `{"success":true,"flags":{...}}`  
**Failure:** Returns `{"success":false,"error":"No token provided"}`

If failure → Server still running old code → Repeat restart.

---

## 5. Test in Browser

1. Visit: https://tv.bakeandgrill.mv
2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Login
4. Navigate to dashboard
5. Should work without crashes

---

## 6. Update PWA on Mobile

**Users need to:**
- Close PWA completely
- Clear browser data for tv.bakeandgrill.mv
- Reinstall PWA from browser

---

## 🚨 IF STILL AUTH ERROR AFTER RESTART

The server might be cached or using old code.

### Check server version:
```bash
cd ~/tv.bakeandgrill.mv
git log --oneline -1
```

Should show: `155ac0c docs: Add comprehensive README for crash fix`

If different → Git pull didn't work → Try again.

### Force complete restart:
1. cPanel → Stop app
2. Wait 30 seconds
3. cPanel → Start app
4. Wait 30 seconds
5. Test again

---

## ✅ SUCCESS CRITERIA

After all steps:
- [ ] `curl /api/features` returns flags (NO auth error)
- [ ] `curl /api/health` shows version 1.0.8
- [ ] Browser loads without crashes
- [ ] Login works
- [ ] Dashboard loads
- [ ] Mobile PWA works

If ALL checked → PROBLEM SOLVED! 🎉

---

**Most important:** RESTART VIA CPANEL INTERFACE, not via terminal!
