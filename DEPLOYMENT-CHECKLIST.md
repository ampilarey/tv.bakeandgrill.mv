# 🚀 Production Deployment Checklist

Based on Audit Report: `AUDIT-REPORT-2025-01-15-FULL-REVIEW.md`

## ✅ Pre-Deployment Security Checks

### Critical (MUST DO)

- [ ] **JWT_SECRET is set** in `.env` file
  - The server now validates this at startup and will fail in production if missing
  - Generate a strong random string: `openssl rand -base64 32`

- [ ] **Default Admin Credentials**
  - Set `ALLOW_DEFAULT_ADMIN=false` in `.env` after creating your first admin user
  - OR set `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` environment variables
  - **CRITICAL:** Never use default credentials in production!

- [ ] **Database Credentials**
  - Ensure `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` are all set
  - Use strong, unique passwords

### High Priority

- [ ] **CORS Configuration**
  - Set `ALLOWED_ORIGINS` in `.env` to your production domains
  - Format: `https://tv.bakeandgrill.mv,https://tv.bakegrill.com`
  - Remove any development/test domains

- [ ] **Environment Variables**
  - Review all `.env` variables are set correctly
  - Never commit `.env` file to version control
  - Use different values for production vs development

- [ ] **HTTPS/SSL**
  - Ensure production server uses HTTPS
  - SSL certificates valid and properly configured

## 📦 Build & Deployment Steps

### 1. Build Frontend

```bash
cd client
npm install
npm run build
```

Verify:
- [ ] `client/dist/` folder contains built files
- [ ] No build errors
- [ ] Service worker files generated (`sw.js`, `workbox-*.js`)

### 2. Server Setup

```bash
cd server
npm install --production
```

Verify:
- [ ] All dependencies installed
- [ ] `.env` file configured
- [ ] Database connection works

### 3. Database Migration (if needed)

```bash
cd server/database
# Run migrations if any new ones exist
mysql -u [user] -p [database] < migrations/[migration-file].sql
```

Optional Performance Index:
- [ ] Run `migrations/2025-11-15-performance-indexes.sql` if not already applied
  - Only needed if history queries are slow
  - Can be run anytime without downtime

### 4. Start Server

```bash
cd server
NODE_ENV=production npm start
```

Verify:
- [ ] Server starts without errors
- [ ] JWT_SECRET validation passes
- [ ] Database connects successfully
- [ ] Server listens on correct port (default: 4000)

## ✅ Post-Deployment Verification

### Security Checks

- [ ] **Test Authentication**
  - Login with admin credentials works
  - JWT tokens are generated and validated
  - Logout works correctly

- [ ] **Verify Rate Limiting**
  - API endpoints rate-limited
  - Auth endpoints have stricter limits

- [ ] **Check CORS**
  - Frontend can make API calls from production domain
  - Other domains are blocked (in production)

### Functionality Checks

- [ ] **Video Playback**
  - Test on iOS device (native HLS)
  - Test on Android device (HLS.js)
  - Test on desktop browser
  - Verify "Tap to Play" works on mobile
  - Check error handling for failed streams

- [ ] **Mobile Features**
  - Bottom-sheet channel drawer works
  - Swipe gestures for channel navigation
  - Responsive layout displays correctly

- [ ] **Core Features**
  - Channel list loads
  - Search works
  - Favorites can be added/removed
  - Watch history tracks correctly
  - Display/kiosk mode works (if used)

### Performance Checks

- [ ] **Load Time**
  - Initial page load < 3 seconds
  - Channel list renders smoothly
  - Video starts playing within reasonable time

- [ ] **Cache Behavior**
  - New builds load correctly (not cached old version)
  - Service worker updates properly
  - Static assets load from server (not cache) after deployment

## 🔧 Configuration Files

### `.env` Template

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_strong_password
DB_NAME=bakegrill_tv

# Security
JWT_SECRET=your_very_strong_random_secret_here
ALLOW_DEFAULT_ADMIN=false

# Admin (only if ALLOW_DEFAULT_ADMIN=true)
DEFAULT_ADMIN_EMAIL=admin@bakegrill.com
DEFAULT_ADMIN_PASSWORD=your_secure_password

# CORS
ALLOWED_ORIGINS=https://tv.bakeandgrill.mv,https://tv.bakegrill.com

# App Configuration
NODE_ENV=production
PORT=4000
APP_NAME=Bake and Grill TV

# Rate Limiting (optional, has defaults)
API_RATE_LIMIT=600
AUTH_RATE_LIMIT=100

# Session
SESSION_TIMEOUT_DAYS=7
```

## 🚨 Common Issues & Solutions

### Issue: Server fails to start with "JWT_SECRET not set"
**Solution:** Add `JWT_SECRET` to `.env` file with a strong random string

### Issue: Old website still showing after deployment
**Solution:**
1. Clear browser cache (hard reload: Ctrl+Shift+R / Cmd+Shift+R)
2. Unregister service workers (DevTools → Application → Service Workers)
3. Clear all caches (DevTools → Application → Cache Storage)
4. Verify server is serving new files: `curl http://your-server/ | grep "index-.*\.js"`

### Issue: Video not playing on mobile
**Solution:**
- Check if stream URL is accessible from mobile device
- Verify CORS headers if using HLS.js (iOS uses native HLS automatically)
- Check browser console for specific error messages
- Ensure "Tap to Play" overlay appears (required for autoplay on mobile)

### Issue: Database connection fails
**Solution:**
- Verify database credentials in `.env`
- Check database server is running
- Ensure MySQL user has proper permissions
- Check firewall/network allows connections

## 📝 Maintenance Notes

### Regular Tasks

- [ ] Monitor server logs for errors
- [ ] Check database connection pool health
- [ ] Review rate limiting stats
- [ ] Monitor video playback success rate
- [ ] Backup database regularly

### After Updates

- [ ] Test video playback on multiple devices
- [ ] Verify mobile features still work
- [ ] Check service worker updates correctly
- [ ] Clear any caches if needed

## 🔗 Related Documentation

- `AUDIT-REPORT-2025-01-15-FULL-REVIEW.md` - Full audit details
- `README.md` - General project documentation
- `server/database/schema.sql` - Database schema
- `server/database/migrations/` - Database migrations

---

**Last Updated:** January 15, 2025  
**Based on Audit:** AUDIT-REPORT-2025-01-15-FULL-REVIEW.md

