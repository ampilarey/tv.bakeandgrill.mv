# 🚀 Server Management Guide

## Production Server Setup

### Current Configuration

**Server Details:**
- **Host:** cPanel (MariaDB 10.6.23)
- **Node.js:** Version 18
- **Database:** MySQL/MariaDB
- **Port:** 4000 (backend)
- **Frontend:** Served from `client/dist`
- **Domain:** https://tv.bakeandgrill.mv

---

## 🔧 Server Management

### Check Server Status

```bash
ps aux | grep "[n]ode.*server.js"
```

**Expected output if running:**
```
bakeandgrill  1234567  0.0  0.1  node server.js
```

**If no output:** Server is not running

---

### Start Server

**Quick Start:**
```bash
cd ~/tv.bakeandgrill.mv/server && nohup node server.js > ~/tv-server.log 2>&1 &
```

**Using Restart Script (Recommended):**
```bash
~/restart-tv-server.sh
```

**Expected Output:**
```
🔄 Restarting TV Server...
✅ Server started
📋 Logs: tail -f ~/tv-server.log
```

---

### Stop Server

```bash
kill $(ps aux | grep "[n]ode.*server.js" | awk '{print $2}') 2>/dev/null
```

---

### View Server Logs

**Live logs (real-time):**
```bash
tail -f ~/tv-server.log
```

**Last 50 lines:**
```bash
tail -n 50 ~/tv-server.log
```

**Search for errors:**
```bash
grep -i "error" ~/tv-server.log | tail -n 20
```

---

## 📜 Restart Script

The restart script is located at: `~/restart-tv-server.sh`

**Script Contents:**
```bash
#!/bin/bash
echo "🔄 Restarting TV Server..."
cd ~/tv.bakeandgrill.mv
kill $(ps aux | grep "[n]ode.*server.js" | awk '{print $2}') 2>/dev/null
sleep 2
cd server
nohup node server.js > ~/tv-server.log 2>&1 &
echo "✅ Server started"
echo "📋 Logs: tail -f ~/tv-server.log"
```

**Usage:**
```bash
~/restart-tv-server.sh
```

---

## 🔄 Deployment Workflow

### After Making Code Changes:

**Complete Deployment (Frontend + Backend):**
```bash
cd ~/tv.bakeandgrill.mv && git pull origin main && ~/restart-tv-server.sh
```

**If Frontend Changes Only:**
```bash
cd ~/tv.bakeandgrill.mv && git pull origin main
# No server restart needed - static files updated
```

**If Backend Changes:**
```bash
cd ~/tv.bakeandgrill.mv && git pull origin main && ~/restart-tv-server.sh
```

**If Database Migration Required:**
```bash
cd ~/tv.bakeandgrill.mv && git pull origin main && ~/restart-tv-server.sh
# Migrations run automatically on server start
```

---

## 🗄️ Database Management

### Check Database Permissions

```bash
node ~/tv.bakeandgrill.mv/server/database/check-permissions.js
```

### Fix Display Pairing Constraints (if needed)

```bash
node ~/tv.bakeandgrill.mv/server/database/fix-mariadb-constraint.js
```

### Run All Fixes

```bash
node ~/tv.bakeandgrill.mv/server/database/fix-production-displays.js
```

---

## 🐛 Troubleshooting

### Server Won't Start

**1. Check if port 4000 is in use:**
```bash
lsof -i :4000
```

**2. Kill any processes on port 4000:**
```bash
kill $(lsof -t -i:4000) 2>/dev/null
```

**3. Check .env file exists:**
```bash
ls -la ~/tv.bakeandgrill.mv/server/.env
```

**4. Verify database connection:**
```bash
cat ~/tv.bakeandgrill.mv/server/.env | grep DB_
```

### Login Not Working

**1. Check server is running:**
```bash
ps aux | grep "[n]ode.*server.js"
```

**2. Check server logs for errors:**
```bash
tail -n 50 ~/tv-server.log | grep -i error
```

**3. Restart server:**
```bash
~/restart-tv-server.sh
```

**4. Clear browser cache:**
- Mobile: Settings → Clear browsing data
- Desktop: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)

### Permissions Not Showing

**1. Check user permissions in database:**
```bash
node ~/tv.bakeandgrill.mv/server/database/check-permissions.js
```

**2. User must refresh browser after permissions change:**
- Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- Or: Log out and log back in

### Display Pairing Fails

**1. Check constraint errors:**
```bash
tail -f ~/tv-server.log
# Try pairing, watch for "CHECK constraint" errors
```

**2. Fix constraints:**
```bash
node ~/tv.bakeandgrill.mv/server/database/fix-mariadb-constraint.js
```

---

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:4000/api/health
```

**Expected:**
```json
{"status":"ok","timestamp":"..."}
```

### Check Active Connections

```bash
netstat -an | grep :4000
```

### Memory Usage

```bash
ps aux | grep server.js | grep -v grep | awk '{print $4 "% - " $6/1024 "MB"}'
```

---

## 🔐 Environment Variables

**Location:** `~/tv.bakeandgrill.mv/server/.env`

**Required Variables:**
```env
PORT=4000
NODE_ENV=production
JWT_SECRET=your-64-char-secret

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=bakeandgrill_tv
DB_PASSWORD=your-password
DB_NAME=bakeandgrill_tv

# Admin
DEFAULT_ADMIN_EMAIL=admin@bakeandgrill.mv
DEFAULT_ADMIN_PASSWORD=your-password
```

**View current settings (hide passwords):**
```bash
cat ~/tv.bakeandgrill.mv/server/.env | grep -v PASSWORD
```

---

## 🚨 Emergency Recovery

### Server Crashed - Quick Recovery

```bash
~/restart-tv-server.sh
```

### Full Reset

```bash
cd ~/tv.bakeandgrill.mv
git fetch origin
git reset --hard origin/main
~/restart-tv-server.sh
```

### Database Issues

```bash
# Run all database fixes
node ~/tv.bakeandgrill.mv/server/database/fix-production-displays.js
node ~/tv.bakeandgrill.mv/server/database/fix-mariadb-constraint.js
~/restart-tv-server.sh
```

---

## 📝 Maintenance Checklist

### Daily
- ✅ Check server is running: `ps aux | grep server.js`

### Weekly
- ✅ Check logs for errors: `grep -i error ~/tv-server.log | tail -n 20`
- ✅ Check disk space: `df -h`

### After Code Updates
- ✅ Pull latest code: `git pull origin main`
- ✅ Restart server: `~/restart-tv-server.sh`
- ✅ Check server started: `tail -n 20 ~/tv-server.log`
- ✅ Test login: Visit https://tv.bakeandgrill.mv

---

## 🎯 Quick Reference Commands

```bash
# Start server
~/restart-tv-server.sh

# Check status
ps aux | grep "[n]ode.*server.js"

# View logs
tail -f ~/tv-server.log

# Stop server
kill $(ps aux | grep "[n]ode.*server.js" | awk '{print $2}')

# Deploy updates
cd ~/tv.bakeandgrill.mv && git pull origin main && ~/restart-tv-server.sh

# Check permissions
node ~/tv.bakeandgrill.mv/server/database/check-permissions.js

# Health check
curl http://localhost:4000/api/health
```

---

## 🔔 Why Server Stops

Common reasons the server stops:

1. **Unhandled exceptions** - Check logs for errors
2. **SSH session ends** - **FIXED** with nohup
3. **Out of memory** - Check with `free -h`
4. **Server reboot** - Need to manually restart (or use PM2/cron)
5. **Database connection lost** - Auto-reconnects, check logs

---

## 💡 Production Best Practices

✅ **DO:**
- Use the restart script for easy management
- Check logs regularly
- Keep git repo up to date
- Test on local before deploying

❌ **DON'T:**
- Run server without nohup (will stop when SSH closes)
- Delete .env file (contains secrets)
- Force push to main branch
- Skip git pull before making changes

---

## 📞 Support

If you encounter issues:
1. Check logs: `tail -f ~/tv-server.log`
2. Check this guide for common issues
3. Restart server: `~/restart-tv-server.sh`
4. If still broken, check git history: `git log --oneline -n 10`

