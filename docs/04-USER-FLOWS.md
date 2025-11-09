# User Flows & Wireframes

## Flow 1: Regular User Journey

### A. First Time Visit → Registration
```
1. Visit https://tv.bakeandgrill.com
   ↓
2. Landing Page
   - Hero: "Bake and Grill TV"
   - Subtitle: "Stream your favorite channels"
   - Buttons: [Login] [Sign Up]
   ↓
3. Click "Sign Up"
   ↓
4. Registration Form
   - Email (required)
   - Password (required, min 8 chars)
   - First Name (optional)
   - Last Name (optional)
   - [Create Account] button
   ↓
5. Account Created
   - Auto-login
   - Redirect to Dashboard
```

### B. Returning User → Login
```
1. Visit site → Login Page
   ↓
2. Login Form
   - Email
   - Password
   - [x] Remember me (7 days vs session)
   - [Login] button
   - "Forgot password?" link
   ↓
3. Authentication Success
   - Redirect to Dashboard
```

### C. Dashboard → Add First Playlist
```
1. Dashboard (Empty State)
   - Message: "You don't have any playlists yet"
   - [Add Your First Playlist] button
   ↓
2. Click button → Modal Opens
   ↓
3. Add Playlist Modal
   - Playlist Name (text input)
   - M3U URL (text input)
   - Description (textarea, optional)
   - [Cancel] [Add Playlist] buttons
   ↓
4. Submit → Loading indicator
   ↓
5. Success
   - Modal closes
   - Playlist appears in list
   - Auto-fetch channels
   - Show first channel in player
```

### D. Using the Player
```
1. Dashboard with Active Playlist
   ┌─────────────────────────────────────┐
   │ Layout (Desktop):                   │
   │ ┌────────┬──────────────────────┐   │
   │ │Channel │                      │   │
   │ │List    │   Video Player       │   │
   │ │        │                      │   │
   │ │(Scroll)│   [Controls]         │   │
   │ └────────┴──────────────────────┘   │
   └─────────────────────────────────────┘
   
   Layout (Mobile):
   ┌─────────────────┐
   │ Video Player    │
   │                 │
   │ [Controls]      │
   ├─────────────────┤
   │ Channel List    │
   │ (Scrollable)    │
   └─────────────────┘
   ↓
2. Channel List Features:
   - Search bar at top
   - Group filter pills/dropdown
   - Sort dropdown (Name/Group/Recent)
   - Toggle Grid/List view
   - Channel cards showing:
     * Logo (if available)
     * Channel name
     * Group badge
     * Favorite star icon
     * Playing indicator (if active)
   ↓
3. Click Channel → Stream Starts
   - Highlight selected channel
   - Load stream in player
   - Show loading spinner
   - Auto-play when ready
   - Add to watch history
   ↓
4. Player Controls:
   - Play/Pause button
   - Volume slider + mute
   - Fullscreen button
   - PiP button
   - Current channel info display
   - [Previous] [Next] channel buttons
   ↓
5. Favorite a Channel:
   - Click star icon → Fills in
   - Saved to favorites list
   - Synced to database
```

### E. Managing Favorites
```
1. Click "Favorites" filter/tab
   ↓
2. Show Only Favorite Channels
   - Filtered list view
   - Click star again to unfavorite
   ↓
3. Export Favorites (Optional)
   - Click "Export" button
   - Download favorites.json file
   ↓
4. Import Favorites (Optional)
   - Click "Import" button
   - Select .json file
   - Merge with existing favorites
```

### F. View Watch History
```
1. Click "History" in menu/tab
   ↓
2. Watch History Page
   - List of recently watched channels
   - Show: Channel name, date/time, duration
   - Sort by most recent
   - Click channel → Play again
   ↓
3. Analytics (Personal)
   - Total watch time
   - Most watched channels
   - Watch time by group (pie chart)
```

---

## Flow 2: Cafe Display (Kiosk Mode)

### A. Display Setup (Admin)
```
1. Admin logs in → Admin Dashboard
   ↓
2. Click "Displays" in sidebar
   ↓
3. Displays Management Page
   - List of existing displays
   - [Add New Display] button
   ↓
4. Click [Add New Display]
   ↓
5. Create Display Form
   - Display Name (e.g., "Wall Display 1")
   - Location (e.g., "Main Cafe Wall")
   - Assign Playlist (dropdown)
   - Auto-play enabled (checkbox, default: ON)
   - [Create] button
   ↓
6. Display Created
   - Unique token generated
   - Display URL shown:
     https://tv.bakeandgrill.com?display=TOKEN
   - [Copy URL] button
   - QR code displayed
```

### B. Display Access (Cafe TV)
```
1. Open browser on cafe TV/tablet
   ↓
2. Navigate to:
   https://tv.bakeandgrill.com?display=TOKEN
   ↓
3. Auto-authentication
   - Token validated
   - Display record loaded
   - Skip login page entirely
   ↓
4. Kiosk Mode Interface
   - Fullscreen video player
   - Minimal UI (no controls visible)
   - Assigned playlist loaded
   - First/scheduled channel auto-plays
   - No sidebar, no menus
   - Optional: Small logo watermark
   ↓
5. Continuous Operation
   - Auto-play next channel if configured
   - Auto-retry on stream failure (30s interval)
   - Heartbeat sent to server every 60s
   - Remote control: Admin can change channel
   - Schedule: Auto-switch channels by time
```

### C. Display Monitoring (Admin)
```
1. Admin Dashboard → Displays
   ↓
2. Display Status Cards
   ┌────────────────────────┐
   │ Wall Display 1         │
   │ 🟢 Online              │
   │ Now Playing:           │
   │ "BBC News HD"          │
   │ Last Seen: 1 min ago   │
   │ [Change Channel]       │
   │ [Edit] [Delete]        │
   └────────────────────────┘
   ↓
3. Click [Change Channel]
   ↓
4. Remote Control Modal
   - Select channel from playlist
   - [Switch Now] button
   ↓
5. Channel Changes Immediately
   - Display receives command via polling/websocket
   - Switches to new channel
   - Updates status
```

### D. Channel Scheduling (Admin)
```
1. Display Detail Page → Schedules Tab
   ↓
2. Schedule List (Empty)
   - [Add Schedule] button
   ↓
3. Create Schedule Form
   - Channel (dropdown from playlist)
   - Day of Week (dropdown: Mon-Sun, or "Every Day")
   - Start Time (time picker)
   - End Time (time picker)
   - Active (checkbox)
   - [Save] button
   ↓
4. Schedule Created
   - Appears in list
   - Example:
     "Morning Show" → Mon-Fri → 08:00-10:00
     "Lunch Music" → Every Day → 12:00-14:00
   ↓
5. Display Auto-switches
   - At 08:00 on Monday → Plays "Morning Show"
   - At 10:00 → Returns to default/next schedule
```

---

## Flow 3: Admin Management

### A. Admin Dashboard Overview
```
1. Admin Login → Admin Dashboard Home
   ↓
2. Dashboard Widgets:
   ┌──────────────────────────────────┐
   │ Statistics Cards:                │
   │ [Users: 150] [Playlists: 87]     │
   │ [Displays: 5] [Active: 4]        │
   ├──────────────────────────────────┤
   │ Quick Actions:                   │
   │ • Create User                    │
   │ • Add Display                    │
   │ • View Analytics                 │
   ├──────────────────────────────────┤
   │ Recent Activity:                 │
   │ • User john@example.com registered│
   │ • Display "Wall 1" offline 2h    │
   │ • 50 streams watched today       │
   └──────────────────────────────────┘
```

### B. User Management
```
1. Sidebar → Users
   ↓
2. Users List Page
   - Table with columns:
     * Email
     * Name
     * Role
     * Created
     * Last Login
     * Status (Active/Inactive)
     * Actions [Edit] [Delete]
   - Search bar
   - Filter by role
   - [Create User] button
   ↓
3. Click [Create User]
   ↓
4. Create User Form
   - Email
   - Temporary Password
   - Role (User/Admin)
   - First Name, Last Name
   - [Create] button
   ↓
5. User Created
   - Appears in list
   - Notification: "User created. Email sent."
```

### C. Playlist Management
```
1. Sidebar → Playlists
   ↓
2. All Playlists Page
   - List all playlists (all users)
   - Show: Name, Owner, URL, Status, Channels Count
   - Search/filter by user
   - [View] [Edit] [Delete] actions
   ↓
3. Click [View] on a playlist
   ↓
4. Playlist Detail Page
   - Playlist info
   - Channel list
   - Last fetched timestamp
   - [Refresh Channels] button
   - Usage stats (how many users/displays use it)
```

### D. Settings Management
```
1. Sidebar → Settings
   ↓
2. Settings Page (Tabs):
   
   TAB 1: General
   - App Name (text input)
   - Max Playlists per User (number)
   - Enable User Registration (toggle)
   - Session Timeout Days (number)
   - [Save Changes] button
   
   TAB 2: PWA Icon
   - Current icon preview
   - [Upload New Icon] button
   - Instructions: "Upload 512x512 PNG"
   - [Generate Icons] button (creates all sizes)
   
   TAB 3: Advanced
   - Database backup [Download] button
   - Clear cache [Clear] button
   - Export settings [Export] button
```

### E. Analytics Dashboard
```
1. Sidebar → Analytics
   ↓
2. Analytics Page
   
   ┌─────────────────────────────────┐
   │ Time Range: [Last 7 Days ▼]    │
   ├─────────────────────────────────┤
   │ Total Watch Time: 500 hours     │
   │ Unique Viewers: 120             │
   │ Total Streams: 3,400            │
   ├─────────────────────────────────┤
   │ Top Channels (Chart):           │
   │ 1. BBC News HD - 50h            │
   │ 2. Sports 1 - 35h               │
   │ 3. Music TV - 28h               │
   ├─────────────────────────────────┤
   │ Watch by Group (Pie Chart):     │
   │ News: 40%                       │
   │ Sports: 30%                     │
   │ Entertainment: 20%              │
   │ Other: 10%                      │
   ├─────────────────────────────────┤
   │ Display Uptime:                 │
   │ Wall Display 1: 99.2%           │
   │ Counter Display: 98.5%          │
   └─────────────────────────────────┘
```

---

## Flow 4: PWA Installation

### Mobile (iOS/Android)
```
1. Visit site on mobile browser
   ↓
2. Prompt appears: "Install Bake and Grill TV?"
   - Option 1: Click "Install" → App added to home screen
   - Option 2: Dismiss → Show banner at bottom
   ↓
3. Manual Install:
   - iOS: Safari → Share → Add to Home Screen
   - Android: Chrome → Menu → Add to Home Screen
   ↓
4. Launch from Home Screen
   - Opens in standalone mode (no browser UI)
   - Full screen experience
   - App icon on device
```

### Desktop (Chrome/Edge)
```
1. Visit site on desktop
   ↓
2. Install icon appears in address bar
   ↓
3. Click install icon → Prompt opens
   ↓
4. Click "Install"
   ↓
5. App opens in standalone window
   - Appears in Start Menu/Applications
   - Pin to taskbar
   - Runs like native app
```

---

## Flow 5: Error Handling

### Scenario A: M3U Fetch Fails
```
1. User adds playlist with invalid URL
   ↓
2. Backend attempts to fetch
   ↓
3. Fetch fails (404/timeout)
   ↓
4. Show error message:
   "Unable to fetch playlist. Please check the URL."
   - [Try Again] button
   - [Edit URL] button
```

### Scenario B: Stream Won't Play
```
1. User clicks channel
   ↓
2. Player attempts to load stream
   ↓
3. Stream fails (3 retry attempts)
   ↓
4. Show error in player:
   "Stream unavailable"
   - [Try Next Channel] button
   - [Report Issue] button
```

### Scenario C: Display Goes Offline
```
1. Display stops sending heartbeats
   ↓
2. Server marks display as "offline" after 5 minutes
   ↓
3. Admin sees red status indicator
   ↓
4. Admin investigates:
   - Check physical display
   - Check network connection
   - View error logs in admin panel
```

---

## Key Screens Summary

### Public
1. Landing Page
2. Login Page
3. Register Page

### User Dashboard
4. Main Dashboard (Playlist selector)
5. Player Page (with channel list)
6. Favorites Page
7. Watch History Page
8. User Settings/Profile

### Admin
9. Admin Dashboard Home
10. User Management
11. Playlist Management
12. Display Management
13. Display Detail (with schedules)
14. Analytics Dashboard
15. Settings Page

### Display
16. Kiosk Mode (full screen player)

---

## Navigation Structure

```
Public
├── / (Landing/Login)
├── /register
└── /forgot-password

Authenticated User
├── /dashboard
├── /player
├── /favorites
├── /history
└── /profile

Admin (Protected)
├── /admin/dashboard
├── /admin/users
├── /admin/playlists
├── /admin/displays
│   └── /admin/displays/:id
├── /admin/analytics
└── /admin/settings

Special
└── /?display=TOKEN (Kiosk Mode)
```

