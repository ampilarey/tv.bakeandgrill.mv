# User Flows & Scenarios

## 🎭 User Personas

### 1. **Sarah - Cafe Customer**
Regular customer who wants to watch content while at home

### 2. **Mike - Cafe Manager (Admin)**
Manages all displays in the cafe, controls what content plays

### 3. **Display Device - Wall Screen**
Automated display running 24/7 in the cafe

---

## 📱 User Flow #1: New User Registration & First Playlist

### Scenario: Sarah discovers Bake & Grill TV

**Steps:**

1. **Landing Page**
   - Sarah visits `https://iptv.bakegrillcafe.com`
   - Sees branded landing page with app description
   - Clicks "Get Started" or "Sign Up"

2. **Registration**
   - Enters email: `sarah@email.com`
   - Creates password: `********`
   - Clicks "Register"
   - System validates email format & password strength
   - Account created, auto-logged in with JWT token

3. **Dashboard (Empty State)**
   - Sees welcome message: "Welcome to Bake & Grill TV!"
   - Empty state illustration
   - Large "Add Your First Playlist" button

4. **Add Playlist**
   - Clicks "Add Playlist"
   - Modal/form appears
   - Enters:
     - Name: "My IPTV Channels"
     - M3U URL: `https://example.com/playlist.m3u`
     - Description (optional)
   - Clicks "Add Playlist"

5. **Playlist Loading**
   - System fetches M3U URL
   - Parses channels (150 channels found)
   - Success message: "Playlist added successfully!"

6. **Channel List Appears**
   - Redirected to Player page
   - Sidebar shows all 150 channels
   - First channel auto-plays in player
   - Sarah starts watching!

**Success Criteria:** User goes from zero to watching content in < 2 minutes

---

## 🖥️ User Flow #2: Admin Setting Up Cafe Display

### Scenario: Mike sets up a new TV screen in the cafe

**Steps:**

1. **Admin Login**
   - Mike visits `https://iptv.bakegrillcafe.com`
   - Logs in with admin credentials
   - Dashboard shows admin navigation

2. **Navigate to Displays**
   - Clicks "Displays" in admin menu
   - Sees list of existing displays:
     - Wall Display 1 (Online)
     - Counter Display (Online)
     - Window Display (Offline)

3. **Create New Display**
   - Clicks "Add New Display"
   - Form appears:
     - Name: "Kitchen Display"
     - Location: "Kitchen Area - Back Wall"
     - Assign Playlist: [Dropdown] → Selects "Cafe Promo Content"
     - Volume: 30%
     - Auto-play: ✓
     - Auto-reconnect: ✓
   - Clicks "Create Display"

4. **Get Display URL**
   - Success message appears
   - Display token generated: `k7h3j9d2-a4f6-8910-bcde-fg9876543210`
   - Display URL shown:
     ```
     https://iptv.bakegrillcafe.com?display=k7h3j9d2-a4f6-8910-bcde-fg9876543210
     ```
   - "Copy URL" button
   - QR Code displayed (for mobile setup)

5. **Configure Physical Display**
   - Mike goes to the TV in the kitchen
   - Opens Chrome browser
   - Pastes the display URL
   - Presses F11 for fullscreen
   - Video starts playing automatically
   - No controls visible (display mode)

6. **Verify in Admin Dashboard**
   - Mike returns to admin panel
   - Sees "Kitchen Display" status change to "Online"
   - Current channel playing: "Bake & Grill Promo"
   - Last heartbeat: 5 seconds ago

**Success Criteria:** Display is online and playing content within 5 minutes

---

## 🔄 User Flow #3: Regular User Watching Content

### Scenario: Sarah watches her favorite channels

**Steps:**

1. **Login**
   - Sarah opens `https://iptv.bakegrillcafe.com`
   - Enters credentials, logs in
   - Redirected to Player page (remembers last playlist)

2. **Browse Channels**
   - Sees 150 channels in sidebar
   - Scrolls through list
   - Uses search: types "BBC"
   - Results filter instantly to BBC channels

3. **Filter by Group**
   - Clicks "Group Filter" dropdown
   - Selects "News"
   - Channel list filters to 25 news channels
   - Counter shows "25 channels"

4. **Play Channel**
   - Clicks "CNN International"
   - Video player loads stream
   - Loading spinner appears briefly
   - Stream starts playing
   - Channel info displays: "CNN International - News"

5. **Add to Favorites**
   - Clicks star icon ⭐ next to channel name
   - Star turns yellow (filled)
   - Toast notification: "Added to favorites"

6. **Use Player Controls**
   - Adjusts volume slider to 70%
   - Clicks fullscreen button
   - Video goes fullscreen
   - Mouse movement shows/hides controls
   - Presses ESC to exit fullscreen

7. **Keyboard Shortcuts**
   - Presses `Space` to pause
   - Presses `Space` again to play
   - Presses `→` to skip to next channel
   - Presses `F` to toggle fullscreen

8. **Recently Watched**
   - Scrolls to "Recently Watched" section in sidebar
   - Sees last 10 channels watched
   - Clicks previous channel to resume

9. **Switch Playlist**
   - Clicks playlist dropdown (top of sidebar)
   - Selects different playlist: "Sports Channels"
   - Channel list updates with new channels
   - Favorites section now shows favorites from Sports playlist

10. **Export Favorites**
    - Opens Settings/Profile
    - Clicks "Export Favorites"
    - Downloads `favorites-2025-11-09.json` file
    - Can import later or on different device

**Success Criteria:** Smooth, intuitive watching experience

---

## 🖥️ User Flow #4: Display Mode 24/7 Operation

### Scenario: Wall Display operates autonomously

**Steps:**

1. **Initial Load**
   - Display browser navigates to:
     ```
     ?display=a1b2c3d4-e5f6-7890-abcd-ef1234567890
     ```
   - Token extracted from URL parameter
   - Sent to `/api/displays/verify`

2. **Authentication**
   - Backend validates token
   - Returns display configuration:
     - Assigned Playlist: "Cafe Morning Content"
     - Assigned Channel: "Welcome Video" (loops)
     - Config: { volume: 0.5, auto_play: true }

3. **Auto-Play**
   - Display mode UI loads (minimal interface)
   - Video player auto-starts "Welcome Video"
   - Fullscreen mode enabled
   - No user controls visible

4. **Heartbeat Loop**
   - Every 60 seconds:
     - Send POST `/api/displays/heartbeat`
     - Include: token, status: "online", current_channel_id
     - Receive: { commands: [] }
   - Admin dashboard shows "Online" status

5. **Stream Failure Scenario**
   - Stream disconnects at 10:00 AM
   - Auto-retry mechanism kicks in:
     - Attempt 1: Wait 30s, retry → Fails
     - Attempt 2: Wait 30s, retry → Fails
     - Attempt 3: Wait 30s, retry → Success!
   - Stream resumes, no admin intervention needed
   - Failure logged to server

6. **Schedule Change**
   - At 12:00 PM (noon):
   - Server checks display_schedules table
   - Finds rule: "12:00-14:00 → Lunch Menu Playlist"
   - Next heartbeat response includes:
     ```json
     { "commands": [{ "action": "switch_playlist", "playlist_id": 5 }] }
     ```
   - Display switches to lunch content automatically

7. **Remote Control from Admin**
   - At 3:00 PM, Mike (admin) wants to change content
   - Opens admin dashboard
   - Clicks "Wall Display 1"
   - Clicks "Change Channel"
   - Selects "Special Promotion Video"
   - Clicks "Apply"
   - Command queued
   - Next heartbeat delivers command
   - Display switches to promotion video

8. **Network Interruption**
   - Wi-Fi drops at 5:00 PM
   - Display status: "Offline"
   - Heartbeat fails
   - Wi-Fi reconnects at 5:10 PM
   - Display auto-reloads page
   - Re-authenticates with token
   - Resumes playback
   - Status: "Online" again

**Success Criteria:** Display operates 24/7 with minimal human intervention

---

## 👨‍💼 User Flow #5: Admin Managing Users & Content

### Scenario: Mike performs daily admin tasks

**Steps:**

1. **Dashboard Overview**
   - Mike logs in as admin
   - Dashboard shows statistics:
     - 45 Users
     - 78 Playlists
     - 5 Displays (4 Online, 1 Offline)
     - 1,248 Watch Hours (last 7 days)

2. **Monitor Displays**
   - Clicks "Display Monitor"
   - Grid view of all displays:
     - **Wall Display 1**: ✅ Online | Playing: "BBC News"
     - **Counter Display**: ✅ Online | Playing: "Cooking Show"
     - **Window Display**: ❌ Offline | Last seen: 2 hours ago
     - **Kitchen Display**: ✅ Online | Playing: "Promo Video"
     - **Entrance Display**: ✅ Online | Playing: "Welcome Loop"
   - Clicks "Window Display"
   - Details modal:
     - Status: Offline
     - Last heartbeat: 2:45 PM
     - Error: "Connection timeout"
     - Actions: [Restart] [Regenerate Token] [Delete]
   - Mike notes to check physical device

3. **User Management**
   - Clicks "Users"
   - Table of all users:
     - sarah@email.com | User | Last login: 1 day ago
     - john@email.com | User | Last login: 10 minutes ago
     - manager@bakegrillcafe.com | Admin | Last login: Now
   - Search: types "sarah"
   - Filters to Sarah's account
   - Clicks "Edit"
   - Can change:
     - Role (User ↔ Admin)
     - Reset password
     - Delete account
   - Mike verifies info, closes modal

4. **Create New User**
   - Clicks "Add User"
   - Form:
     - Email: `staff@bakegrillcafe.com`
     - Temporary Password: `Welcome123`
     - Role: User
   - Clicks "Create"
   - Success: "User created. They can login with provided password."

5. **Playlist Overview**
   - Clicks "All Playlists"
   - Sees playlists from all users
   - Can filter by user
   - Can view which playlists are assigned to displays
   - Identifies unused playlists for cleanup

6. **Change PWA Icon**
   - Clicks "Settings"
   - Scrolls to "PWA Icon"
   - Current icon displayed (512x512 px)
   - Clicks "Upload New Icon"
   - Selects custom logo file
   - Progress bar shows upload
   - Success: "Icon updated! Users will see new icon on next app install."

7. **View Analytics**
   - Clicks "Analytics"
   - Charts show:
     - Most watched channels (last 7 days)
     - Active users by day
     - Display uptime percentage
     - Peak viewing hours
   - Identifies popular content for scheduling

**Success Criteria:** Admin has full visibility and control

---

## 📲 User Flow #6: Mobile PWA Installation

### Scenario: Sarah installs app on her iPhone

**Steps:**

1. **Visit on Mobile**
   - Sarah opens Safari on iPhone
   - Navigates to `https://iptv.bakegrillcafe.com`
   - Logs in

2. **Install Prompt**
   - Banner appears: "Install Bake & Grill TV app"
   - Clicks "Install"
   - (iOS) Instructions: "Tap Share → Add to Home Screen"

3. **Add to Home Screen**
   - Taps Safari Share button
   - Scrolls to "Add to Home Screen"
   - App icon shown with name "Bake & Grill TV"
   - Taps "Add"

4. **App Installed**
   - Icon appears on home screen
   - Custom app icon (warm amber/orange colors)
   - Sarah taps icon

5. **Standalone Experience**
   - App opens fullscreen (no Safari UI)
   - Looks like native app
   - Status bar matches app theme color
   - Splash screen shows briefly

6. **Offline Access (Future)**
   - Sarah opens app while offline
   - Offline page displays: "No connection. Favorites and settings cached."
   - Can view favorites list
   - Can't play streams (requires connection)

**Success Criteria:** App feels native, easy to install

---

## 🔄 User Flow #7: Stream Failure & Recovery

### Scenario: Channel stream goes offline mid-playback

**Steps:**

1. **Normal Playback**
   - Sarah watching "Sky Sports"
   - Stream playing smoothly

2. **Stream Fails**
   - External M3U source goes down
   - Video player detects error
   - Displays: "Connection lost. Retrying..."

3. **Auto-Retry Sequence**
   - **Attempt 1** (0 seconds):
     - Try to reconnect immediately
     - Loading spinner shows
     - Status: "Reconnecting (1/3)..."
     - Fails
   
   - **Attempt 2** (5 seconds later):
     - Try again
     - Status: "Reconnecting (2/3)..."
     - Fails
   
   - **Attempt 3** (10 seconds later):
     - Try again
     - Status: "Reconnecting (3/3)..."
     - Fails

4. **Error State**
   - After 3 attempts failed:
   - Error message: "Unable to play this channel. The stream may be offline."
   - Buttons:
     - [Try Again] - Manual retry
     - [Next Channel] - Skip to next
     - [Report Issue] - Send feedback (future)

5. **Manual Retry**
   - Sarah clicks "Try Again"
   - Stream tries again → Success!
   - Playback resumes
   - No data lost, smooth recovery

6. **Alternative: Skip**
   - Or Sarah clicks "Next Channel"
   - Player loads next channel in list
   - New stream plays successfully

**Success Criteria:** User never stuck, always has options

---

## 🎯 User Flow #8: Using Keyboard Shortcuts

### Scenario: Power user discovers shortcuts

**Steps:**

1. **Help Overlay**
   - Sarah presses `?` key
   - Modal appears: "Keyboard Shortcuts"
   - Lists all shortcuts:
     - `Space` - Play/Pause
     - `F` - Fullscreen
     - `M` - Mute
     - `↑/↓` - Volume
     - `←/→` - Prev/Next Channel
     - `Ctrl+K` - Search
     - `?` - Show this help

2. **Using Shortcuts**
   - Sarah presses `Space` → Video pauses
   - Presses `Space` → Video resumes
   - Presses `F` → Fullscreen mode
   - Presses `↑` 3 times → Volume increases by 30%
   - Presses `→` → Next channel loads

3. **Search Shortcut**
   - Presses `Ctrl+K` (or `Cmd+K` on Mac)
   - Search box auto-focuses
   - Types channel name
   - Presses Enter to select first result

**Success Criteria:** Efficient navigation without mouse

---

## 📊 User Flow #9: Admin Viewing Analytics

### Scenario: Mike reviews weekly performance

**Steps:**

1. **Analytics Dashboard**
   - Mike navigates to Admin → Analytics
   - Date range selector: "Last 7 Days"

2. **Key Metrics Cards**
   - **Total Watch Time**: 1,248 hours
   - **Active Users**: 32/45 (71%)
   - **Display Uptime**: 98.5%
   - **Most Popular Channel**: BBC News (423 views)

3. **Charts**
   - **Line Chart**: Views per day
   - **Bar Chart**: Top 10 channels
   - **Pie Chart**: Views by category (News 40%, Sports 30%, Entertainment 30%)
   - **Heatmap**: Peak hours (highest: 7-9 PM)

4. **Display Health**
   - Table: Display uptime percentages
   - Wall Display 1: 99.8% (excellent)
   - Window Display: 85.2% (check hardware)

5. **User Activity**
   - Top users by watch time
   - New registrations this week
   - Inactive users (>30 days)

6. **Actionable Insights**
   - "Schedule popular content during peak hours (7-9 PM)"
   - "Check Window Display - frequent disconnections"
   - "Consider adding more Sports channels (high demand)"

**Success Criteria:** Data-driven decision making

---

## 🔒 User Flow #10: Security Scenarios

### Scenario A: Unauthorized Access Attempt
1. Attacker tries to access `/admin` without token
2. Middleware checks JWT
3. No valid token found
4. Redirected to login page
5. Access denied

### Scenario B: Expired Token
1. Sarah logged in 25 hours ago (token expired after 24h)
2. Makes API request
3. Server returns 401 Unauthorized
4. Frontend detects expired token
5. Redirects to login
6. Sarah logs in again
7. New token issued

### Scenario C: Display Token Leaked
1. Mike notices unauthorized device using display token
2. Goes to Admin → Displays
3. Finds compromised display
4. Clicks "Regenerate Token"
5. Old token invalidated
6. New token generated
7. Mike updates physical display with new URL
8. Unauthorized device can no longer access

**Success Criteria:** Security measures protect system

---

## 📋 Summary: All Critical Paths Covered

✅ New user onboarding  
✅ Admin display setup  
✅ Regular viewing experience  
✅ 24/7 display operation  
✅ Admin management tasks  
✅ Mobile PWA installation  
✅ Error handling & recovery  
✅ Keyboard shortcuts  
✅ Analytics & monitoring  
✅ Security scenarios  

---

**Next:** UI/UX Design Documentation

