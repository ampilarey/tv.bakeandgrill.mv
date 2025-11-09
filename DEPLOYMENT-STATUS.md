# 🚀 Deployment Status
**Bake & Grill TV - tv.bakeandgrill.mv**

**Date:** November 10, 2025  
**Status:** ✅ **DEPLOYED - Waiting for DNS Propagation**

---

## ✅ Completed Steps

### 1. Local Preparation ✅
- [x] Generated JWT_SECRET
- [x] Built frontend (client/dist/)
- [x] Code committed to GitHub
- [x] Deploy key configured

### 2. cPanel Database Setup ✅
- [x] Created MySQL database: `bakeandgrill_tv`
- [x] Created database user: `bakeandgrill_tv`
- [x] Granted all privileges
- [x] Credentials documented

### 3. File Deployment ✅
- [x] Cloned repository to: `/home/bakeandgrill/tv.bakeandgrill.mv/`
- [x] Server files in place
- [x] Client files in place (dist/)
- [x] All documentation uploaded

### 4. Node.js Configuration ✅
- [x] Node.js app created (v18.20.8)
- [x] Application root set: `/home/bakeandgrill/tv.bakeandgrill.mv/server`
- [x] Startup file: `server.js`
- [x] All 11 environment variables added
- [x] NODE_OPTIONS fix applied (--no-experimental-fetch)

### 5. Dependencies & Database ✅
- [x] npm install completed (181 packages)
- [x] Database initialized successfully
- [x] Default admin created
- [x] Tables created (users, playlists, displays, etc.)

### 6. Server Testing ✅
- [x] Server starts without errors
- [x] MySQL connection successful
- [x] API responds correctly: `{"status":"ok","version":"1.0.0","stats":{"users":1,"playlists":0}}`
- [x] .htaccess configured for Passenger
- [x] tmp/restart.txt created

---

## ⏳ Pending: DNS Propagation

### Current Status
```
DNS Check: tv.bakeandgrill.mv
Result: NXDOMAIN (domain not found)
Issue: DNS record doesn't exist yet
```

### Required Action
**Contact hosting provider to add:**

**Option 1: Specific Subdomain**
```
Type: A Record
Name: tv
Value: [IP address of bakeandgrill.mv]
TTL: 3600
```

**Option 2: Wildcard (Recommended)**
```
Type: A Record
Name: *
Value: [IP address of bakeandgrill.mv]
TTL: 3600
```

### DNS Propagation Timeline
- **Minimum:** 1-2 hours
- **Typical:** 4-6 hours
- **Maximum:** 24-48 hours

---

## 🧪 Test Results

### Local Server Tests (✅ All Passing)
```bash
curl http://localhost:4000/api/health
✅ {"status":"ok","version":"1.0.0"}

Server logs show:
✅ Server started successfully
✅ Connected to MySQL
✅ Database initialization complete
✅ Serving static frontend from: .../client/dist
```

### Public Access (⏳ Waiting for DNS)
```
http://tv.bakeandgrill.mv - DNS not found
https://tv.bakeandgrill.mv - DNS not found
```

---

## 📋 Deployment Credentials

### Database
```
Host: localhost
Port: 3306
Database: bakeandgrill_tv
Username: bakeandgrill_tv
Password: Assampvig1@
```

### Admin Login (After DNS works)
```
URL: https://tv.bakeandgrill.mv
Email: admin@bakeandgrill.mv
Password: BakeGrill2025!
⚠️ CHANGE PASSWORD AFTER FIRST LOGIN!
```

### JWT Secret
```
e50fbf6dbb20fa5e03d7a69aa28e4651060b9f0eff4ccdae26031cd550628481c73f3cf01c3a09811108b0f2da5acdc17276bccbcd8d13d9fb48ac06bedd6501
```

---

## 🎯 Post-DNS Tasks

### Immediate (After DNS Propagates)
1. [ ] Visit https://tv.bakeandgrill.mv
2. [ ] Login with admin credentials
3. [ ] Change admin password
4. [ ] Add M3U playlist URL
5. [ ] Test video playback

### Within First Hour
6. [ ] Create display token for cafe TV
7. [ ] Test display mode on iPad/device
8. [ ] Test remote control
9. [ ] Verify SSL certificate is working
10. [ ] Test from mobile device

### Within First Day
11. [ ] Setup database backups (cron job)
12. [ ] Monitor application logs
13. [ ] Test all features thoroughly
14. [ ] Train staff on system usage

---

## 📊 Application Info

**Deployed Location:** `/home/bakeandgrill/tv.bakeandgrill.mv/`  
**Git Repository:** https://github.com/ampilarey/tv  
**Node.js Version:** 18.20.8  
**Database:** MySQL (bakeandgrill_tv)  
**Environment:** Production

**File Structure:**
```
/home/bakeandgrill/tv.bakeandgrill.mv/
├── server/           # Backend (Node.js + Express)
│   ├── server.js    # Main entry point
│   ├── database/    # Schema & init
│   ├── routes/      # API endpoints
│   ├── middleware/  # Auth & validation
│   └── utils/       # M3U parser
├── client/          # Frontend source
│   └── dist/        # Built production files
├── docs/            # Documentation
├── .htaccess        # Passenger configuration
└── README.md        # Main documentation
```

---

## 🔧 Troubleshooting (If Needed After DNS)

### If Site Shows 500 Error
```bash
cd ~/tv.bakeandgrill.mv/server
touch tmp/restart.txt
# Check logs in cPanel
```

### If App Won't Start
```bash
cd ~/tv.bakeandgrill.mv/server
source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
NODE_OPTIONS="--no-experimental-fetch" node server.js
# Check error messages
```

### If Database Connection Fails
```bash
mysql -u bakeandgrill_tv -p bakeandgrill_tv
# Verify database exists and user has access
```

---

## 📞 Support Contacts

**Hosting Provider:** [Your hosting provider]  
**Domain:** bakeandgrill.mv  
**Server:** sg-s2  
**cPanel User:** bakeandgrill

---

## ✅ Deployment Checklist

```
Pre-Deployment:
[x] Code on GitHub
[x] JWT_SECRET generated
[x] Frontend built locally
[x] Database credentials ready

cPanel Setup:
[x] MySQL database created
[x] Database user created with privileges
[x] Files cloned via Git
[x] Node.js app configured
[x] Environment variables added (11 total)
[x] Dependencies installed (npm install)
[x] Database initialized
[x] .htaccess created
[x] Application tested (curl localhost:4000)

DNS Configuration:
[ ] ⏳ Contact hosting provider
[ ] ⏳ Add DNS A record for tv.bakeandgrill.mv
[ ] ⏳ Wait for propagation (1-24 hours)
[ ] ⏳ Verify DNS with: ping tv.bakeandgrill.mv

Post-DNS:
[ ] Visit https://tv.bakeandgrill.mv
[ ] Login and change admin password
[ ] Add M3U playlist
[ ] Setup cafe displays
[ ] Test remote control
[ ] Monitor for 24 hours
```

---

## 🎉 Status: Deployment Successful!

**Your IPTV platform is deployed and working!**

The application is:
- ✅ Deployed to server
- ✅ Running correctly
- ✅ Database connected
- ✅ API functional
- ⏳ Waiting for DNS propagation

**Once DNS is added by your hosting provider, the site will be live at:**
- 🌐 **https://tv.bakeandgrill.mv**

**Estimated time to go live:** 1-24 hours (after host adds DNS)

---

**Next Action:** Contact your hosting provider to add the DNS record!

**Deployed by:** [Your Name]  
**Deployment Date:** November 10, 2025, 06:30 UTC

