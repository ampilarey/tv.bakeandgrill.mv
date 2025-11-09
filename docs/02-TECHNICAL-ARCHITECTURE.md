# Technical Architecture

## 🏗️ Technology Stack

### Backend
- **Runtime:** Node.js 18+ (LTS)
- **Framework:** Express.js
- **Database:** SQLite3 (better-sqlite3)
- **Authentication:** JWT (jsonwebtoken)
- **Password Security:** bcrypt
- **File Uploads:** Multer
- **HTTP Client:** Axios
- **Environment:** dotenv
- **CORS:** cors middleware

### Frontend
- **Framework:** React 18+
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM v6
- **State Management:** React Context + Hooks
- **Video Player:** HTML5 + hls.js
- **PWA:** vite-plugin-pwa
- **HTTP Client:** fetch API / axios

### DevOps & Deployment
- **Hosting:** cPanel Node.js Application
- **Process Manager:** Built-in cPanel (or PM2 if available)
- **Database:** SQLite file (no separate DB server needed)
- **Static Files:** Express serves built React app
- **Environment Variables:** cPanel interface

## 📐 Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  React App (Vite Build)                                     │
│  ├── Public Pages (Login, Register, Landing)                │
│  ├── Protected Routes (Dashboard, Player, Admin)            │
│  ├── Display Mode (Kiosk UI)                               │
│  └── PWA Service Worker                                     │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────┐
│                         API LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  Express.js Server                                          │
│  ├── /api/auth/* (register, login, verify)                 │
│  ├── /api/playlists/* (CRUD operations)                    │
│  ├── /api/channels/* (fetch & parse M3U)                   │
│  ├── /api/favorites/* (add, remove, list)                  │
│  ├── /api/history/* (log views)                            │
│  ├── /api/displays/* (display management)                  │
│  ├── /api/admin/* (admin operations)                       │
│  └── /api/settings/* (app settings, PWA icon)              │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
├─────────────────────────────────────────────────────────────┤
│  SQLite Database (database.db)                              │
│  ├── users                                                  │
│  ├── playlists                                              │
│  ├── favorites                                              │
│  ├── watch_history                                          │
│  ├── displays                                               │
│  ├── display_schedules                                      │
│  └── app_settings                                           │
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ Project Structure

```
/Users/vigani/Website/tv/
│
├── docs/                          # Documentation (this folder)
│   ├── 01-PROJECT-OVERVIEW.md
│   ├── 02-TECHNICAL-ARCHITECTURE.md
│   ├── 03-DATABASE-SCHEMA.md
│   ├── 04-API-ENDPOINTS.md
│   ├── 05-FEATURES-CHECKLIST.md
│   ├── 06-USER-FLOWS.md
│   ├── 07-UI-UX-DESIGN.md
│   ├── 08-DEPLOYMENT-GUIDE.md
│   └── 09-SECURITY-CONSIDERATIONS.md
│
├── server/                        # Backend application
│   ├── server.js                  # Entry point
│   ├── config/
│   │   └── database.js            # SQLite setup
│   ├── middleware/
│   │   ├── auth.js                # JWT verification
│   │   └── errorHandler.js        # Error middleware
│   ├── routes/
│   │   ├── auth.js                # Authentication routes
│   │   ├── playlists.js           # Playlist management
│   │   ├── channels.js            # Channel fetching
│   │   ├── favorites.js           # Favorites CRUD
│   │   ├── history.js             # Watch history
│   │   ├── displays.js            # Display management
│   │   ├── admin.js               # Admin operations
│   │   └── settings.js            # App settings
│   ├── utils/
│   │   ├── parseM3U.js            # M3U parser
│   │   ├── tokenGenerator.js      # Display token generator
│   │   └── validation.js          # Input validation
│   ├── uploads/                   # User uploads (PWA icons)
│   ├── database.db                # SQLite database file
│   ├── .env                       # Environment variables
│   ├── .env.example               # Example env file
│   └── package.json
│
├── client/                        # Frontend application
│   ├── src/
│   │   ├── main.jsx               # Entry point
│   │   ├── App.jsx                # Root component
│   │   ├── index.css              # Tailwind imports
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Auth state management
│   │   ├── components/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── ChannelList.jsx
│   │   │   ├── VideoPlayer.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── FavoriteButton.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx        # Public landing page
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx      # User dashboard
│   │   │   ├── Player.jsx         # Main player page
│   │   │   ├── DisplayMode.jsx    # Kiosk display mode
│   │   │   ├── Admin.jsx          # Admin dashboard
│   │   │   └── NotFound.jsx
│   │   └── utils/
│   │       ├── api.js             # API client
│   │       └── constants.js       # App constants
│   ├── public/
│   │   ├── pwa-192x192.png
│   │   ├── pwa-512x512.png
│   │   └── favicon.ico
│   ├── dist/                      # Build output (production)
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── .gitignore
├── README.md                      # Setup & deployment instructions
└── LICENSE
```

## 🔄 Data Flow

### User Authentication Flow
```
1. User submits login form
2. Frontend sends POST /api/auth/login
3. Backend validates credentials against database
4. Backend generates JWT token
5. Frontend stores token in localStorage
6. Frontend includes token in Authorization header for all API calls
7. Backend middleware verifies token on protected routes
```

### Channel Playback Flow
```
1. User selects playlist from dashboard
2. Frontend fetches POST /api/channels with M3U URL
3. Backend fetches M3U file from external URL
4. Backend parses M3U and returns structured JSON
5. Frontend displays channel list
6. User clicks channel
7. Frontend loads stream URL in video player
8. hls.js handles HLS streams (.m3u8)
9. Native HTML5 handles direct streams
10. Frontend logs watch event to /api/history
```

### Display Mode Flow
```
1. Display navigates to /?display=TOKEN
2. Frontend extracts token, sends to /api/displays/verify
3. Backend validates token, returns assigned playlist
4. Frontend auto-plays assigned content
5. Minimal UI, fullscreen mode
6. Auto-reconnect on stream failure
7. Periodic heartbeat to /api/displays/heartbeat
```

## 🔐 Security Architecture

### Authentication
- **JWT Tokens:** Short-lived (24h), stored in localStorage
- **Password Hashing:** bcrypt with salt rounds (10)
- **Protected Routes:** Middleware checks valid token
- **Role-Based Access:** Admin, User, Display roles

### API Security
- **CORS:** Restricted to specific origins (in production)
- **Rate Limiting:** Prevent abuse (implement if needed)
- **Input Validation:** Sanitize all user inputs
- **SQL Injection:** Parameterized queries (SQLite prepared statements)
- **XSS Prevention:** React escapes by default

### Display Security
- **Long Random Tokens:** UUID v4 for display authentication
- **Read-Only Access:** Displays cannot modify data
- **No Sensitive Data:** Displays only get assigned playlist info

## 🚀 Performance Considerations

### Backend
- **Stream Proxy:** Server doesn't proxy video streams (direct to source)
- **M3U Caching:** Cache parsed M3U for 5 minutes (reduce external requests)
- **Database Indexes:** On user_id, playlist_id for fast queries
- **Lightweight:** SQLite in-process (no network overhead)

### Frontend
- **Code Splitting:** React lazy loading for admin routes
- **Memoization:** useMemo/useCallback for expensive operations
- **Virtualization:** Virtual scrolling for large channel lists
- **Image Optimization:** Lazy load channel logos
- **Service Worker:** Cache static assets (PWA)

### Video Streaming
- **No Re-encoding:** Pass-through stream URLs
- **Client-Side Decoding:** Browser handles all video processing
- **Adaptive Bitrate:** HLS handles quality switching
- **Buffer Management:** hls.js optimizes buffering

## 📊 Scalability

### Current Design Supports:
- ✅ 100-500 concurrent users
- ✅ 5-20 cafe displays
- ✅ 1000s of channels per playlist
- ✅ Single server deployment

### Future Scaling Options:
- **Database:** Migrate to PostgreSQL/MySQL if SQLite hits limits (~1000 req/sec write limit)
- **Caching:** Add Redis for M3U cache and session storage
- **CDN:** Serve static assets from CDN
- **Load Balancer:** Multiple server instances behind nginx
- **Media Server:** Self-host streams instead of external M3U sources

---

**Next:** Database Schema Design

