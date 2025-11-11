# 🔐 Granular Permissions System - Implementation Plan

**Feature Request:** Admin can control exactly what features each user can access

---

## 📋 Requirements Summary

### **Admin Controls:**
1. ✅ Which features each user can access
2. ✅ Who can add playlists (admin only, or allow staff/user)
3. ✅ Who can manage displays
4. ✅ Set maximum number of displays per user
5. ✅ Enable/disable specific features per user
6. ✅ Assign admin's playlists to specific users

---

## 🎯 Permission Types

### **Feature Permissions:**
- `can_add_playlists` - Can add their own M3U playlists
- `can_edit_playlists` - Can edit playlists (own or assigned)
- `can_delete_playlists` - Can delete playlists
- `can_manage_displays` - Can create/edit displays
- `can_control_displays` - Can use remote control
- `can_create_users` - Can create user accounts
- `can_view_analytics` - Can view analytics dashboard
- `can_manage_schedules` - Can create channel schedules

### **Resource Limits:**
- `max_playlists` - Maximum playlists user can create (0 = unlimited, -1 = none)
- `max_displays` - Maximum displays user can manage
- `assigned_playlists` - Which playlists admin assigned to this user

---

## 🗄️ Database Changes

### **New Table: user_permissions**

```sql
CREATE TABLE IF NOT EXISTS user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  
  -- Feature permissions (boolean)
  can_add_playlists BOOLEAN DEFAULT FALSE,
  can_edit_playlists BOOLEAN DEFAULT FALSE,
  can_delete_playlists BOOLEAN DEFAULT FALSE,
  can_manage_displays BOOLEAN DEFAULT FALSE,
  can_control_displays BOOLEAN DEFAULT FALSE,
  can_create_users BOOLEAN DEFAULT FALSE,
  can_view_analytics BOOLEAN DEFAULT FALSE,
  can_manage_schedules BOOLEAN DEFAULT FALSE,
  
  -- Resource limits
  max_playlists INT DEFAULT 0,  -- 0 = unlimited, -1 = none
  max_displays INT DEFAULT 0,   -- 0 = unlimited, -1 = none
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_permission (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### **New Table: user_assigned_playlists**

```sql
CREATE TABLE IF NOT EXISTS user_assigned_playlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  playlist_id INT NOT NULL,
  assigned_by INT NOT NULL, -- Admin who assigned it
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_assignment (user_id, playlist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🔧 Implementation Steps

### **Phase 1: Backend (3-4 hours)**

#### 1.1 Database Schema (30 min)
- [ ] Create `user_permissions` table
- [ ] Create `user_assigned_playlists` table
- [ ] Add migration script
- [ ] Create default permissions for existing users

#### 1.2 Permission Middleware (1 hour)
- [ ] Create `checkPermission()` middleware
- [ ] Add permission checks to all routes
- [ ] Handle permission denied responses

#### 1.3 Permission API Routes (1 hour)
- [ ] `GET /api/permissions/:userId` - Get user permissions
- [ ] `PUT /api/permissions/:userId` - Update permissions (admin only)
- [ ] `GET /api/users/:userId/playlists` - Get assigned playlists
- [ ] `POST /api/users/:userId/assign-playlist` - Assign playlist (admin)
- [ ] `DELETE /api/users/:userId/unassign-playlist/:playlistId` - Remove assignment

#### 1.4 Update Existing Routes (1 hour)
- [ ] Playlists: Check `can_add_playlists` permission
- [ ] Displays: Check `can_manage_displays` permission
- [ ] Remote Control: Check `can_control_displays` permission
- [ ] Users: Check `can_create_users` permission
- [ ] Analytics: Check `can_view_analytics` permission

---

### **Phase 2: Frontend (3-4 hours)**

#### 2.1 Permission Management UI (2 hours)
- [ ] Create `PermissionManagement.jsx` component
- [ ] Permission toggle switches for each feature
- [ ] Resource limit inputs (max playlists, max displays)
- [ ] Playlist assignment interface
- [ ] Bulk permission templates (presets)

#### 2.2 Update User Management (1 hour)
- [ ] Add "Manage Permissions" button to each user
- [ ] Show permission summary in user list
- [ ] Quick permission toggles

#### 2.3 Update UI Based on Permissions (1 hour)
- [ ] Hide/show "Add Playlist" based on `can_add_playlists`
- [ ] Hide/show "Admin Panel" based on permissions
- [ ] Hide/show "Displays" menu based on `can_manage_displays`
- [ ] Show assigned playlists vs own playlists
- [ ] Display permission badges

---

### **Phase 3: Testing (1 hour)**

- [ ] Test admin creating users with different permissions
- [ ] Test user with only view access
- [ ] Test user with playlist permission
- [ ] Test user with display permission
- [ ] Test resource limits (max playlists)
- [ ] Test assigned playlists
- [ ] Test permission denied scenarios

---

## 🎨 Admin UI Mockup

### **User Management Page:**

```
┌─────────────────────────────────────────────────────────┐
│ User Management                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ john@example.com (Staff)                                │
│ [Edit] [Delete] [Manage Permissions] ← New!             │
│                                                          │
│ Permissions: 📋 Playlists, 🖥️ Displays (2/5)          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **Permission Management Modal:**

```
┌─────────────────────────────────────────────────────────┐
│ Manage Permissions: john@example.com                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📋 Playlist Permissions:                                │
│   ☑ Can add playlists                                   │
│   ☐ Can edit playlists                                  │
│   ☐ Can delete playlists                                │
│   Max playlists: [5] (0 = unlimited)                    │
│                                                          │
│ 🖥️ Display Permissions:                                 │
│   ☑ Can manage displays                                 │
│   ☑ Can control displays (remote)                       │
│   Max displays: [2] (0 = unlimited)                     │
│                                                          │
│ 👥 User Management:                                      │
│   ☐ Can create users                                    │
│                                                          │
│ 📊 Advanced:                                             │
│   ☐ Can view analytics                                  │
│   ☐ Can manage schedules                                │
│                                                          │
│ 🎯 Assigned Playlists:                                   │
│   ☑ Admin's Main Playlist (view only)                   │
│   ☐ Sports Channels (can edit)                          │
│                                                          │
│ [Save Permissions] [Cancel]                             │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 User Experience Examples

### **Example 1: Limited Staff**

**Admin gives staff:**
- ✅ Can view assigned playlists
- ✅ Can add 2 playlists max
- ❌ Cannot manage displays
- ❌ Cannot remote control

**Staff sees:**
- Dashboard with "Add Playlist" button
- Can only add 2 playlists
- No Display menu
- No Admin Panel button

---

### **Example 2: Display Manager Staff**

**Admin gives staff:**
- ❌ Cannot add playlists (uses admin's)
- ✅ Can manage displays (max 3)
- ✅ Can remote control displays
- ❌ Cannot create users

**Staff sees:**
- Admin's playlist (assigned)
- Display Management menu
- Remote control buttons
- Can create up to 3 displays

---

### **Example 3: View-Only User**

**Admin gives user:**
- ✅ Can watch assigned playlists
- ❌ Everything else disabled

**User sees:**
- Just the player
- Can watch channels
- Cannot add/edit anything

---

## ⏱️ Time Estimate

**Total Development Time:** 7-9 hours

**Breakdown:**
- Backend (database, API, middleware): 3-4 hours
- Frontend (UI components, permission checks): 3-4 hours
- Testing: 1 hour
- Documentation: 1 hour

---

## 🎯 Would You Like Me to Build This?

**Options:**

1. **"build now"** - I'll start implementing the full granular permission system
2. **"later"** - Document it for future, use current 3-role system for now
3. **"simpler"** - Create a simpler version with just a few key permissions

**This is a powerful feature that will give you complete control over user access!**

What would you like to do? 🚀
