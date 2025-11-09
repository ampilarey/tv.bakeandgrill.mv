# 🔥 Phase 1 COMPLETE - Build Plan

**Status:** Ready to Build - FULL FEATURE SET  
**Approach:** Comprehensive MVP with ALL Essential Features  
**Timeline:** 2-3 weeks focused development  
**Risk Level:** Low-Medium

---

## 🎯 Executive Summary

Building the **COMPLETE Bake & Grill TV system** with all features needed for:
- ✅ Professional cafe digital signage
- ✅ Staff content management
- ✅ Customer mobile app experience
- ✅ Business analytics & insights
- ✅ Remote display control
- ✅ Automated scheduling

**No compromises. Everything included.**

---

## 🎁 Complete Feature List (16 Features)

### Core Authentication & Users
1. ✅ **Admin/Staff Authentication System**
   - Login with email/password
   - JWT-based auth
   - Secure password hashing (bcrypt)
   - Session management

2. ✅ **User Management Panel**
   - Create/edit/delete users
   - Assign roles (admin/staff)
   - User profile management
   - Change password functionality

### Playlist & Content Management
3. ✅ **Playlist Management**
   - Add multiple M3U playlist URLs
   - Edit playlist details
   - Enable/disable playlists
   - Delete playlists
   - Playlist descriptions

4. ✅ **Channel Parsing & Display**
   - Auto-fetch M3U files
   - Parse channel metadata (name, logo, group)
   - Display in organized list
   - Group-based filtering
   - Search functionality
   - Sort options (name, group)

5. ✅ **Favorites System**
   - Star/unstar channels
   - Personal favorites per user
   - Filter view for favorites only
   - Persistent across sessions
   - Export/import favorites (JSON)

### Video Player & Viewing
6. ✅ **Advanced Video Player**
   - HTML5 video with HLS.js
   - Play/pause, volume, mute
   - Fullscreen mode
   - Picture-in-Picture (PiP)
   - Keyboard shortcuts
   - Auto-play functionality
   - Error handling with auto-retry

7. ✅ **Watch History Tracking**
   - Log every viewing session
   - Track duration watched
   - Recently watched list (last 10)
   - Personal watch history
   - Timestamps and metadata

### Display & Kiosk System
8. ✅ **Display/Kiosk Mode**
   - Token-based authentication
   - Auto-login for cafe displays
   - Fullscreen video player
   - Minimal UI (display-only)
   - Auto-play first channel
   - Heartbeat monitoring (30s)
   - Auto-reconnect on failure

9. ✅ **Display Management**
   - Create display tokens
   - Assign playlists to displays
   - View online/offline status
   - Last seen timestamp
   - Location tracking
   - Display naming

10. ✅ **Remote Display Control** ⭐
    - Admin controls what displays play
    - Change channel remotely
    - Real-time updates (polling)
    - Control from phone/laptop
    - Emergency content switching
    - Display commands queue

11. ✅ **Channel Scheduling** ⭐
    - Time-based auto-switching
    - Weekly schedule support
    - Multiple schedules per display
    - Day/time configuration
    - Override current channel
    - Schedule enable/disable

### Analytics & Insights
12. ✅ **Watch Analytics Dashboard**
    - Total watch time
    - Most watched channels
    - Watch time by group
    - User activity stats
    - Display uptime metrics
    - Time-range filtering

13. ✅ **Display Monitoring**
    - Real-time status indicators
    - Online/offline tracking
    - Current playing channel
    - Heartbeat history
    - Uptime percentage
    - Error log viewing

### System & Settings
14. ✅ **Settings Management**
    - App name configuration
    - PWA icon upload
    - System preferences
    - Max playlists per user
    - Session timeout settings
    - Feature toggles

15. ✅ **PWA Support**
    - Installable on mobile/desktop
    - Offline support
    - Service worker caching
    - Custom app icons
    - Splash screen
    - Standalone mode

16. ✅ **Mobile-First Responsive UI**
    - Touch-friendly controls
    - Responsive layouts
    - Dark theme with Bake & Grill colors
    - Tablet-optimized
    - Smooth animations
    - Accessibility features

---

## 🗄️ Complete Database Schema (8 Tables)

### 1. `users`
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);
```

### 2. `playlists`
```sql
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  m3u_url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_fetched DATETIME
);
```

### 3. `favorites`
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

### 4. `watch_history`
```sql
CREATE TABLE watch_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  playlist_id INTEGER NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

CREATE INDEX idx_history_user ON watch_history(user_id);
CREATE INDEX idx_history_watched_at ON watch_history(watched_at DESC);
```

### 5. `displays`
```sql
CREATE TABLE displays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  playlist_id INTEGER,
  current_channel_id VARCHAR(255),
  token VARCHAR(255) UNIQUE NOT NULL,
  last_heartbeat DATETIME,
  is_active BOOLEAN DEFAULT 1,
  auto_play BOOLEAN DEFAULT 1,
  schedule_enabled BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
);

CREATE INDEX idx_displays_token ON displays(token);
```

### 6. `display_schedules`
```sql
CREATE TABLE display_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_id INTEGER NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  day_of_week INTEGER CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE
);

CREATE INDEX idx_schedules_display ON display_schedules(display_id);
```

### 7. `display_commands`
```sql
CREATE TABLE display_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_id INTEGER NOT NULL,
  command_type VARCHAR(50) NOT NULL,
  command_data TEXT,
  is_executed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  executed_at DATETIME,
  FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE
);

CREATE INDEX idx_commands_display ON display_commands(display_id, is_executed);
```

### 8. `app_settings`
```sql
CREATE TABLE app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_settings (key, value, description) VALUES
  ('app_name', 'Bake and Grill TV', 'Application display name'),
  ('pwa_icon_path', '/default-icon.png', 'Path to custom PWA icon'),
  ('max_playlists_per_user', '10', 'Maximum playlists per user'),
  ('session_timeout_days', '7', 'JWT token expiry (days)'),
  ('enable_registration', 'false', 'Allow new user signups');
```

---

## 🔌 Complete API Endpoints (35+ Endpoints)

### Authentication
```
POST   /api/auth/login                    # User login
POST   /api/auth/logout                   # User logout
GET    /api/auth/verify                   # Verify token
```

### Users (Admin)
```
GET    /api/users                         # List all users
POST   /api/users                         # Create user
GET    /api/users/:id                     # Get user details
PUT    /api/users/:id                     # Update user
DELETE /api/users/:id                     # Delete user
PATCH  /api/users/:id/password            # Change password
```

### Playlists
```
GET    /api/playlists                     # List all playlists
POST   /api/playlists                     # Create playlist
GET    /api/playlists/:id                 # Get single playlist
PUT    /api/playlists/:id                 # Update playlist
DELETE /api/playlists/:id                 # Delete playlist
POST   /api/playlists/:id/refresh         # Refresh channel cache
```

### Channels
```
GET    /api/channels?playlistId=:id       # Get channels from playlist
GET    /api/channels/:id                  # Get single channel details
```

### Favorites
```
GET    /api/favorites                     # Get user's favorites
POST   /api/favorites                     # Add favorite
DELETE /api/favorites/:id                 # Remove favorite
GET    /api/favorites/export              # Export as JSON
POST   /api/favorites/import              # Import from JSON
```

### Watch History
```
GET    /api/history                       # Get watch history (paginated)
POST   /api/history                       # Log watch session
GET    /api/history/recent                # Recently watched (last 10)
GET    /api/history/analytics             # Personal analytics
DELETE /api/history/:id                   # Delete history entry
DELETE /api/history                       # Clear all history
```

### Displays (Admin)
```
GET    /api/displays                      # List all displays
POST   /api/displays                      # Create display
GET    /api/displays/:id                  # Get display details
PUT    /api/displays/:id                  # Update display
DELETE /api/displays/:id                  # Delete display
GET    /api/displays/:id/status           # Get display status
POST   /api/displays/:id/control          # Remote control (change channel)
```

### Display Mode (Token Auth)
```
POST   /api/displays/verify               # Verify display token
POST   /api/displays/heartbeat            # Send heartbeat
GET    /api/displays/commands/:token      # Poll for commands
PATCH  /api/displays/commands/:id/execute # Mark command executed
```

### Display Schedules (Admin)
```
GET    /api/displays/:id/schedules        # Get display schedules
POST   /api/displays/:id/schedules        # Create schedule
PUT    /api/schedules/:id                 # Update schedule
DELETE /api/schedules/:id                 # Delete schedule
GET    /api/schedules/:id/current         # Get current scheduled channel
```

### Analytics (Admin)
```
GET    /api/analytics/overview            # System-wide stats
GET    /api/analytics/channels            # Most watched channels
GET    /api/analytics/users               # User activity
GET    /api/analytics/displays            # Display uptime/status
GET    /api/analytics/watch-time          # Watch time breakdown
```

### Settings (Admin)
```
GET    /api/settings                      # Get all settings
PATCH  /api/settings/:key                 # Update setting
POST   /api/settings/pwa-icon             # Upload PWA icon
GET    /api/settings/pwa-icon             # Get current icon
```

### Health & System
```
GET    /api/health                        # Health check
GET    /api/version                       # API version info
```

**Total: 40+ API Endpoints**

---

## 🎨 Complete Frontend Structure

### Pages (12 Pages)

#### Public
1. `/login` - Login page

#### User Dashboard
2. `/dashboard` - Main dashboard (playlist selector)
3. `/player` - Video player with channel list
4. `/favorites` - Favorites-only view
5. `/history` - Watch history page
6. `/profile` - User profile & password change

#### Admin Panel
7. `/admin/dashboard` - Admin overview with stats
8. `/admin/users` - User management
9. `/admin/playlists` - Playlist management (all users)
10. `/admin/displays` - Display management
11. `/admin/displays/:id` - Display detail with schedules
12. `/admin/analytics` - Analytics dashboard
13. `/admin/settings` - System settings

#### Special
14. `/display?token=XYZ` - Kiosk mode

### Components (40+ Components)

#### Layout
- `Navbar` - Top navigation
- `Sidebar` - Channel list sidebar
- `AdminSidebar` - Admin navigation
- `Footer` - Footer links
- `DashboardLayout` - User dashboard wrapper
- `AdminLayout` - Admin panel wrapper

#### Player
- `VideoPlayer` - HTML5 + HLS.js player
- `PlayerControls` - Play, pause, volume, fullscreen
- `ChannelList` - Scrollable channel list
- `ChannelCard` - Single channel item
- `ChannelSearch` - Search input
- `GroupFilter` - Filter by group
- `SortDropdown` - Sort options
- `ViewToggle` - List/grid toggle
- `FavoriteButton` - Star icon toggle

#### Admin - Users
- `UserTable` - List all users
- `CreateUserModal` - Add user form
- `EditUserModal` - Edit user form
- `UserDetailView` - User info display

#### Admin - Displays
- `DisplayTable` - List all displays
- `DisplayCard` - Single display status card
- `CreateDisplayModal` - Add display form
- `EditDisplayModal` - Edit display form
- `RemoteControlModal` - Change channel modal
- `DisplayStatus` - Online/offline indicator
- `ScheduleList` - List of schedules
- `CreateScheduleModal` - Add schedule form
- `ScheduleCalendar` - Visual schedule view

#### Admin - Analytics
- `StatsCard` - Single stat display
- `ChannelChart` - Most watched chart
- `WatchTimeChart` - Time breakdown chart
- `DisplayUptimeTable` - Uptime metrics
- `UserActivityChart` - Activity over time

#### Admin - Settings
- `SettingsForm` - General settings
- `PWAIconUpload` - Icon upload component
- `AdvancedSettings` - System config

#### Common
- `Button` - Styled button
- `Input` - Form input
- `Select` - Dropdown
- `Textarea` - Multi-line input
- `Checkbox` - Checkbox input
- `Modal` - Generic modal wrapper
- `Card` - Content card
- `Badge` - Status/group badge
- `Spinner` - Loading indicator
- `Toast` - Notification
- `ConfirmDialog` - Confirmation modal
- `Pagination` - Page navigation
- `EmptyState` - No data placeholder

---

## ⏱️ Development Timeline

### **Week 1: Backend Foundation**

**Days 1-2: Setup & Database**
- Project structure setup
- SQLite database schema (8 tables)
- Database initialization script
- Default admin user creation
- Seed data

**Days 3-4: Core API (Part 1)**
- Auth routes (login, logout, verify)
- User routes (CRUD)
- Playlist routes (CRUD)
- M3U parser utility
- Error handling middleware
- JWT middleware

**Days 5-7: Core API (Part 2)**
- Channel routes
- Favorites routes
- Watch history routes
- Display routes
- Display command system
- Schedule routes

### **Week 2: Advanced Backend & Frontend Start**

**Days 8-9: Analytics & Settings**
- Analytics routes
- Settings routes
- File upload (PWA icon)
- Heartbeat system
- Command polling system

**Days 10-11: Frontend Setup**
- React + Vite project setup
- Tailwind CSS configuration
- Color palette implementation
- React Router setup
- Auth context
- API service layer

**Days 12-14: User Interface (Part 1)**
- Login page
- Dashboard page
- Player page
- Video player component
- Channel list component
- Search & filter components

### **Week 3: Complete Frontend & Polish**

**Days 15-16: User Interface (Part 2)**
- Favorites page
- Watch history page
- Profile page
- All user-facing features

**Days 17-18: Admin Panel (Part 1)**
- Admin dashboard
- User management UI
- Playlist management UI

**Days 19-20: Admin Panel (Part 2)**
- Display management UI
- Remote control modal
- Schedule management UI
- Analytics dashboard

**Days 21-22: Kiosk Mode & Polish**
- Display mode page
- Heartbeat implementation
- Command polling
- Auto-retry logic
- Settings UI
- PWA configuration

**Day 23: Testing & Bug Fixes**
- End-to-end testing
- Mobile testing
- Display mode testing
- Bug fixes
- Performance optimization

**Day 24: Documentation & Deployment**
- Deployment preparation
- Build optimization
- Documentation updates
- Final testing

---

## 🧪 Comprehensive Testing Checklist

### Authentication & Users
- [ ] Admin login works
- [ ] Staff login works
- [ ] Token verification works
- [ ] Logout clears session
- [ ] Create user (admin panel)
- [ ] Edit user details
- [ ] Change password
- [ ] Delete user
- [ ] Role-based access control

### Playlists
- [ ] Add playlist with M3U URL
- [ ] Edit playlist details
- [ ] Enable/disable playlist
- [ ] Delete playlist
- [ ] Playlist list displays correctly
- [ ] M3U parsing works
- [ ] Channels extracted correctly

### Channels
- [ ] Channel list displays
- [ ] Search filters channels
- [ ] Group filter works
- [ ] Sort by name/group
- [ ] Channel selection highlights
- [ ] Logo images display (if available)

### Video Player
- [ ] HLS streams play (.m3u8)
- [ ] Direct URLs play
- [ ] Play/pause works
- [ ] Volume control works
- [ ] Mute/unmute works
- [ ] Fullscreen mode works
- [ ] PiP mode works
- [ ] Auto-retry on error
- [ ] Keyboard shortcuts work
- [ ] Mobile controls work

### Favorites
- [ ] Star icon toggles
- [ ] Favorite saves to DB
- [ ] Favorites filter shows only starred
- [ ] Unfavorite removes from list
- [ ] Export favorites to JSON
- [ ] Import favorites from JSON
- [ ] Favorites persist across sessions

### Watch History
- [ ] Viewing sessions logged
- [ ] Duration tracked accurately
- [ ] History page displays entries
- [ ] Recently watched shows last 10
- [ ] Clear history works
- [ ] Pagination works

### Display Mode
- [ ] Token authentication works
- [ ] Auto-login succeeds
- [ ] Fullscreen layout displays
- [ ] Auto-plays first channel
- [ ] Heartbeat sends every 30s
- [ ] Commands polled every 10s
- [ ] Remote control works
- [ ] Schedule auto-switching works
- [ ] Auto-reconnect on failure

### Display Management
- [ ] Create display generates token
- [ ] Display list shows all displays
- [ ] Display status shows online/offline
- [ ] Edit display works
- [ ] Delete display works
- [ ] Assign playlist works
- [ ] Display URL works

### Remote Control
- [ ] Admin can change channel
- [ ] Command queues correctly
- [ ] Display receives command
- [ ] Display executes command
- [ ] Command marked as executed
- [ ] Multiple displays work independently

### Scheduling
- [ ] Create schedule saves
- [ ] Schedule list displays
- [ ] Edit schedule works
- [ ] Delete schedule works
- [ ] Time-based switching works
- [ ] Day-of-week filter works
- [ ] Enable/disable schedule works
- [ ] Current schedule calculates correctly

### Analytics
- [ ] Dashboard shows correct stats
- [ ] Most watched channels correct
- [ ] Watch time breakdown accurate
- [ ] Display uptime calculated
- [ ] Charts render properly
- [ ] Date range filter works
- [ ] Export analytics works

### Settings
- [ ] Get settings works
- [ ] Update app name works
- [ ] PWA icon upload works
- [ ] Icon preview displays
- [ ] Max playlists enforced
- [ ] Session timeout applies

### PWA
- [ ] Install prompt appears
- [ ] App installs successfully
- [ ] Custom icon displays
- [ ] Standalone mode works
- [ ] Service worker registers
- [ ] Offline support works

### Responsive Design
- [ ] Mobile layout correct
- [ ] Tablet layout correct
- [ ] Desktop layout correct
- [ ] Touch controls work
- [ ] Gestures work on mobile

### Performance
- [ ] Page loads < 3 seconds
- [ ] Video starts < 5 seconds
- [ ] API responses < 500ms
- [ ] No memory leaks
- [ ] Smooth 60fps animations

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Build frontend (`npm run build`)
- [ ] Test production build locally
- [ ] Check all env variables
- [ ] Generate strong JWT_SECRET
- [ ] Prepare M3U URLs
- [ ] Test SSL certificate

### cPanel Setup
- [ ] Create subdomain `tv.bakeandgrill.mv`
- [ ] Upload server files
- [ ] Upload client/dist files
- [ ] Configure Node.js app
- [ ] Set environment variables
- [ ] Install dependencies
- [ ] Initialize database
- [ ] Start application

### Post-Deployment
- [ ] Test login
- [ ] Create first playlist
- [ ] Test video playback
- [ ] Create first display
- [ ] Test kiosk mode
- [ ] Install PWA on mobile
- [ ] Change admin password
- [ ] Create staff accounts
- [ ] Test all features
- [ ] Monitor logs for errors

---

## 📊 Success Metrics

### Technical
- ✅ 99%+ uptime
- ✅ < 3s page load time
- ✅ < 5s video start time
- ✅ Zero critical bugs
- ✅ Mobile-responsive on all devices
- ✅ PWA passes Lighthouse audit

### User Experience
- ✅ Staff can manage playlists easily
- ✅ Customers can install PWA
- ✅ Favorites feel instant
- ✅ Search is fast and accurate
- ✅ Video player is reliable

### Business
- ✅ Cafe displays run 24/7 unattended
- ✅ Analytics provide business insights
- ✅ Remote control saves staff time
- ✅ Scheduling automates content
- ✅ System requires minimal maintenance

---

## 🎉 What You Get

### A Complete Professional System:
1. ✅ **Secure authentication** - Admin & staff accounts
2. ✅ **Unlimited playlists** - Add any M3U source
3. ✅ **Smart video player** - HLS support with auto-retry
4. ✅ **Personal favorites** - Save & organize channels
5. ✅ **Watch tracking** - Know what's popular
6. ✅ **Cafe displays** - 24/7 kiosk mode
7. ✅ **Remote control** - Change displays from anywhere
8. ✅ **Auto-scheduling** - Time-based programming
9. ✅ **Analytics dashboard** - Business insights
10. ✅ **Mobile app** - Installable PWA
11. ✅ **Admin panel** - Complete system control
12. ✅ **Custom branding** - Your colors and icons
13. ✅ **Monitoring** - Display health tracking
14. ✅ **Settings** - Configure everything
15. ✅ **User management** - Control access
16. ✅ **Mobile-first** - Works on any device

### Production-Ready:
- 📱 Works on iOS, Android, Desktop
- 🌐 cPanel hosting compatible
- 🔒 Secure and encrypted
- 📊 Business analytics
- 🎨 Professional UI
- 📚 Full documentation
- 🛠️ Easy to maintain
- 📈 Ready to scale

---

## ✅ Ready to Build!

This is the **COMPLETE Bake & Grill TV system**. No features left out. Everything included.

**When you say "start", I'll build:**
- Complete backend with 40+ API endpoints
- Complete frontend with 12 pages
- All 16 features listed above
- 8-table SQLite database
- Full admin panel
- Analytics dashboard
- Remote control system
- Scheduling system
- PWA with custom branding
- Mobile-responsive UI
- Production-ready deployment

**Timeline: 2-3 weeks of focused development**

**Say "start" when ready!** 🚀

