# 📦 Git Repository Guide
**Bake & Grill TV - Version Control & Deployment**

---

## 📍 Repository Information

**GitHub Repository:** https://github.com/ampilarey/tv  
**Branch:** `main`  
**Clone URL:** `https://github.com/ampilarey/tv.git`  
**SSH URL:** `git@github.com:ampilarey/tv.git`

### Repository Stats
- **Total Files:** 75
- **Total Lines:** 28,052
- **Language:** JavaScript (React, Node.js)
- **License:** Proprietary
- **Status:** ✅ Production Ready

---

## 🔐 Protected Files (.gitignore)

### NEVER Committed to Git
```
✅ Protected by .gitignore:
- server/.env                    # Database passwords, JWT secrets
- node_modules/                  # Dependencies (installed via npm)
- client/dist/                   # Build output (generated)
- server/database/*.sqlite       # Local database files
- server/database/*.db           # Database files
- server/uploads/*               # User-uploaded files
- *.log                          # Log files
- .DS_Store                      # macOS files
```

### Why These Are Protected
- **Security:** Credentials and secrets must never be in git
- **Size:** node_modules can be 200+ MB
- **Generated:** dist/ is built from source
- **Privacy:** Uploads may contain user data

---

## 🚀 Getting Started with Git

### First Time Setup (Clone Repository)

```bash
# 1. Clone the repository
git clone https://github.com/ampilarey/tv.git
cd tv

# 2. Setup Backend
cd server
npm install

# 3. Create environment file from template
cp .env.example .env

# 4. Edit .env with your settings
nano .env
# Add:
# - JWT_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
# - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# - DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD

# 5. Initialize database
node database/init.js

# 6. Start backend server
npm run dev

# 7. Setup Frontend (new terminal)
cd ../client
npm install
npm run dev

# 8. Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:4000/api/health
```

---

## 📝 Git Workflow

### Daily Development Workflow

```bash
# 1. Start your day - Get latest changes
git pull origin main

# 2. Create a feature branch (optional but recommended)
git checkout -b feature/my-new-feature

# 3. Make your changes
# Edit files, add features, fix bugs...

# 4. Check what changed
git status
git diff

# 5. Stage your changes
git add .
# Or stage specific files:
git add server/routes/newroute.js
git add client/src/pages/NewPage.jsx

# 6. Commit with descriptive message
git commit -m "Add schedule management UI

- Created ScheduleManagement.jsx component
- Added API integration for schedules
- Implemented time picker for start/end times
- Added validation for schedule conflicts"

# 7. Push to GitHub
git push origin feature/my-new-feature
# Or if on main branch:
git push origin main

# 8. Merge feature branch (if using branches)
git checkout main
git merge feature/my-new-feature
git push origin main
git branch -d feature/my-new-feature
```

---

## 🌿 Branch Strategy

### Recommended Branches

```
main
├── develop (optional - for staging)
├── feature/schedule-ui
├── feature/analytics-dashboard
├── bugfix/volume-control-ios
└── hotfix/security-patch
```

### Branch Naming Convention

```bash
# Features
git checkout -b feature/schedule-management
git checkout -b feature/analytics-dashboard

# Bug fixes
git checkout -b bugfix/display-status-timing
git checkout -b bugfix/m3u-parsing-error

# Hotfixes (urgent production fixes)
git checkout -b hotfix/security-jwt-leak
git checkout -b hotfix/database-connection

# Improvements
git checkout -b improvement/optimize-queries
git checkout -b improvement/ui-polish
```

### Working with Branches

```bash
# Create and switch to new branch
git checkout -b feature/new-feature

# Switch between branches
git checkout main
git checkout develop

# List all branches
git branch -a

# Delete local branch
git branch -d feature/completed-feature

# Delete remote branch
git push origin --delete feature/completed-feature

# Merge branch into main
git checkout main
git merge feature/new-feature
git push origin main
```

---

## 📤 Common Git Commands

### Checking Status

```bash
# View current status
git status

# View commit history
git log
git log --oneline
git log --graph --oneline --all

# View changes
git diff                    # Unstaged changes
git diff --staged          # Staged changes
git diff main develop      # Compare branches
```

### Staging & Committing

```bash
# Stage all changes
git add .

# Stage specific files
git add server/routes/auth.js
git add client/src/App.jsx

# Stage by pattern
git add "*.js"
git add server/routes/*.js

# Unstage files
git reset HEAD file.js
git restore --staged file.js

# Commit
git commit -m "Brief description"
git commit -m "Title" -m "Longer description with details"

# Amend last commit (before pushing)
git commit --amend -m "Updated commit message"
```

### Pushing & Pulling

```bash
# Push to remote
git push origin main
git push origin feature/my-feature

# Push and set upstream
git push -u origin new-branch

# Pull latest changes
git pull origin main

# Fetch without merging
git fetch origin
```

### Undoing Changes

```bash
# Discard changes in working directory
git checkout -- file.js
git restore file.js

# Discard all local changes
git reset --hard HEAD

# Revert a commit (creates new commit)
git revert abc123

# Reset to specific commit (use carefully!)
git reset --hard abc123

# Stash changes temporarily
git stash
git stash pop
git stash list
```

---

## 🏷️ Commit Message Best Practices

### Good Commit Messages

```bash
✅ GOOD:
git commit -m "Fix display status not updating after 45 seconds

- Changed heartbeat check from 60s to 45s
- Updated status calculation in displays route
- Added debug logging for troubleshooting
- Fixes issue #23"

git commit -m "Add volume control to remote display management

- Implemented volume slider (0-100%)
- Added mute/unmute buttons
- Integrated with display command system
- Auto-hides notification after 3 seconds
- Note: Volume control doesn't work on iPhone (iOS limitation)"

git commit -m "Update dependencies to latest versions

- React 18.2.0 → 18.2.1
- mysql2 3.6.5 → 3.7.0
- Security patches applied
- No breaking changes"
```

### Poor Commit Messages

```bash
❌ BAD:
git commit -m "fixed bug"
git commit -m "updates"
git commit -m "wip"
git commit -m "asdf"
git commit -m "stuff"
```

### Commit Message Format

```
Type: Brief description (50 chars or less)

More detailed explanation if needed (wrap at 72 chars)
- Bullet points for changes
- Reference issue numbers if applicable
- Explain WHY, not just WHAT

Fixes #123
Closes #456
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style (formatting, no logic change)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## 🚢 Deployment from Git

### Deploying to cPanel from Git

#### Method 1: Direct Upload
```bash
# 1. Build frontend locally
cd client
npm run build

# 2. Upload via cPanel File Manager:
- server/ → /home/username/tv/server/
- client/dist/ → /home/username/tv/client/dist/

# 3. On server terminal:
cd /home/username/tv/server
source nodevenv/bin/activate
npm install
cp .env.example .env
nano .env  # Add your credentials
node database/init.js
npm start
```

#### Method 2: Git Clone on Server
```bash
# SSH into cPanel server
ssh username@yourserver.com

# Clone repository
cd ~/
git clone https://github.com/ampilarey/tv.git
cd tv

# Setup (same as Method 1, step 3)
cd server
npm install
cp .env.example .env
nano .env
node database/init.js

# Build frontend on server
cd ../client
npm install
npm run build

# Configure cPanel Node.js app to point to:
# Application root: ~/tv/server
# Startup file: server.js
```

#### Method 3: GitHub Actions (Advanced)
```yaml
# .github/workflows/deploy.yml
name: Deploy to cPanel

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy via FTP
        # Configure FTP deployment
```

---

## 🔄 Updating Deployed Application

### When You Make Changes

```bash
# 1. Make changes locally
# Edit files...

# 2. Test locally
npm run dev  # Test changes work

# 3. Commit and push
git add .
git commit -m "Description of changes"
git push origin main

# 4. On production server (SSH):
cd ~/tv
git pull origin main

# 5. If backend changes:
cd server
npm install  # If package.json changed
pm2 restart tv  # Or restart via cPanel

# 6. If frontend changes:
cd client
npm install  # If package.json changed
npm run build
# Files in dist/ are now updated
```

---

## 🐛 Troubleshooting Git Issues

### Issue: Merge Conflicts

```bash
# When pulling results in conflicts:
git pull origin main
# CONFLICT in file.js

# 1. Open conflicted files, look for:
<<<<<<< HEAD
Your changes
=======
Incoming changes
>>>>>>> main

# 2. Manually resolve conflicts

# 3. Stage resolved files
git add file.js

# 4. Complete merge
git commit -m "Resolve merge conflicts"
```

### Issue: Accidentally Committed .env

```bash
# URGENT: Remove from git history
git rm --cached server/.env
git commit -m "Remove .env from git"
git push origin main

# Then immediately:
# 1. Change all passwords
# 2. Generate new JWT_SECRET
# 3. Update .env on server
# 4. Consider repository private or recreate it
```

### Issue: Need to Undo Last Push

```bash
# If you pushed wrong code:
git revert HEAD
git push origin main

# Or reset (be careful!):
git reset --hard HEAD~1  # Go back 1 commit
git push origin main --force  # ⚠️ Only if you're sure!
```

### Issue: Forgot to Pull Before Committing

```bash
# You committed locally but forgot to pull first
git pull origin main
# If conflicts, resolve them
git push origin main
```

### Issue: Want to Ignore Already-Tracked File

```bash
# File is tracked but you want to ignore it
git rm --cached path/to/file
echo "path/to/file" >> .gitignore
git commit -m "Stop tracking file"
```

---

## 🔒 Security Best Practices

### ✅ DO:
1. **Always use .gitignore** for sensitive files
2. **Never commit passwords** or secrets
3. **Use .env.example** as template
4. **Review changes** before committing (`git diff`)
5. **Use SSH keys** for authentication (more secure than passwords)
6. **Enable 2FA** on GitHub account
7. **Keep repository private** (if it contains business logic)

### ❌ DON'T:
1. **Never commit .env files**
2. **Never commit API keys** or tokens
3. **Never commit database files** with real data
4. **Never use `--force` push** unless you're certain
5. **Never commit node_modules/**
6. **Never commit build files** (dist/)

---

## 📦 .gitignore Explained

### Current .gitignore Contents

```bash
# Environment variables (NEVER commit these!)
.env
.env.local
.env.production
server/.env

# Dependencies (install with npm install)
node_modules/
*/node_modules/

# Build outputs (generated with npm run build)
client/dist/
client/dist-ssr/

# Database files (create on each server)
server/database/*.sqlite
server/database/*.db
*.sqlite
*.db

# User uploads (backed up separately)
server/uploads/*
!server/uploads/.gitkeep

# Logs (not needed in git)
logs/
*.log
npm-debug.log*

# OS files (system-specific)
.DS_Store      # macOS
Thumbs.db      # Windows
*.swp          # vim

# Editor files (user preferences)
.vscode/
.idea/
*.sublime-*
```

---

## 🎯 Quick Reference

### Daily Commands
```bash
git status                 # Check what changed
git add .                  # Stage all changes
git commit -m "message"    # Commit changes
git push origin main       # Push to GitHub
git pull origin main       # Get latest changes
```

### Branch Commands
```bash
git branch                 # List branches
git checkout -b new        # Create new branch
git checkout main          # Switch to main
git merge feature          # Merge feature into current
git branch -d feature      # Delete branch
```

### View History
```bash
git log                    # Full history
git log --oneline         # Compact history
git log -5                # Last 5 commits
git show abc123           # Show specific commit
```

### Undo Commands
```bash
git restore file.js       # Discard changes
git reset HEAD file.js    # Unstage file
git revert abc123         # Undo commit safely
git stash                 # Save work temporarily
```

---

## 📚 Additional Resources

### Learn More
- **Git Documentation:** https://git-scm.com/doc
- **GitHub Guides:** https://guides.github.com/
- **Git Cheat Sheet:** https://education.github.com/git-cheat-sheet-education.pdf

### GitHub Repository Features
- **Issues:** Track bugs and features
- **Projects:** Organize work with Kanban boards
- **Wiki:** Documentation
- **Actions:** CI/CD automation
- **Releases:** Version tagging

---

## 🎯 Repository Checklist

```bash
✅ Repository setup complete
✅ .gitignore configured (protects .env)
✅ .env.example created (template for setup)
✅ README.md comprehensive
✅ Initial commit pushed
✅ Branch strategy decided
✅ Commit message convention understood
✅ Security best practices followed

Next Steps:
[ ] Add collaborators (if team project)
[ ] Setup GitHub Actions (optional)
[ ] Create deployment workflow
[ ] Tag first release (v1.0.0)
[ ] Monitor repository security alerts
```

---

## 🔖 Version Tagging

### Creating Releases

```bash
# Tag current commit as v1.0.0
git tag -a v1.0.0 -m "Initial production release

Features:
- Complete IPTV platform
- 16 core features working
- Production tested
- Security audit passed (9/10)"

# Push tags to GitHub
git push origin v1.0.0
# Or push all tags:
git push origin --tags

# List tags
git tag -l

# Checkout specific version
git checkout v1.0.0
```

### Semantic Versioning

```
v1.0.0
│ │ │
│ │ └─ PATCH (bug fixes)
│ └─── MINOR (new features, backwards compatible)
└───── MAJOR (breaking changes)

Examples:
v1.0.0 → Initial release
v1.0.1 → Bug fix
v1.1.0 → New feature (schedule UI added)
v2.0.0 → Breaking change (API redesign)
```

---

## 📝 Summary

### Your Repository
- **URL:** https://github.com/ampilarey/tv
- **Status:** ✅ Active, up to date
- **Protection:** ✅ .env and secrets excluded
- **Ready for:** Development, Collaboration, Deployment

### Key Points
1. ✅ Code is safely backed up on GitHub
2. ✅ Sensitive data is protected
3. ✅ Easy to clone and setup elsewhere
4. ✅ Can deploy directly from git
5. ✅ Version history tracked
6. ✅ Collaboration ready

---

**Repository maintained by:** Bake & Grill  
**Last updated:** November 9, 2025  
**Version:** 1.0.0

