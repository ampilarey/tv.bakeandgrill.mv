# 🔥 Bake and Grill TV - Complete IPTV Platform

A professional IPTV streaming platform built for Bake and Grill cafe, featuring:
- 🎯 Multiple M3U playlist support
- 📺 HLS video streaming with auto-retry
- ⭐ Favorites system
- 📊 Watch history & analytics
- 🖥️ Cafe display (kiosk) mode
- 🎮 Remote display control
- 📅 Channel scheduling
- 📱 Progressive Web App (installable)
- 👤 User & admin management
- 🎨 Beautiful dark theme UI

---

## 🏗️ Tech Stack

### Backend
- Node.js 18+ + Express
- MySQL (mysql2)
- JWT Authentication
- bcrypt password hashing

### Frontend
- React 18 + Vite
- Tailwind CSS
- HLS.js for video streaming
- React Router
- PWA support

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### 1. Backend Setup

```bash
# Navigate to server folder
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env and add your settings
# Required: JWT_SECRET (use a random 64-character string)
# Optional: M3U_URL_DEFAULT

# Initialize database (creates admin user)
node database/init.js

# Start development server
npm run dev
```

**Default Admin Credentials:**
- Email: `admin@bakegrill.com`
- Password: `BakeGrill2025!`
- ⚠️ **CHANGE THESE IMMEDIATELY AFTER FIRST LOGIN!**

### 2. Frontend Setup

```bash
# In a new terminal, navigate to client folder
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000/api/health

---

## 📦 Production Deployment (cPanel)

### Step 1: Build Frontend

```bash
cd client
npm install
npm run build
```

This creates optimized files in `client/dist/`

### Step 2: Prepare for Upload

Upload these folders to your cPanel server:
- `server/` (entire folder)
- `client/dist/` (built frontend)

Recommended path: `/home/USERNAME/tv/`

### Step 3: Configure cPanel Node.js App

1. Login to cPanel
2. Navigate to **"Setup Node.js App"**
3. Click **"Create Application"**
4. Configure:
   - **Node.js version**: 18 or higher
   - **Application mode**: Production
   - **Application root**: `/home/USERNAME/tv/server`
   - **Application URL**: Your subdomain (e.g., `tv.bakeandgrill.mv`)
   - **Application startup file**: `server.js`

5. **Environment Variables** (Critical!):
   ```
   PORT=4000
   NODE_ENV=production
   JWT_SECRET=[Your-64-char-random-string-here]
   ```

6. Click **"Create"**

### Step 4: Install Dependencies

In cPanel Terminal or SSH:

```bash
cd /home/USERNAME/tv/server
source /home/USERNAME/nodevenv/tv/server/18/bin/activate
npm install
node database/init.js
deactivate
```

### Step 5: Start Application

In cPanel Node.js App interface:
- Click **"Restart"** button
- Check status shows **"Running"**

### Step 6: Enable SSL (Highly Recommended)

1. cPanel → **SSL/TLS Status**
2. Select your subdomain
3. Click **"Run AutoSSL"**
4. Wait for certificate installation

### Step 7: Test

Visit: `https://tv.bakeandgrill.mv`

You should see the login page!

---

## 🖥️ Setting Up Cafe Displays

### 1. Create Display Token (Admin Panel)

Once you have admin features (optional to build later), or create manually in database:

```sql
-- Example: Create a display manually
INSERT INTO displays (name, location, playlist_id, token)
VALUES ('Wall Display 1', 'Main Cafe Wall', 1, 'your-secure-random-token-here');
```

### 2. Access Display URL

On the cafe TV/tablet browser:
```
https://tv.bakeandgrill.mv/display?token=your-secure-random-token-here
```

### 3. Kiosk Mode Setup

**Chrome Kiosk Mode (Recommended for cafe displays):**

```bash
# Windows
chrome.exe --kiosk "https://tv.bakeandgrill.mv/display?token=TOKEN"

# Mac
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk "https://tv.bakeandgrill.mv/display?token=TOKEN"

# Linux
google-chrome --kiosk "https://tv.bakeandgrill.mv/display?token=TOKEN"
```

The display will:
- ✅ Auto-login with token
- ✅ Auto-play first channel
- ✅ Send heartbeat every 30s
- ✅ Poll for remote control commands every 10s
- ✅ Auto-retry on stream failure
- ✅ Run fullscreen with minimal UI

---

## 📚 API Documentation

### Health Check
```bash
curl https://tv.bakeandgrill.mv/api/health
```

### Login
```bash
curl -X POST https://tv.bakeandgrill.mv/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bakegrill.com","password":"BakeGrill2025!"}'
```

### Add Playlist
```bash
curl -X POST https://tv.bakeandgrill.mv/api/playlists \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Channels","m3u_url":"https://example.com/playlist.m3u"}'
```

Full API documentation: See `docs/03-API-ENDPOINTS.md`

---

## 🎨 Features Overview

### User Features
- ✅ Login with email/password
- ✅ Add unlimited M3U playlists
- ✅ Browse channels with search & filter
- ✅ Favorite channels
- ✅ Watch history tracking
- ✅ HLS video streaming (. m3u8 support)
- ✅ Responsive mobile/desktop UI
- ✅ PWA installable app

### Cafe Display Features
- ✅ Token-based auto-login
- ✅ Fullscreen kiosk mode
- ✅ 24/7 operation
- ✅ Auto-reconnect on failure
- ✅ Heartbeat monitoring
- ✅ Remote control (admin can change channel)
- ✅ Channel scheduling (time-based)

### Admin Features (API Available, UI Optional)
- ✅ User management (create, edit, delete)
- ✅ Display management
- ✅ Remote display control
- ✅ Analytics & statistics
- ✅ Settings management

---

## 🔐 Security

### Default Credentials
```
Email: admin@bakegrill.com
Password: BakeGrill2025!
```

**⚠️ CRITICAL: Change immediately after first login!**

### Security Best Practices
- ✅ Strong JWT_SECRET (64+ random characters)
- ✅ HTTPS enabled (SSL certificate)
- ✅ bcrypt password hashing (10 rounds)
- ✅ Protected API routes
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Secure display tokens

---

## 📱 PWA Installation

### Mobile (iOS/Android)
1. Visit site in browser
2. Tap browser menu → "Add to Home Screen"
3. Launch from home screen icon

### Desktop (Chrome/Edge)
1. Look for install icon in address bar
2. Click "Install"
3. App appears in Start Menu/Applications

---

## 🛠️ Troubleshooting

### Backend won't start
- Check Node.js version: `node -v` (must be 18+)
- Verify `.env` file exists with JWT_SECRET
- Check database initialized: `node database/init.js`
- View logs in cPanel

### Video won't play
- Verify M3U URL is accessible
- Check stream URL format (.m3u8 for HLS)
- Test stream URL directly in VLC player
- Check browser console for errors

### Display offline
- Verify display token is correct
- Check network connection
- Check browser is on kiosk URL
- View heartbeat in database

### Can't login
- Verify default credentials
- Check database initialized
- View backend logs
- Test API: `curl http://localhost:4000/api/health`

---

## 📊 Database Schema

Tables:
- `users` - User accounts (admin/staff)
- `playlists` - M3U playlist URLs
- `favorites` - User's favorite channels
- `watch_history` - Viewing sessions
- `displays` - Cafe display configurations
- `display_schedules` - Time-based channel scheduling
- `display_commands` - Remote control command queue
- `app_settings` - System configuration

Full schema: See `docs/02-DATABASE-SCHEMA.md`

---

## 🗂️ Project Structure

```
tv/
├── server/              # Backend (Node.js + Express)
│   ├── server.js       # Main entry point
│   ├── database/       # SQLite schema & init
│   ├── middleware/     # Auth, validation, errors
│   ├── routes/         # API endpoints
│   ├── utils/          # M3U parser, helpers
│   └── uploads/        # File uploads (PWA icons)
│
├── client/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/ # Reusable components
│   │   ├── pages/      # Page components
│   │   ├── services/   # API client
│   │   ├── context/    # React context (Auth)
│   │   └── App.jsx     # Main app component
│   ├── public/         # Static assets, PWA icons
│   └── dist/           # Production build (generated)
│
├── docs/                # Documentation
└── README.md           # This file
```

---

## 🎯 Next Steps (Optional Enhancements)

The core app is fully functional! Optional admin UI features you can add:

1. **Admin Dashboard UI** - Visual interface for:
   - User management (currently via API only)
   - Display management with status cards
   - Schedule management UI
   - Analytics charts

2. **Enhanced Features**:
   - Export/import favorites
   - Grid view for channels
   - Picture-in-Picture mode
   - Keyboard shortcuts (Space, F, M, arrows)
   - Recently watched list

3. **Advanced**:
   - WebSocket for real-time display control
   - EPG (Electronic Program Guide)
   - Multi-language support
   - Native mobile apps

---

## 📝 License

Proprietary - Bake and Grill

---

## 🤝 Support

For issues or questions:
1. Check documentation in `/docs/` folder
2. Review troubleshooting section above
3. Check browser console for errors
4. Review backend logs

---

## 🎉 Credits

Built with:
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Express](https://expressjs.com/)
- [HLS.js](https://github.com/video-dev/hls.js/)
- [mysql2](https://github.com/sidorares/node-mysql2)

---

**Made with 🔥 for Bake and Grill**

Enjoy your TV! 📺
