# 👥 User Roles & Permissions Guide
**Bake & Grill TV - Access Control System**

---

## 🎯 Three User Levels

Your IPTV platform now supports **3 user roles** with different permission levels:

1. **User** 👀 - View Only (Default)
2. **Staff** 📝 - Manage Own Content  
3. **Admin** 🔑 - Full Control

---

## 👀 **Level 1: User (View Only)**

### **What They Can Do:**
- ✅ Login to the platform
- ✅ Watch all available channels
- ✅ Browse playlists created by admin/staff
- ✅ Use video player (play, pause, volume, fullscreen)
- ✅ Add favorites
- ✅ View their own watch history
- ✅ Search and filter channels
- ✅ Use group filters

### **What They CANNOT Do:**
- ❌ Add or delete playlists
- ❌ Edit playlists
- ❌ Access admin panel
- ❌ Create other users
- ❌ Manage displays
- ❌ Remote control
- ❌ View analytics

### **Perfect For:**
- Cafe customers with guest accounts
- Staff who only need to watch TV
- Public viewing access
- Limited access accounts
- Kiosk/lobby displays (with login)

### **User Interface:**
- **Dashboard:** Shows "Available Playlists" (read-only)
- **No "Add Playlist" button**
- **No "Admin Panel" button**
- **Can click "Watch" on any playlist**
- **Full video player access**

---

## 📝 **Level 2: Staff (Manage Own Content)**

### **What They Can Do:**
- ✅ Everything "User" can do, PLUS:
- ✅ Add their own M3U playlists
- ✅ Edit their own playlists
- ✅ Delete their own playlists
- ✅ Manage their own favorites
- ✅ View their own watch history

### **What They CANNOT Do:**
- ❌ Access admin panel
- ❌ Create/delete other users
- ❌ Manage cafe displays
- ❌ Remote control displays
- ❌ View other users' private playlists
- ❌ Delete other users' content
- ❌ View analytics

### **Perfect For:**
- Cafe staff who want personal channel collections
- Employees with different content preferences
- Multiple content managers
- Department-specific playlists

### **User Interface:**
- **Dashboard:** Shows "Your Playlists"
- ✅ **"Add Playlist" button visible**
- ❌ **No "Admin Panel" button**
- **Can manage only their own playlists**

---

## 🔑 **Level 3: Admin (Full Control)**

### **What They Can Do:**
- ✅ Everything Staff can do, PLUS:
- ✅ **User Management:**
  - Create new users (admin/staff/user roles)
  - Edit any user
  - Delete users
  - Activate/deactivate accounts
  
- ✅ **Display Management:**
  - Create cafe display screens
  - Generate display tokens
  - View display status (online/offline)
  - Monitor heartbeats
  
- ✅ **Remote Control:**
  - Change channels on any display
  - Adjust volume
  - Mute/unmute
  - Real-time control (1-2 second response)
  
- ✅ **System Management:**
  - View analytics
  - Manage schedules
  - Configure settings
  - Access all features

### **Perfect For:**
- Cafe owner/manager
- IT administrator
- System administrator
- Primary account

### **User Interface:**
- **Dashboard:** Shows "Your Playlists"
- ✅ **"Add Playlist" button**
- ✅ **"Admin Panel" button**
- **Full access to all features**

---

## 📊 **Permission Matrix**

| Feature | User | Staff | Admin |
|---------|------|-------|-------|
| **Login** | ✅ | ✅ | ✅ |
| **Watch Channels** | ✅ | ✅ | ✅ |
| **Browse Playlists** | ✅ | ✅ | ✅ |
| **Video Player** | ✅ | ✅ | ✅ |
| **Add Favorites** | ✅ | ✅ | ✅ |
| **View Own History** | ✅ | ✅ | ✅ |
| **Add Playlists** | ❌ | ✅ Own | ✅ All |
| **Edit Playlists** | ❌ | ✅ Own | ✅ All |
| **Delete Playlists** | ❌ | ✅ Own | ✅ All |
| **Admin Panel** | ❌ | ❌ | ✅ |
| **User Management** | ❌ | ❌ | ✅ |
| **Display Management** | ❌ | ❌ | ✅ |
| **Remote Control** | ❌ | ❌ | ✅ |
| **Analytics** | ❌ | ❌ | ✅ |
| **Schedules** | ❌ | ❌ | ✅ |
| **Settings** | ❌ | ❌ | ✅ |

---

## 🏢 **Cafe Use Cases**

### **Scenario 1: Simple Cafe (Most Common)**

```
1 Admin Account (Owner)
├── Manages M3U playlist with news, music, sports
├── Controls cafe wall displays
├── Manages volume and channels remotely
└── No additional users needed
```

**Best Setup:**
- Just use the admin account
- No need for staff or user accounts
- Displays run in kiosk mode (no login)

---

### **Scenario 2: Multi-Staff Cafe**

```
1 Admin Account (Owner)
├── Main cafe playlist
├── Manages displays
└── Creates user accounts

3 Staff Accounts (Employees)
├── Staff 1: Sports channels playlist
├── Staff 2: Cooking shows playlist
└── Staff 3: News channels playlist
(Each manages their own, watches during breaks)
```

**Best Setup:**
- Admin controls cafe displays
- Staff have personal accounts for breaks
- Each staff member has their own favorites

---

### **Scenario 3: Customer Access**

```
1 Admin Account (Owner)
├── Main cafe playlist
├── Manages displays
└── Creates accounts

5 User Accounts (Customers)
├── customer1@bakegrill.com
├── customer2@bakegrill.com  
├── VIP customer accounts
└── Can watch but not modify
```

**Best Setup:**
- Create "user" role accounts for VIP customers
- Customers can watch from their phones/tablets
- Cannot modify playlists or settings

---

## 👥 **Creating Users (Admin Only)**

### **In Admin Panel:**

1. Click **"User Management"**
2. Click **"Create User"**
3. **Fill in form:**

**For View-Only User:**
```
Email: customer@example.com
Password: [generate strong password]
Role: User (View Only)  ← Select this
First Name: John
Last Name: Doe
```

**For Staff Member:**
```
Email: staff@bakegrill.com
Password: [generate strong password]
Role: Staff (Manage Own Content)
First Name: Jane
Last Name: Smith
```

**For Another Admin:**
```
Email: manager@bakegrill.com
Password: [generate strong password]
Role: Admin (Full Access)
First Name: Bob
Last Name: Wilson
```

4. Click **"Create User"**
5. Share credentials with the person

---

## 🔐 **Security & Best Practices**

### **Password Requirements**
- Minimum 8 characters recommended
- Use strong passwords for admin accounts
- Can use simpler passwords for view-only users

### **Account Management**
- Deactivate accounts when staff leaves
- Change admin password regularly
- Don't share admin credentials
- Create separate accounts for each person

### **Role Assignment**
- **Default:** New users get "user" role (safest)
- **Promote carefully:** Only give admin to trusted people
- **Demote if needed:** Can change role later in User Management

---

## 📱 **User Experience by Role**

### **User Logs In:**
```
1. Login page
2. Dashboard showing available playlists
3. Click "Watch" → Video player
4. That's it! Simple and clean
```

**What they see:**
- ✅ Watch button
- ❌ No Add Playlist button
- ❌ No Admin Panel button
- ❌ No edit/delete buttons

---

### **Staff Logs In:**
```
1. Login page
2. Dashboard with "Add Playlist" button
3. Can add their own M3U URLs
4. Watch their own or others' public playlists
```

**What they see:**
- ✅ Add Playlist button
- ✅ Edit/delete their own playlists
- ❌ No Admin Panel button
- ❌ Cannot edit others' playlists

---

### **Admin Logs In:**
```
1. Login page
2. Dashboard with full controls
3. Admin Panel button visible
4. Can access all admin features
```

**What they see:**
- ✅ Everything!
- ✅ Admin Panel button
- ✅ User Management
- ✅ Display Management
- ✅ Remote Control

---

## 🎯 **Recommendations**

### **For Cafe Owner (You):**
- Use **Admin** role
- Only create additional admins for trusted managers
- Use **User** role for customer access (if offering)
- Use **Staff** role for employees who need personal playlists

### **Security:**
- Keep admin accounts to minimum (1-2)
- Most accounts should be "user" or "staff"
- Regularly review user list
- Deactivate unused accounts

### **Best Practice:**
```
Cafe Setup:
├── 1 Admin (Owner)
├── 0-2 Admins (Managers, if needed)
├── 0-5 Staff (Employees with personal playlists)
└── 0-∞ Users (Customers, view-only)

Cafe Displays:
└── Use kiosk mode (no login needed)
    Display URL with token
```

---

## 🔄 **Changing User Roles**

**As Admin, you can change anyone's role:**

1. Go to **Admin Panel** → **User Management**
2. Find the user
3. Click **"Edit"** (or equivalent)
4. Change **Role** dropdown
5. Click **"Save"**

**Role changes take effect immediately** (user needs to logout/login)

---

## 📋 **Summary**

**3 Levels:**
1. **User:** Watch only 👀
2. **Staff:** Watch + manage own playlists 📝
3. **Admin:** Full system control 🔑

**Default:** New users get "User" role (safest)

**Admin Panel:** Only visible to admins

**Displays:** Only admins can manage/control

---

## 🎉 **You Now Have:**

✅ **3-tier permission system**  
✅ **Flexible access control**  
✅ **Secure role-based authentication**  
✅ **Perfect for cafe + customers**  

**Create users at:** https://tv.bakeandgrill.mv/admin/users

---

**Updated:** November 10, 2025  
**Roles:** Admin, Staff, User  
**Status:** ✅ Live in Production

