# 🔑 User Permissions Guide

## All Available Permissions

### 📋 Playlist Permissions

| Permission | What It Does | Where User Sees It | Status |
|-----------|--------------|-------------------|---------|
| `can_add_playlists` | Create new M3U playlists | Dashboard → "Add Playlist" button appears | ✅ Working |
| `can_edit_own_playlists` | Edit their own playlists | Playlist cards → Edit/Delete buttons | ✅ Working |
| `can_delete_own_playlists` | Delete their own playlists | Playlist cards → Delete button | ✅ Working |
| `max_playlists` | Maximum playlists allowed | Limits number of playlists user can create | ✅ Working |

**Current Implementation:**
- Dashboard page already checks `can_add_playlists` permission (line 132-145)
- "Add Playlist" button only shows if user has permission
- Max playlists counter appears on the button

### 🖥️ Display Permissions

| Permission | What It Does | Where User Sees It | Status |
|-----------|--------------|-------------------|---------|
| `can_manage_displays` | Create, pair, delete displays | Mobile: BottomNav & Hamburger Menu → "Displays"<br>Desktop: Dashboard → "Displays" button | ✅ JUST FIXED |
| `can_control_displays` | Control displays remotely (change channel, volume) | Same as above - access to Display Management page | ✅ JUST FIXED |
| `max_displays` | Maximum displays allowed | Limits number of displays user can create | ✅ Working (backend) |

**Current Implementation:**
- `/admin/displays` route now uses `DisplayRoute` (checks permissions)
- Displays button/menu item appears for users with permissions
- Users can pair and control displays

### 👥 User Management Permission

| Permission | What It Does | Where User Sees It | Status |
|-----------|--------------|-------------------|---------|
| `can_create_users` | Create new user accounts | Need to add: User Management access for non-admins | ⚠️ Backend only |

**Recommendation:** Currently User Management is admin-only. Should we allow staff to create users if they have this permission?

### 📊 Analytics Permission

| Permission | What It Does | Where User Sees It | Status |
|-----------|--------------|-------------------|---------|
| `can_view_analytics` | View usage statistics and reports | Need to add: Analytics page access for non-admins | ⚠️ Backend only |

**Recommendation:** Add Analytics button to navigation for users with this permission.

### 📅 Schedule Permission

| Permission | What It Does | Where User Sees It | Status |
|-----------|--------------|-------------------|---------|
| `can_manage_schedules` | Create time-based channel schedules | Need to add: Schedule management UI | ⚠️ Backend only |

**Current Status:** The permission exists but schedule UI is only in the DisplayManagement remote control.

---

## 🎯 How Users Access Features After Being Granted Permissions

### Current Working Flow:

**1. Playlist Permissions (`can_add_playlists`)**
- ✅ User logs in → Dashboard
- ✅ "Add Playlist" button appears automatically
- ✅ Can create playlists up to their limit

**2. Display Permissions (`can_manage_displays`, `can_control_displays`)**
- ✅ User logs in → Dashboard
- ✅ **Desktop:** "Displays" button in header
- ✅ **Mobile:** "🖥️ Displays" in bottom nav bar
- ✅ **Mobile:** "🖥️ Displays" in hamburger menu (☰)
- ✅ Click → Access Display Management page
- ✅ Can pair displays, control remotely

---

## 🚧 Permissions That Need UI Implementation

### 1. Analytics Access (`can_view_analytics`)

**Recommended Implementation:**
- Add Analytics route that checks permission OR admin
- Show "📊 Analytics" in MobileMenu and BottomNav
- Add button to Dashboard header

### 2. User Creation (`can_create_users`)

**Recommended Implementation:**
- Allow access to User Management for users with this permission
- Limit them to creating users only (not editing permissions)
- Show "👥 Users" in navigation

### 3. Schedule Management (`can_manage_schedules`)

**Current State:**
- Schedules can be managed from Display remote control
- Could add dedicated Schedules page

---

## 📝 Testing Checklist

To test if a permission is working:

1. **Admin:** Grant permission to a staff user
2. **User:** Refresh browser (F5) or log out/in
3. **Check:** Look for new buttons/menu items
4. **Console:** Open browser console - see permission logs
5. **Access:** Click the button - should load the feature

---

## 🔧 Quick Reference: Where Permissions Are Checked

**Frontend:**
- `DashboardPage.jsx` - checks `can_add_playlists`
- `DisplayManagement.jsx` - checks `can_manage_displays` OR `can_control_displays`
- `BottomNav.jsx` - shows Displays icon for display permissions
- `MobileMenu.jsx` - shows Displays menu item for display permissions
- `App.jsx` - `DisplayRoute` allows access to `/admin/displays`

**Backend:**
- `server/middleware/permissions.js` - `checkPermission()` middleware
- `server/routes/displays.js` - checks permissions on all endpoints
- `server/routes/playlists.js` - checks permissions on create/edit/delete

