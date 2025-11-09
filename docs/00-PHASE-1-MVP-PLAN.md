# 🎯 Phase 1 MVP - Build Plan (RECOMMENDED)

**Status:** Ready to Build  
**Approach:** Pragmatic MVP with Essential Features  
**Timeline:** 4-6 days focused development  
**Risk Level:** Low

---

## 📋 Executive Summary

This document outlines the **recommended Phase 1 MVP** for Bake & Grill TV. It takes the best of both approaches:
- **ChatGPT's lean MVP** (core functionality, fast deployment)
- **+ 2 high-value features** (favorites, admin panel)

### Why This Approach?

✅ **Delivers core value fast** - Cafe displays work from day 1  
✅ **Professional UX** - Users can favorite channels  
✅ **Easy to maintain** - No direct database editing needed  
✅ **Room to grow** - Clean architecture for Phase 2 features  
✅ **Low risk** - Simple, battle-tested technologies  

---

## 🎯 Phase 1 Features (What We're Building)

### Core Features (8 Essential)

1. ✅ **Admin/Staff Authentication**
   - Login page with email/password
   - JWT-based auth
   - No public registration (admin creates accounts)
   - Secure password hashing (bcrypt)

2. ✅ **Playlist Management**
   - Add M3U playlist URLs
   - Edit playlist details (name, URL, description)
   - Enable/disable playlists
   - Delete playlists
   - List all playlists

3. ✅ **Channel Parsing & Display**
   - Fetch M3U files from URLs
   - Parse M3U format (EXTINF tags)
   - Extract: name, logo, group, stream URL
   - Display channels in scrollable list
   - Group-based filtering
   - Search functionality

4. ✅ **Video Player**
   - HTML5 video element
   - HLS.js for .m3u8 streams
   - Fallback for direct URLs
   - Basic controls (play/pause, volume, fullscreen)
   - Mobile-responsive layout
   - Channel info display

5. ✅ **Display/Kiosk Mode**
   - Token-based authentication
   - Auto-login for cafe displays
   - Fullscreen video player
   - Minimal UI (no controls, no sidebar)
   - Auto-play first channel
   - Heartbeat monitoring (30s interval)

6. ✅ **PWA Support**
   - Installable on mobile/desktop
   - Service worker for offline support
   - App manifest (name, icons, theme)
   - "Add to Home Screen" prompt
   - Standalone app experience

7. ✅ **Mobile-First UI**
   - Responsive design (mobile → desktop)
   - Tailwind CSS with dark theme
   - Warm Bake & Grill colors
   - Touch-friendly controls
   - Optimized for tablets (cafe use)

8. ✅ **Display Management**
   - Create display tokens
   - Assign playlists to displays
   - View display status (online/offline)
   - Last heartbeat timestamp
   - Basic CRUD operations

### Bonus Features (+2 High-Value Additions)

9. ✅ **Favorites System** ⭐
   - Star icon on each channel
   - Toggle favorite on/off
   - "Favorites" filter view
   - Persisted to database
   - Per-user favorites
   - Simple, intuitive UX

10. ✅ **Admin User Management Panel** ⭐
    - List all users (admin/staff)
    - Create new users
    - Edit user details
    - Delete/deactivate users
    - No manual database editing needed
    - Clean admin interface

---

## 🗄️ Database Schema (Simplified)

### Tables (4 Total)

#### 1. `users`
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `playlists`
```sql
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  m3u_url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `displays`
```sql
CREATE TABLE displays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  playlist_id INTEGER,
  token VARCHAR(255) UNIQUE NOT NULL,
  last_heartbeat DATETIME,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
);
```

#### 4. `favorites` (Bonus)
```sql
CREATE TABLE favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  playlist_id INTEGER NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  UNIQUE(user_id, playlist_id, channel_id)
);
```

### Default Data
```sql
-- Default admin account
INSERT INTO users (email, password_hash, role, first_name, last_name) 
VALUES (
  'admin@bakegrill.com',
  '$2b$10$...', -- bcrypt hash of 'BakeGrill2025!'
  'admin',
  'Admin',
  'User'
);
```

---

## 🔌 API Endpoints (Phase 1)

### Authentication
```
POST /api/auth/login
  Body: { email, password }
  Response: { token, user: { id, email, role } }
```

### Playlists (Protected)
```
GET    /api/playlists           # List all playlists
POST   /api/playlists           # Create playlist
GET    /api/playlists/:id       # Get single playlist
PUT    /api/playlists/:id       # Update playlist
DELETE /api/playlists/:id       # Delete playlist
```

### Channels (Protected)
```
GET /api/channels?playlistId=:id
  Response: { channels: Channel[] }
  
Channel = {
  id: string,
  name: string,
  group?: string,
  logo?: string,
  url: string
}
```

### Displays (Admin Only)
```
GET    /api/displays            # List all displays
POST   /api/displays            # Create display (generates token)
GET    /api/displays/:id        # Get single display
PUT    /api/displays/:id        # Update display
DELETE /api/displays/:id        # Delete display
```

### Display Mode (Token Auth)
```
POST /api/displays/verify
  Body: { token }
  Response: { display: {...}, playlist: {...} }

POST /api/displays/heartbeat
  Body: { token }
  Response: { success: true }
```

### Favorites (Protected, Bonus)
```
GET    /api/favorites                    # Get user's favorites
POST   /api/favorites                    # Add favorite
DELETE /api/favorites/:id                # Remove favorite
GET    /api/favorites/by-playlist/:id    # Favorites for specific playlist
```

### Users (Admin Only, Bonus)
```
GET    /api/users               # List all users
POST   /api/users               # Create user
GET    /api/users/:id           # Get user details
PUT    /api/users/:id           # Update user
DELETE /api/users/:id           # Deactivate user
```

### Health Check (Public)
```
GET /api/health
  Response: { status: "ok", timestamp: "..." }
```

**Total Endpoints:** 22

---

## 🎨 Frontend Pages & Routes

### Public Routes
- `/login` - Login page

### Protected Routes (Require Auth)
- `/dashboard` - Main dashboard (playlist selector)
- `/player` - Video player with channel list
- `/admin/users` - User management (admin only)
- `/admin/displays` - Display management (admin only)

### Special Routes
- `/display?token=XYZ` - Kiosk mode (token auth)

### Navigation Structure
```
App
├── AuthProvider (JWT context)
├── Router
    ├── PublicRoute
    │   └── /login → LoginPage
    ├── ProtectedRoute (requires auth)
    │   ├── /dashboard → DashboardPage
    │   ├── /player → PlayerPage
    │   └── /admin/* → AdminLayout
    │       ├── /admin/users → UserManagement
    │       └── /admin/displays → DisplayManagement
    └── DisplayRoute
        └── /display → KioskModePage
```

---

## 🧩 Key Components

### Layout Components
- `Navbar` - Logo + user menu + logout
- `Sidebar` - Playlist selector + channel list
- `AdminSidebar` - Admin navigation

### Player Components
- `VideoPlayer` - HTML5 video + HLS.js
- `PlayerControls` - Play/pause, volume, fullscreen
- `ChannelList` - Scrollable list with search
- `ChannelCard` - Single channel item with favorite star

### Admin Components
- `UserTable` - List users with actions
- `CreateUserModal` - Form to add new user
- `DisplayTable` - List displays with status
- `CreateDisplayModal` - Form to add display

### Common Components
- `Button` - Styled button (primary, secondary, danger)
- `Input` - Form input with label & error
- `Modal` - Generic modal wrapper
- `Spinner` - Loading indicator
- `Badge` - Status/group badges

---

## 🎨 Design System (Tailwind)

### Color Palette
```javascript
// tailwind.config.js
colors: {
  primary: {
    DEFAULT: '#F59E0B', // Amber
    light: '#FCD34D',   // Golden
    dark: '#EA580C',    // Orange
  },
  secondary: {
    DEFAULT: '#92400E', // Rich Brown
    dark: '#78350F',    // Copper
  },
  background: {
    DEFAULT: '#0F172A', // Dark Charcoal
    light: '#1E293B',   // Slate
    lighter: '#334155', // Slate Light
  },
  text: {
    DEFAULT: '#F1F5F9', // White
    secondary: '#94A3B8', // Gray
    muted: '#64748B',   // Muted
  }
}
```

### Layout Breakpoints
- Mobile: < 768px (single column, player top)
- Tablet: 768px - 1024px (side-by-side layout)
- Desktop: > 1024px (sidebar + main content)

---

## 📦 Tech Stack Details

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** SQLite (better-sqlite3)
- **Auth:** jsonwebtoken + bcrypt
- **HTTP Client:** axios (for M3U fetching)
- **Env:** dotenv
- **CORS:** cors middleware

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **Video:** HLS.js
- **PWA:** vite-plugin-pwa
- **HTTP:** fetch API (native)

### Development Tools
- **Backend Dev:** nodemon
- **Frontend Dev:** Vite dev server (HMR)
- **Code Style:** ESLint + Prettier (optional)

---

## 🚀 Project Structure

```
/tv/
├── server/
│   ├── server.js                 # Main entry point
│   ├── database/
│   │   ├── init.js              # Schema + default data
│   │   └── database.sqlite      # SQLite file (gitignored)
│   ├── middleware/
│   │   └── auth.js              # JWT verification
│   ├── routes/
│   │   ├── auth.js              # Login
│   │   ├── playlists.js         # Playlist CRUD
│   │   ├── channels.js          # Channel fetching
│   │   ├── displays.js          # Display management
│   │   ├── favorites.js         # Favorites CRUD (bonus)
│   │   └── users.js             # User management (bonus)
│   ├── utils/
│   │   └── m3uParser.js         # M3U parsing logic
│   ├── .env.example             # Example env vars
│   ├── .env                     # Actual env (gitignored)
│   ├── .gitignore
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Button, Input, Modal, etc.
│   │   │   ├── player/          # VideoPlayer, ChannelList
│   │   │   └── admin/           # UserTable, DisplayTable
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── PlayerPage.jsx
│   │   │   ├── KioskModePage.jsx
│   │   │   └── admin/
│   │   │       ├── UserManagement.jsx
│   │   │       └── DisplayManagement.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Auth state & methods
│   │   ├── services/
│   │   │   └── api.js           # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   │   ├── pwa-192x192.png
│   │   └── pwa-512x512.png
│   ├── dist/                    # Build output (gitignored)
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .gitignore
│   └── package.json
│
├── docs/                        # All documentation
├── README.md                    # Main readme
└── .gitignore                   # Root gitignore
```

---

## 🔐 Environment Variables

### Server (.env)
```bash
# Server
PORT=4000
NODE_ENV=development

# Security
JWT_SECRET=your-super-secret-64-character-random-string-here-change-this

# Database (optional, defaults to ./database/database.sqlite)
DB_PATH=./database/database.sqlite
```

### Production (cPanel)
```bash
PORT=4000
NODE_ENV=production
JWT_SECRET=production-secret-super-long-random-string
```

---

## 🎯 User Flows

### Flow 1: Admin Login → Play Channel
```
1. Visit https://tv.bakeandgrill.mv
2. Login page → Enter admin@bakegrill.com / BakeGrill2025!
3. Redirect to Dashboard
4. See playlists list (or empty state)
5. Click "Add Playlist" → Enter M3U URL
6. Playlist added → Shows in list
7. Click playlist → Navigate to Player
8. See channels list (left sidebar on desktop)
9. Search or filter by group
10. Click channel → Video starts playing
11. Click star icon → Add to favorites
12. Click "Favorites" filter → See only favorited channels
```

### Flow 2: Create Display for Cafe TV
```
1. Admin login
2. Navigate to Admin → Displays
3. Click "Create Display"
4. Fill form:
   - Name: "Main Wall Display"
   - Location: "Cafe Main Wall"
   - Assign Playlist: [Select from dropdown]
5. Click "Create"
6. Display created → Token generated
7. Copy display URL: https://tv.bakeandgrill.mv/display?token=xyz123
8. Open URL on cafe TV in Chrome
9. Auto-login → Fullscreen player loads
10. First channel auto-plays
11. Heartbeat sent every 30s
12. Display status shows "Online" in admin panel
```

### Flow 3: Manage Users
```
1. Admin login
2. Navigate to Admin → Users
3. See list of all users
4. Click "Create User"
5. Fill form: Email, Password, Role, Name
6. New user created
7. Staff member can now login with those credentials
8. Admin can edit or deactivate users as needed
```

---

## 📋 Scope Exclusions (Save for Phase 2)

### Features NOT in Phase 1 MVP:

❌ Watch history tracking  
❌ Analytics dashboard  
❌ Channel scheduling (time-based auto-switch)  
❌ Remote channel control UI (admin changes what's playing)  
❌ User profile editing  
❌ Password reset flow  
❌ Multi-playlist switching in display mode  
❌ Custom PWA icon upload  
❌ Settings page  
❌ Public user registration  
❌ Advanced role permissions  
❌ Export/import favorites  
❌ Recently watched list  
❌ Keyboard shortcuts  
❌ Picture-in-Picture mode  
❌ Grid view for channels  

**Why exclude these?**
- Not essential for core cafe display functionality
- Add complexity without proportional value in Phase 1
- Can be added incrementally without breaking changes
- Keep development focused and timeline realistic

---

## ⏱️ Development Timeline

### Estimated: 4-6 Days

**Day 1-2: Backend Foundation**
- Project structure setup
- Database schema + initialization
- Auth routes (login)
- Playlist CRUD routes
- M3U parser utility
- Testing with Postman

**Day 3: Backend Completion**
- Display routes + token auth
- Favorites routes (bonus)
- User management routes (bonus)
- Error handling
- Production static file serving

**Day 4: Frontend Core**
- React + Vite setup
- Tailwind configuration
- Auth context + login page
- Dashboard layout
- Playlist management UI

**Day 5: Player & Channels**
- Video player component (HLS.js)
- Channel list component
- Search & filter
- Favorites UI (bonus)
- Mobile responsive layout

**Day 6: Kiosk Mode & Polish**
- Display mode page
- Heartbeat logic
- Admin user management UI (bonus)
- Admin display management UI
- PWA setup
- Testing on mobile/tablet
- Bug fixes

---

## 🧪 Testing Checklist

### Backend
- [ ] Admin login works
- [ ] JWT tokens validate correctly
- [ ] Playlists CRUD operations work
- [ ] M3U parsing extracts channels correctly
- [ ] Channels API returns data
- [ ] Display token verification works
- [ ] Heartbeat updates timestamp
- [ ] Favorites CRUD works
- [ ] User management CRUD works

### Frontend
- [ ] Login redirects to dashboard
- [ ] Logout clears token
- [ ] Add playlist shows channels
- [ ] Video player streams correctly
- [ ] HLS.js handles .m3u8 files
- [ ] Search filters channels
- [ ] Group filter works
- [ ] Favorite star toggles
- [ ] Favorites filter shows only starred
- [ ] Mobile layout responsive
- [ ] Tablet layout looks good

### Display Mode
- [ ] Token auth auto-logs in
- [ ] Fullscreen layout displays
- [ ] Auto-plays first channel
- [ ] Heartbeat sends every 30s
- [ ] Admin panel shows "Online"
- [ ] Works in Chrome kiosk mode

### Admin
- [ ] User list displays
- [ ] Create user works
- [ ] Edit user works
- [ ] Delete/deactivate user works
- [ ] Display list shows status
- [ ] Create display generates token
- [ ] Display URL works

### PWA
- [ ] Install prompt appears on mobile
- [ ] App installs successfully
- [ ] Opens in standalone mode
- [ ] Icon shows on home screen
- [ ] Service worker registers

---

## 🚀 Deployment Process

### Prerequisites
- cPanel account with Node.js support (v18+)
- Subdomain created: `tv.bakeandgrill.mv`
- M3U playlist URL ready

### Steps

#### 1. Build Frontend Locally
```bash
cd client
npm install
npm run build
# Output: client/dist/
```

#### 2. Upload to cPanel
- Upload `/server/` folder to `/home/USERNAME/tv/server/`
- Upload `/client/dist/` to `/home/USERNAME/tv/client/dist/`

#### 3. Setup Node.js App in cPanel
- Go to "Setup Node.js App"
- App Root: `/home/USERNAME/tv/server`
- Startup File: `server.js`
- Node Version: 18+
- Environment Variables:
  - `PORT=4000`
  - `JWT_SECRET=[generate strong random string]`
  - `NODE_ENV=production`

#### 4. Install Dependencies
```bash
cd /home/USERNAME/tv/server
npm install
```

#### 5. Initialize Database
```bash
node database/init.js
```

#### 6. Restart App
- In cPanel Node.js App → Click "Restart"

#### 7. Test
- Visit: `https://tv.bakeandgrill.mv`
- Login: `admin@bakegrill.com` / `BakeGrill2025!`
- **IMPORTANT:** Change password immediately!

---

## 🔐 Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT_SECRET (64+ random characters)
- [ ] HTTPS enabled (SSL certificate)
- [ ] `.env` file not committed to git
- [ ] Database file not publicly accessible
- [ ] Display tokens are random and secure
- [ ] bcrypt rounds set to 10
- [ ] CORS configured correctly
- [ ] Input validation on all endpoints
- [ ] SQL injection prevented (parameterized queries)

---

## 📈 Success Metrics

### Technical
- ✅ App loads in < 2 seconds
- ✅ Video starts playing in < 5 seconds
- ✅ Mobile responsive on all screen sizes
- ✅ No console errors in production
- ✅ PWA installs successfully
- ✅ Display heartbeat reliable

### Business
- ✅ Cafe displays run 24/7 without intervention
- ✅ Staff can add/manage playlists easily
- ✅ Customers can watch on mobile (PWA install)
- ✅ Admin can monitor display status
- ✅ System requires minimal maintenance

---

## 🎉 Phase 2 Roadmap (Future)

Once Phase 1 is stable and deployed:

### Short-term (1-2 weeks)
- 📊 Watch history + basic analytics
- 📅 Channel scheduling (time-based)
- 🎮 Remote channel control (admin → display)
- 🔄 Auto-retry on stream failure

### Medium-term (1-2 months)
- 📱 Enhanced mobile app features
- 🎨 Customizable themes
- 🌐 Multi-language support
- 📧 Email notifications

### Long-term (3+ months)
- 🤖 AI recommendations
- 📺 EPG (Electronic Program Guide)
- 👨‍👩‍👧‍👦 Parental controls
- 📱 Native mobile apps (React Native)

---

## ✅ Approval & Next Steps

**This plan represents the optimal balance of:**
- Speed to market
- Essential functionality
- Professional UX
- Maintainability
- Scalability

**When approved, we'll build:**
- Complete backend (Node.js + Express + SQLite)
- Complete frontend (React + Vite + Tailwind)
- All 10 features listed above
- Fully tested and deployment-ready
- Documentation for maintenance

**Ready to start?** Just say "start" or "begin"! 🚀

