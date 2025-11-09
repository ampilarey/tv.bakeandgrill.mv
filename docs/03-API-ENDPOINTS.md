# API Endpoints Documentation

Base URL: `/api`

All endpoints return JSON. Protected routes require JWT token in `Authorization: Bearer <token>` header.

---

## 🔓 Public Endpoints (No Auth Required)

### Health Check
```
GET /api/health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T10:30:00Z",
  "version": "1.0.0"
}
```

---

## 🔐 Authentication Endpoints

### Register New User
```
POST /api/auth/register
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```
**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login
```
POST /api/auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Display Login (Token-based)
```
POST /api/auth/display-login
```
**Body:**
```json
{
  "displayToken": "cafe-wall-1-token-xyz"
}
```
**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "display": {
    "id": 1,
    "name": "Wall Display 1",
    "assignedPlaylistId": 5,
    "currentChannelId": "channel-123"
  }
}
```

### Verify Token
```
GET /api/auth/verify
Headers: Authorization: Bearer <token>
```
**Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  }
}
```

---

## 👤 User Endpoints (Protected)

### Get Current User Profile
```
GET /api/users/me
Headers: Authorization: Bearer <token>
```
**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "createdAt": "2025-01-01T00:00:00Z",
  "lastLogin": "2025-11-09T10:00:00Z"
}
```

### Update Profile
```
PATCH /api/users/me
Headers: Authorization: Bearer <token>
```
**Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

### Change Password
```
POST /api/users/me/change-password
Headers: Authorization: Bearer <token>
```
**Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

---

## 📺 Playlist Endpoints (Protected)

### Get User's Playlists
```
GET /api/playlists
Headers: Authorization: Bearer <token>
```
**Response (200):**
```json
{
  "playlists": [
    {
      "id": 1,
      "name": "My Sports Channels",
      "m3uUrl": "https://example.com/sports.m3u",
      "description": "All sports content",
      "isActive": true,
      "createdAt": "2025-01-15T10:00:00Z",
      "lastFetched": "2025-11-09T09:00:00Z"
    }
  ]
}
```

### Add New Playlist
```
POST /api/playlists
Headers: Authorization: Bearer <token>
```
**Body:**
```json
{
  "name": "Entertainment",
  "m3uUrl": "https://example.com/entertainment.m3u",
  "description": "Movies and shows"
}
```
**Response (201):**
```json
{
  "success": true,
  "playlist": {
    "id": 2,
    "name": "Entertainment",
    "m3uUrl": "https://example.com/entertainment.m3u",
    "userId": 1
  }
}
```

### Update Playlist
```
PATCH /api/playlists/:id
Headers: Authorization: Bearer <token>
```
**Body:**
```json
{
  "name": "Updated Name",
  "isActive": false
}
```

### Delete Playlist
```
DELETE /api/playlists/:id
Headers: Authorization: Bearer <token>
```
**Response (200):**
```json
{
  "success": true,
  "message": "Playlist deleted"
}
```

---

## 📡 Channel Endpoints (Protected)

### Get Channels from Playlist
```
GET /api/playlists/:playlistId/channels
Headers: Authorization: Bearer <token>
Query Params:
  - search: string (optional)
  - group: string (optional)
  - sort: "name" | "group" (optional)
```
**Response (200):**
```json
{
  "channels": [
    {
      "id": "channel-hash-123",
      "name": "BBC News HD",
      "group": "News",
      "logo": "https://example.com/logo.png",
      "url": "https://stream.example.com/bbc.m3u8"
    }
  ],
  "groups": ["News", "Sports", "Entertainment"],
  "total": 150
}
```

### Get Single Channel
```
GET /api/channels/:channelId
Headers: Authorization: Bearer <token>
```

---

## ⭐ Favorites Endpoints (Protected)

### Get User's Favorites
```
GET /api/favorites
Headers: Authorization: Bearer <token>
Query Params:
  - playlistId: number (optional, filter by playlist)
```
**Response (200):**
```json
{
  "favorites": [
    {
      "id": 1,
      "channelId": "channel-hash-123",
      "channelName": "BBC News HD",
      "playlistId": 1,
      "createdAt": "2025-11-01T12:00:00Z"
    }
  ]
}
```

### Add to Favorites
```
POST /api/favorites
Headers: Authorization: Bearer <token>
```
**Body:**
```json
{
  "playlistId": 1,
  "channelId": "channel-hash-123",
  "channelName": "BBC News HD"
}
```

### Remove from Favorites
```
DELETE /api/favorites/:favoriteId
Headers: Authorization: Bearer <token>
```

### Export Favorites (JSON)
```
GET /api/favorites/export
Headers: Authorization: Bearer <token>
```
**Response:** JSON file download

### Import Favorites
```
POST /api/favorites/import
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
```
**Body:** Form data with `file` field (JSON file)

---

## 📊 Watch History Endpoints (Protected)

### Get Watch History
```
GET /api/history
Headers: Authorization: Bearer <token>
Query Params:
  - limit: number (default: 50)
  - offset: number (default: 0)
```
**Response (200):**
```json
{
  "history": [
    {
      "id": 1,
      "channelId": "channel-hash-123",
      "channelName": "BBC News HD",
      "playlistId": 1,
      "watchedAt": "2025-11-09T10:00:00Z",
      "durationSeconds": 1800
    }
  ],
  "total": 200
}
```

### Recently Watched (Last 10)
```
GET /api/history/recent
Headers: Authorization: Bearer <token>
```

### Log Watch Session
```
POST /api/history
Headers: Authorization: Bearer <token>
```
**Body:**
```json
{
  "playlistId": 1,
  "channelId": "channel-hash-123",
  "channelName": "BBC News HD",
  "durationSeconds": 1800
}
```

### Get Watch Analytics
```
GET /api/history/analytics
Headers: Authorization: Bearer <token>
```
**Response (200):**
```json
{
  "totalWatchTime": 86400,
  "mostWatchedChannels": [
    {
      "channelId": "channel-hash-123",
      "channelName": "BBC News HD",
      "totalSeconds": 10800,
      "viewCount": 15
    }
  ],
  "watchByGroup": {
    "News": 25000,
    "Sports": 18000
  }
}
```

---

## 🖥️ Display Endpoints (Admin Only)

### List All Displays
```
GET /api/displays
Headers: Authorization: Bearer <admin-token>
```
**Response (200):**
```json
{
  "displays": [
    {
      "id": 1,
      "name": "Wall Display 1",
      "location": "Main Cafe Wall",
      "token": "cafe-wall-1-xyz",
      "assignedPlaylistId": 5,
      "currentChannelId": "channel-123",
      "isActive": true,
      "lastSeen": "2025-11-09T10:25:00Z",
      "status": "online"
    }
  ]
}
```

### Create Display
```
POST /api/displays
Headers: Authorization: Bearer <admin-token>
```
**Body:**
```json
{
  "name": "Counter Display",
  "location": "Front Counter",
  "assignedPlaylistId": 5
}
```
**Response (201):**
```json
{
  "success": true,
  "display": {
    "id": 2,
    "name": "Counter Display",
    "token": "auto-generated-secure-token",
    "assignedPlaylistId": 5
  }
}
```

### Update Display
```
PATCH /api/displays/:id
Headers: Authorization: Bearer <admin-token>
```
**Body:**
```json
{
  "name": "Updated Name",
  "assignedPlaylistId": 3,
  "currentChannelId": "channel-456",
  "isActive": true
}
```

### Delete Display
```
DELETE /api/displays/:id
Headers: Authorization: Bearer <admin-token>
```

### Display Heartbeat (Display sends status)
```
POST /api/displays/:id/heartbeat
Headers: Authorization: Bearer <display-token>
```
**Body:**
```json
{
  "status": "online",
  "currentChannelId": "channel-123",
  "errorMessage": null
}
```

### Get Display Status
```
GET /api/displays/:id/status
Headers: Authorization: Bearer <admin-token>
```
**Response (200):**
```json
{
  "id": 1,
  "name": "Wall Display 1",
  "status": "online",
  "currentChannel": {
    "id": "channel-123",
    "name": "BBC News HD"
  },
  "lastSeen": "2025-11-09T10:25:00Z",
  "uptime": "5d 3h 22m"
}
```

### Remote Control Display (Change Channel)
```
POST /api/displays/:id/control
Headers: Authorization: Bearer <admin-token>
```
**Body:**
```json
{
  "action": "change_channel",
  "channelId": "channel-456"
}
```

---

## 📅 Display Schedule Endpoints (Admin Only)

### Get Display Schedules
```
GET /api/displays/:displayId/schedules
Headers: Authorization: Bearer <admin-token>
```

### Create Schedule
```
POST /api/displays/:displayId/schedules
Headers: Authorization: Bearer <admin-token>
```
**Body:**
```json
{
  "channelId": "channel-morning-show",
  "channelName": "Morning Brew Show",
  "dayOfWeek": 1,
  "startTime": "08:00:00",
  "endTime": "10:00:00"
}
```

### Update Schedule
```
PATCH /api/schedules/:scheduleId
Headers: Authorization: Bearer <admin-token>
```

### Delete Schedule
```
DELETE /api/schedules/:scheduleId
Headers: Authorization: Bearer <admin-token>
```

---

## ⚙️ Admin Settings Endpoints (Admin Only)

### Get All Settings
```
GET /api/settings
Headers: Authorization: Bearer <admin-token>
```
**Response (200):**
```json
{
  "settings": {
    "appName": "Bake and Grill TV",
    "pwaIconPath": "/uploads/custom-icon.png",
    "maxPlaylistsPerUser": 5,
    "enableUserRegistration": true,
    "sessionTimeoutDays": 7
  }
}
```

### Update Setting
```
PATCH /api/settings
Headers: Authorization: Bearer <admin-token>
```
**Body:**
```json
{
  "key": "appName",
  "value": "New App Name"
}
```

### Upload PWA Icon
```
POST /api/settings/pwa-icon
Headers: Authorization: Bearer <admin-token>
Content-Type: multipart/form-data
```
**Body:** Form data with `icon` field (image file)
**Response (200):**
```json
{
  "success": true,
  "iconPath": "/uploads/pwa-icon-1699999999.png"
}
```

---

## 👥 Admin User Management (Admin Only)

### List All Users
```
GET /api/admin/users
Headers: Authorization: Bearer <admin-token>
Query Params:
  - role: "admin" | "user" (optional)
  - limit: number
  - offset: number
```

### Create User
```
POST /api/admin/users
Headers: Authorization: Bearer <admin-token>
```
**Body:**
```json
{
  "email": "newuser@example.com",
  "password": "TempPass123!",
  "role": "user",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

### Update User
```
PATCH /api/admin/users/:userId
Headers: Authorization: Bearer <admin-token>
```
**Body:**
```json
{
  "role": "admin",
  "isActive": false
}
```

### Delete User
```
DELETE /api/admin/users/:userId
Headers: Authorization: Bearer <admin-token>
```

---

## 📊 Admin Analytics

### Get System Analytics
```
GET /api/admin/analytics
Headers: Authorization: Bearer <admin-token>
```
**Response (200):**
```json
{
  "totalUsers": 150,
  "totalPlaylists": 87,
  "totalDisplays": 5,
  "activeDisplays": 4,
  "totalWatchTime": 500000,
  "mostPopularChannels": [
    {
      "channelName": "BBC News HD",
      "viewCount": 1200,
      "totalSeconds": 50000
    }
  ]
}
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

**Common Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (no/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

**Error Codes:**
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_INSUFFICIENT_PERMISSIONS`
- `VALIDATION_ERROR`
- `RESOURCE_NOT_FOUND`
- `PLAYLIST_LIMIT_EXCEEDED`
- `M3U_FETCH_FAILED`
- `M3U_PARSE_ERROR`

