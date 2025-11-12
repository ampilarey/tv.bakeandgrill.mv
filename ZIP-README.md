# 📺 Bake & Grill TV - Complete Source Code

**Version:** 1.0.5  
**Date:** November 12, 2025  
**Status:** Production Ready with 26 Features

---

## 📦 **What's Included in This ZIP:**

### **Complete Source Code:**
- ✅ Frontend (React + Vite)
- ✅ Backend (Node.js + Express)
- ✅ Database Schema (MySQL)
- ✅ Deployment Scripts
- ✅ Documentation
- ✅ Built Assets (ready to deploy)

### **All 26 Features Implemented:**

#### **User Features (8):**
1. ✅ User Profile & Password Change
2. ✅ Watch History with Filters
3. ✅ Search with History & Autocomplete
4. ✅ Favorites System
5. ✅ Picture-in-Picture Mode
6. ✅ Keyboard Shortcuts
7. ✅ Grid/List View Toggle
8. ✅ Dark/Light Theme

#### **Admin Features (8):**
9. ✅ User Management
10. ✅ Display Management
11. ✅ Analytics Dashboard
12. ✅ System Settings
13. ✅ Notification System
14. ✅ Remote Display Control
15. ✅ Real-time Status Updates
16. ✅ Permission Management

#### **Display Pairing (4 Methods):**
17. ✅ PIN-based Pairing (Recommended)
18. ✅ QR Code Pairing
19. ✅ Location ID + 4-digit PIN
20. ✅ Auto-Discovery by IP

#### **Technical Features (6):**
21. ✅ Mobile Video Playback (HLS.js)
22. ✅ PWA Support (Installable)
23. ✅ Error Handling with Retry
24. ✅ Performance Optimization
25. ✅ Toast Notifications
26. ✅ Skeleton Loaders

---

## 🚀 **Quick Start:**

### **1. Extract ZIP:**
```bash
unzip tv-complete-*.zip
cd tv
```

### **2. Install Dependencies:**
```bash
# Backend
cd server
npm install

# Frontend  
cd ../client
npm install
```

### **3. Configure Environment:**
```bash
cd server
cp .env.example .env
# Edit .env with your MySQL credentials
```

### **4. Initialize Database:**
```bash
mysql -u root -p
CREATE DATABASE bakegrill_tv;
exit;

mysql -u root -p bakegrill_tv < database/schema.sql
```

### **5. Run Development:**
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev
```

Open: `http://localhost:5173`

---

## 🌐 **Production Deployment:**

See `DEPLOYMENT-GUIDE.md` for complete cPanel deployment instructions.

**Quick Deploy:**
```bash
# 1. Build frontend
cd client
npm run build

# 2. Deploy to cPanel
bash deploy-to-cpanel.sh

# 3. Run migrations
cd server/database
node run-migration.js migrations/*.sql
```

---

## 📱 **Mobile Video Playback:**

### **How It Works:**
- Uses HLS.js for better codec compatibility
- Optimized buffer settings for mobile
- 3-retry logic for network errors
- Codec detection with warnings

### **If Video Doesn't Play on Mobile:**

Check console logs for:
```
❌ No video tracks found - Stream is audio-only
⚠️ H.265/HEVC codec detected - Limited mobile support
```

**Solutions:**
1. Use H.264 (AVC) codec streams (better compatibility)
2. Check if M3U8 has video variants (not just audio)
3. Contact stream provider for compatible formats

---

## 🔐 **Default Credentials:**

**Admin Account:**
- Email: `admin@bakegrill.com`
- Password: `BakeGrill2025!`

**Live Server:**
- Email: `admin@bakeandgrill.mv`
- Password: `BakeGrill2025!`

---

## 📚 **Documentation:**

- `README.md` - Main documentation
- `DEPLOYMENT-GUIDE.md` - cPanel deployment
- `MOBILE-TESTING-CHECKLIST.md` - Mobile testing
- `docs/` - Complete technical documentation

---

## 🎯 **Display Pairing (NEW!):**

**Old Way (Difficult):**
```
https://tv.bakeandgrill.mv/display?token=043bb49c-dad2-4db0-9e1c-b3a10b6a7717
```

**New Way (Easy!):**
```
https://tv.bakeandgrill.mv/pair
```
- Shows 6-digit PIN
- Admin enters PIN in panel
- Display connects automatically!

---

## 🆘 **Support:**

For issues or questions:
1. Check `docs/` folder
2. Check `DEPLOYMENT-GUIDE.md`
3. Check console logs for errors
4. Review `MOBILE-TESTING-CHECKLIST.md`

---

## 📊 **Project Stats:**

- **Total Commits:** 20+
- **Lines of Code:** 10,000+
- **Features:** 26
- **Pages:** 12
- **Components:** 30+
- **API Endpoints:** 40+

**Built with ❤️ for Bake & Grill**
