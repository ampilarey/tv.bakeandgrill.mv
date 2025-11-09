# Bake and Grill TV - Project Overview

## 🎯 Project Purpose
A complete IPTV streaming platform designed for:
1. **Cafe Display System** - Run 24/7 on TV screens in Bake and Grill cafe
2. **Customer Access** - Allow customers to watch content via web/mobile app
3. **Staff Management** - Admin controls for managing displays and content

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js + Express.js
- **Database**: SQLite (file-based, perfect for cPanel)
- **Authentication**: JWT tokens + bcrypt password hashing
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Video Player**: HTML5 video + HLS.js (for .m3u8 streams)
- **PWA**: vite-plugin-pwa (installable app)
- **Storage**: localStorage + SQLite database

### Deployment Target
- **Platform**: cPanel Node.js hosting
- **URL**: Subdomain (e.g., `tv.bakeandgrill.com` or `iptv.bakeandgrill.com`)
- **Build**: Single deployable folder with backend + built frontend

## 🎨 Branding

### App Name
**"Bake and Grill TV"**

### Color Palette (Warm & Inviting)
```css
Primary Colors:
- Amber: #F59E0B (buttons, highlights)
- Orange: #EA580C (accents, active states)
- Golden: #FCD34D (hover effects)

Secondary Colors:
- Rich Brown: #92400E (borders, secondary buttons)
- Copper: #78350F (subtle backgrounds)

Background:
- Dark Charcoal: #0F172A (main background)
- Slate: #1E293B (cards, panels)
- Slate Light: #334155 (hover states)

Text:
- White: #FFFFFF (primary text)
- Gray: #94A3B8 (secondary text)
- Muted: #64748B (tertiary text)
```

### Typography
- **Headings**: Bold, modern sans-serif
- **Body**: Clean, readable (Tailwind default: Inter)
- **Buttons**: Medium weight, clear labels

## 📦 Deliverables

### Folder Structure
```
/Users/vigani/Website/tv/
├── docs/                    # 📚 All documentation
├── server/                  # 🖥️ Backend
│   ├── server.js           # Main entry point
│   ├── database/           # SQLite DB & migrations
│   ├── middleware/         # Auth, error handling
│   ├── routes/             # API routes
│   ├── utils/              # M3U parser, helpers
│   ├── uploads/            # User uploads (icons)
│   ├── .env.example        # Example environment vars
│   └── package.json
├── client/                  # ⚛️ Frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── context/        # Auth context
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API calls
│   │   ├── utils/          # Helper functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/             # Static assets, PWA icons
│   ├── dist/               # Build output (generated)
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── README.md               # Quick start guide
└── .gitignore
```

## 🎭 User Roles

### 1. **Admin**
- Full system access
- Manage users, playlists, displays
- Upload custom PWA icons
- View analytics and monitor displays
- Create display tokens

### 2. **Regular User**
- Create account
- Add personal M3U playlists
- Watch channels, create favorites
- View watch history
- Use on mobile/desktop

### 3. **Display (Kiosk)**
- Token-based auto-login
- No manual controls
- Auto-play assigned content
- 24/7 operation mode
- Auto-reconnect on failure

## 🔐 Security Features

- Password hashing with bcrypt (10 rounds)
- JWT tokens (7 day expiry for users, no expiry for displays)
- Protected API routes
- SQL injection prevention (parameterized queries)
- XSS protection
- CORS configuration
- Rate limiting on auth endpoints
- Secure token storage (httpOnly cookies option)

## 🚀 Key Features Summary

### Authentication (27 features total)
1. User registration with email validation
2. Secure login with JWT
3. Password reset functionality
4. Remember me option
5. Auto-logout on token expiry

### Video Player
6. HLS.js support for .m3u8 streams
7. Native video fallback
8. Volume control with slider
9. Mute/unmute button
10. Fullscreen mode
11. Play/pause controls
12. Loading/buffering indicators
13. Picture-in-Picture (PiP) mode
14. Auto-retry failed streams (3 attempts)
15. Keyboard shortcuts (Space, F, M, arrows)

### Channel Management
16. Search channels by name
17. Filter by group/category
18. Category pills (quick filters)
19. Sort options (name, group, recent)
20. Grid/List view toggle
21. Channel counter (X of Y)
22. Current playing info display
23. Recently watched list (last 10)
24. Favorites system with localStorage sync
25. Export/import favorites (JSON)
26. Share channel (copy URL)
27. Multiple playlist support per user

### Display System (Cafe)
28. Display/Kiosk mode
29. Display token generation
30. Auto-login for displays
31. Minimized UI for kiosk
32. Auto-play & loop
33. Channel scheduling (time-based)
34. Remote control from admin
35. Auto-reconnect every 30s on failure
36. Display status monitoring

### Admin Dashboard
37. User management (create, edit, delete)
38. Playlist management
39. Display management
40. Create/revoke display tokens
41. Assign playlists to displays
42. Monitor display status (online/offline)
43. View watch analytics
44. Upload custom PWA icon
45. System settings

### PWA Features
46. Installable on mobile/desktop
47. Offline support
48. Custom app icon (changeable)
49. Splash screen
50. Add to home screen prompt

### Watch History & Analytics
51. Track viewing time per channel
52. View personal watch history
53. Admin analytics dashboard
54. Most watched channels report

## 📊 Success Metrics

### For Cafe Displays
- 99.9% uptime
- < 5 second stream start time
- Auto-recovery from network issues
- No manual intervention needed

### For Users
- Smooth playback on mobile/desktop
- Fast channel switching (< 2 seconds)
- Easy playlist management
- Intuitive UI/UX

### For Admin
- Quick display configuration
- Real-time monitoring
- Easy content updates

## 🎯 Project Timeline
This documentation serves as the blueprint. Development will proceed in phases:
1. **Phase 1**: Backend + Database + Auth
2. **Phase 2**: Frontend Core + Player
3. **Phase 3**: Admin Dashboard
4. **Phase 4**: Display/Kiosk Mode
5. **Phase 5**: PWA + Polish
6. **Phase 6**: Testing + Deployment
