# 🔧 Server Troubleshooting - 503 Error

## 🚨 Current Issue

**Error:** 503 Service Unavailable
**Cause:** Backend server is not responding properly

---

## ✅ Step-by-Step Fix

### Step 1: Check Server Logs

```bash
tail -100 ~/tv-server.log
```

**Look for:**
- ❌ Any error messages (red text)
- ❌ "Error:" or "Failed:" messages
- ✅ "✅ Server started successfully!" message
- ✅ "✅ Database initialization complete!" message

---

### Step 2: Check if Server Process is Running

```bash
ps aux | grep "[n]ode.*server.js"
```

**Expected output:**
```
bakeandgrill  12345  0.5  2.0  ... node server.js
```

**If NO output:** Server is not running → Go to Step 3

**If output shows:** Server is running but not responding → Go to Step 4

---

### Step 3: Start the Server Manually

```bash
# Kill any stuck processes
pkill -f "node.*server.js"

# Wait 2 seconds
sleep 2

# Start fresh
cd ~/tv.bakeandgrill.mv/server
nohup node server.js > ~/tv-server.log 2>&1 &

# Wait 5 seconds for startup
sleep 5

# Check logs
tail -30 ~/tv-server.log
```

**What to look for in logs:**
- ✅ "🚀 Starting Bake & Grill TV Server..."
- ✅ "✅ Connected to MySQL"
- ✅ "✅ Migration applied: 2025-01-21-add-composite-indexes.sql"
- ✅ "✅ Server started successfully!"
- ✅ "🌐 Server running on: http://localhost:4000"

---

### Step 4: Test Health Endpoint Locally

```bash
curl http://localhost:4000/api/health
```

**Expected output:**
```json
{"status":"ok","timestamp":"...","database":"connected","stats":{...}}
```

**If this works:** Server is fine, it's a reverse proxy issue → Go to Step 5

**If this fails:** Server has a problem → Check Step 6

---

### Step 5: Check Reverse Proxy (Apache/Nginx)

```bash
# If using Apache
sudo systemctl status httpd
sudo systemctl restart httpd

# If using Nginx
sudo systemctl status nginx
sudo systemctl restart nginx

# Check Apache error logs
sudo tail -50 /var/log/httpd/error_log

# Check Nginx error logs
sudo tail -50 /var/log/nginx/error.log
```

---

### Step 6: Common Issues & Fixes

#### Issue A: Database Connection Failed

**Symptom:** Logs show "Failed to connect to database" or similar

**Fix:**
```bash
# Test database connection
mysql -u bakeandgrill -p bakeandgrill_tv -e "SELECT 1;"

# If this fails, check credentials in .env
cd ~/tv.bakeandgrill.mv/server
cat .env | grep DB_
```

#### Issue B: Port 4000 Already in Use

**Symptom:** Logs show "EADDRINUSE" or "Port 4000 already in use"

**Fix:**
```bash
# Find what's using port 4000
lsof -ti:4000

# Kill it
lsof -ti:4000 | xargs kill -9

# Restart server
~/restart-tv-server.sh
```

#### Issue C: Migration Failed

**Symptom:** Logs show migration error

**Fix:**
```bash
# Apply migration manually
mysql -u bakeandgrill -p bakeandgrill_tv < ~/tv.bakeandgrill.mv/server/database/migrations/2025-01-21-add-composite-indexes.sql

# Restart server
~/restart-tv-server.sh
```

#### Issue D: Node.js Error

**Symptom:** Logs show JavaScript errors

**Fix:**
```bash
# Reinstall dependencies
cd ~/tv.bakeandgrill.mv/server
npm install

# Restart server
~/restart-tv-server.sh
```

---

### Step 7: Nuclear Option - Complete Restart

If nothing else works:

```bash
# 1. Kill everything
pkill -f "node.*server.js"
sleep 2

# 2. Clean restart
cd ~/tv.bakeandgrill.mv
git status  # Make sure we're on latest code
git pull origin main  # Just in case

# 3. Install dependencies
cd server
npm install

# 4. Test database
mysql -u bakeandgrill -p bakeandgrill_tv -e "SELECT COUNT(*) FROM users;"

# 5. Start server in foreground first (to see errors)
NODE_ENV=production node server.js

# If you see errors, Ctrl+C and fix them
# If it starts successfully, Ctrl+C and run in background:

nohup node server.js > ~/tv-server.log 2>&1 &

# 6. Test
sleep 5
curl http://localhost:4000/api/health
```

---

## 🔍 Most Likely Causes (in order)

1. **Server didn't start** (check logs)
2. **Database connection issue** (wrong credentials or DB down)
3. **Port already in use** (another process using 4000)
4. **Reverse proxy not forwarding** (Apache/Nginx config)
5. **New migration failed** (syntax error in SQL)
6. **Node.js dependency issue** (missing package)

---

## 📞 Quick Diagnostic

Run this all-in-one diagnostic:

```bash
echo "=== SERVER PROCESS ==="
ps aux | grep "[n]ode.*server.js" | head -1

echo -e "\n=== LAST 30 LOG LINES ==="
tail -30 ~/tv-server.log

echo -e "\n=== PORT 4000 STATUS ==="
lsof -ti:4000 || echo "Port 4000 is free"

echo -e "\n=== HEALTH CHECK ==="
curl -s http://localhost:4000/api/health || echo "Health check failed"

echo -e "\n=== DATABASE CONNECTION ==="
mysql -u bakeandgrill -p bakeandgrill_tv -e "SELECT 1 as test;" 2>&1 | grep -E "(test|ERROR)"

echo -e "\n=== DISK SPACE ==="
df -h | grep -E "(Filesystem|/$|/home)"

echo -e "\n=== MEMORY ==="
free -h
```

---

## 🎯 What to Send Me

If you need help, run the diagnostic above and send me:

1. The output of the diagnostic
2. The last 50 lines of `~/tv-server.log`
3. Any error messages you see

---

## ✅ Once Fixed

After the server is running properly:

```bash
# Test locally
curl http://localhost:4000/api/health

# Test from outside
curl https://tv.bakeandgrill.mv/api/health

# Both should return JSON with "status":"ok"
```

Then test login on mobile: **https://tv.bakeandgrill.mv**

---

**Most common fix:** Server didn't start properly. Run the diagnostic and check logs! 🔍

