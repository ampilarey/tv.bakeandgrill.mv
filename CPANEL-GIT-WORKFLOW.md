# 🔄 cPanel Git Workflow Guide
**How to Update Your Deployed Application**

---

## 📍 Your Setup

**Local Development:** `/Users/vigani/Website/tv/`  
**GitHub Repository:** https://github.com/ampilarey/tv  
**Production Server:** tv.bakeandgrill.mv  
**Server Path:** `/home/bakeandgrill/tv.bakeandgrill.mv/`  
**SSH Key:** `~/.ssh/id_ed25519` (on cPanel server)

---

## 🔧 Making Changes & Deploying

### **LOCAL → GITHUB → CPANEL Workflow**

```
Local Computer → GitHub → Production Server
(Development)   (Git Repo)  (tv.bakeandgrill.mv)
```

---

## 📝 Complete Update Workflow

### **Step 1: Make Changes Locally**

**On your computer:**

```bash
cd /Users/vigani/Website/tv

# Make your changes (edit files, add features, etc.)

# Test locally
cd server
npm run dev

# In another terminal:
cd client
npm run dev

# Visit http://localhost:5173 and test changes
```

---

### **Step 2: Build Frontend (If Frontend Changed)**

**Only needed if you changed files in `client/src/`:**

```bash
cd /Users/vigani/Website/tv/client
npm run build

# This updates client/dist/
```

---

### **Step 3: Commit to Git**

```bash
cd /Users/vigani/Website/tv

# Check what changed
git status

# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: Add schedule management UI

- Created schedule page component
- Added time picker for start/end times
- Integrated with schedules API
- Added validation for overlapping schedules"

# Push to GitHub
git push origin main
```

---

### **Step 4: Pull on cPanel Server**

**In cPanel Terminal:**

```bash
# Navigate to deployment directory
cd ~/tv.bakeandgrill.mv/

# Pull latest changes from GitHub
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519" git pull origin main

# You should see:
# Updating abc123..def456
# Fast-forward
# [list of changed files]
```

---

### **Step 5: Update Dependencies (If package.json Changed)**

**If you added new npm packages:**

```bash
# Backend dependencies
cd ~/tv.bakeandgrill.mv/server
source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
npm install
```

**If you added frontend packages:**
```bash
# You already built locally, just pull the dist/
# No need to npm install on server (memory issues)
```

---

### **Step 6: Restart Application**

**Method A: Via cPanel (Recommended)**

1. Go to **Setup Node.js App** in cPanel
2. Find `tv.bakeandgrill.mv` app
3. Click **"RESTART"** button
4. Wait 10-15 seconds
5. Check status shows "Running"

**Method B: Via Terminal (Faster)**

```bash
cd ~/tv.bakeandgrill.mv/server
touch tmp/restart.txt
```

This triggers Passenger to restart the app.

---

### **Step 7: Verify Changes**

**Visit in browser:**
```
https://tv.bakeandgrill.mv
```

**Test:**
- Your new feature works
- No errors in console (F12)
- API still responds: https://tv.bakeandgrill.mv/api/health

---

## 🚀 Quick Update Examples

### **Example 1: Fix a Bug**

```bash
# LOCAL
cd /Users/vigani/Website/tv
# Fix the bug in code
git add .
git commit -m "fix: Resolve channel filtering issue"
git push origin main

# CPANEL
cd ~/tv.bakeandgrill.mv/
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519" git pull origin main
touch server/tmp/restart.txt

# DONE! Bug fixed in production
```

---

### **Example 2: Add New Feature**

```bash
# LOCAL
cd /Users/vigani/Website/tv
# Build new feature
# Test locally
cd client && npm run build  # If frontend changed
cd ..
git add .
git commit -m "feat: Add analytics dashboard"
git push origin main

# CPANEL
cd ~/tv.bakeandgrill.mv/
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519" git pull origin main
touch server/tmp/restart.txt

# DONE! Feature live in production
```

---

### **Example 3: Update Database Schema**

```bash
# LOCAL
cd /Users/vigani/Website/tv
# Update server/database/schema.sql
git add .
git commit -m "feat: Add new table for user preferences"
git push origin main

# CPANEL
cd ~/tv.bakeandgrill.mv/
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519" git pull origin main

# Run database migration
cd server
source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
node database/init.js  # Re-runs schema (safe, uses IF NOT EXISTS)

# Restart app
touch tmp/restart.txt

# DONE! Database updated
```

---

### **Example 4: Emergency Hotfix**

```bash
# LOCAL (Super fast)
cd /Users/vigani/Website/tv
# Fix critical bug
git add .
git commit -m "hotfix: Fix authentication bypass vulnerability"
git push origin main

# CPANEL (Immediate deploy)
cd ~/tv.bakeandgrill.mv/
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519" git pull origin main
touch server/tmp/restart.txt

# DONE! Hotfix deployed in < 2 minutes
```

---

## 🔐 Important Git Commands for cPanel

### **Pull Changes**
```bash
cd ~/tv.bakeandgrill.mv/
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519" git pull origin main
```

### **Check Current Version**
```bash
cd ~/tv.bakeandgrill.mv/
git log --oneline -5
git show HEAD
```

### **View What Changed**
```bash
git diff HEAD~1 HEAD
git log -p -1
```

### **Rollback to Previous Version** (Emergency)
```bash
cd ~/tv.bakeandgrill.mv/
git log --oneline -10  # Find commit to rollback to
git reset --hard abc123  # Replace abc123 with commit hash
touch server/tmp/restart.txt
```

### **Discard Local Changes** (If you accidentally edited on server)
```bash
cd ~/tv.bakeandgrill.mv/
git reset --hard HEAD
git pull origin main
```

---

## 📊 Deployment Checklist

**Before Every Deployment:**

```bash
Local:
[ ] Code changes tested locally
[ ] Frontend built (if changed): npm run build
[ ] Changes committed: git commit
[ ] Pushed to GitHub: git push origin main

cPanel:
[ ] SSH into server
[ ] Navigate to app directory
[ ] Pull latest: git pull origin main
[ ] Install dependencies (if package.json changed)
[ ] Restart app: touch server/tmp/restart.txt
[ ] Test in browser
[ ] Check for errors
[ ] Monitor logs for 5 minutes
```

---

## ⚡ Quick Commands Reference

### **Update Production (Full Process)**
```bash
# LOCAL
cd /Users/vigani/Website/tv
# [make changes, test]
cd client && npm run build  # If frontend changed
cd ..
git add .
git commit -m "Description of changes"
git push origin main

# CPANEL
cd ~/tv.bakeandgrill.mv/
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519" git pull origin main
cd server && source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
npm install  # Only if package.json changed
touch tmp/restart.txt
deactivate
```

---

### **Quick Restart (No Code Changes)**
```bash
# If app crashed and just needs restart
cd ~/tv.bakeandgrill.mv/server
touch tmp/restart.txt
```

---

### **View Server Logs**
```bash
# In cPanel - Setup Node.js App
# Click "View Logs" or "Actions" → "Show Log"

# Or check passenger logs
tail -f ~/logs/passenger.log  # If exists
```

---

### **Check If App is Running**
```bash
ps aux | grep server.js
curl http://localhost:4000/api/health
```

---

## 🔄 Git Pull Command Explained

### **Why This Command?**
```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519" git pull origin main
```

**Breakdown:**
- `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519"` - Use specific SSH key
- `git pull` - Fetch and merge changes
- `origin` - Remote repository (GitHub)
- `main` - Branch name

### **Alternative (Set SSH Config Permanently)**

**Create ~/.ssh/config:**
```bash
cat > ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config
```

**Then you can use simple commands:**
```bash
git pull origin main  # No need for GIT_SSH_COMMAND anymore!
```

---

## 📦 When to Build Locally vs Server

### **Always Build Locally:**
- ✅ Frontend (client/dist/) - Server has memory limits
- ✅ Large assets
- ✅ Complex builds

### **Can Build on Server:**
- ✅ Backend changes (just npm install)
- ✅ Small updates
- ✅ Configuration changes

---

## 🎯 Production Update Best Practices

1. **Test locally first** - Always test before deploying
2. **Commit often** - Small, frequent commits
3. **Descriptive messages** - Explain what changed and why
4. **Build before push** - Include dist/ in commits (for cPanel)
5. **Pull before edit** - Always git pull before making changes
6. **Restart after deploy** - touch tmp/restart.txt
7. **Monitor logs** - Check for errors after deployment
8. **Backup database** - Before major updates

---

## 🆘 Emergency Procedures

### **Site is Down**

```bash
# 1. Check if process is running
ps aux | grep server.js

# 2. Test locally
curl http://localhost:4000/api/health

# 3. If not running, restart
cd ~/tv.bakeandgrill.mv/server
source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
NODE_OPTIONS="--no-experimental-fetch" node server.js

# 4. Check logs for errors
# 5. Restart via cPanel if manual start works
```

### **Broken Deployment (Rollback)**

```bash
# Rollback to last working version
cd ~/tv.bakeandgrill.mv/
git log --oneline -10  # Find last good commit
git reset --hard abc123  # Use commit hash
touch server/tmp/restart.txt

# Test
curl http://localhost:4000/api/health
```

### **Database Issues**

```bash
# Check database connection
mysql -u bakeandgrill_tv -p bakeandgrill_tv

# Re-initialize if needed
cd ~/tv.bakeandgrill.mv/server
source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
node database/init.js
```

---

## ✅ Summary

**Deployment Workflow:**
1. Develop locally
2. Build frontend
3. Commit & push to GitHub
4. Pull on cPanel server
5. Restart app
6. Test in production

**Key Command:**
```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519" git pull origin main
```

**Quick Restart:**
```bash
touch ~/tv.bakeandgrill.mv/server/tmp/restart.txt
```

---

**You're all set! Once DNS propagates, your system is live!** 🎉

**Documentation:** See GIT-GUIDE.md for more Git commands and workflows.

