# API Endpoints Documentation

## 🌐 Base URL
```
Development: http://localhost:4000/api
Production:  https://iptv.bakegrillcafe.com/api
```

## 🔐 Authentication
Most endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

---

## 📍 Endpoint Categories

1. [Authentication](#authentication-endpoints)
2. [Playlists](#playlist-endpoints)
3. [Channels](#channel-endpoints)
4. [Favorites](#favorite-endpoints)
5. [Watch History](#watch-history-endpoints)
6. [Displays](#display-endpoints)
7. [Admin](#admin-endpoints)
8. [Settings](#settings-endpoints)
9. [Health](#health-endpoints)

---

## Authentication Endpoints

### `POST /api/auth/register`
Register a new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Email already exists
- `400` - Invalid email format
- `400` - Password too weak (min 6 chars)
- `403` - Registration disabled by admin

---

### `POST /api/auth/login`
Login existing user

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
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

**Errors:**
- `401` - Invalid credentials
- `404` - User not found

---

### `GET /api/auth/verify`
Verify JWT token validity

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Errors:**
- `401` - Invalid or expired token

---

## Playlist Endpoints

### `GET /api/playlists`
Get all playlists for logged-in user

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "playlists": [
    {
      "id": 1,
      "name": "My IPTV Channels",
      "m3u_url": "https://example.com/playlist.m3u",
      "description": "Main playlist",
      "created_at": "2025-11-09T10:00:00Z",
      "last_fetched": "2025-11-09T11:00:00Z"
    }
  ]
}
```

---

### `POST /api/playlists`
Create new playlist

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "My Channels",
  "m3u_url": "https://example.com/playlist.m3u",
  "description": "Optional description"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Playlist created successfully",
  "playlist": {
    "id": 2,
    "name": "My Channels",
    "m3u_url": "https://example.com/playlist.m3u",
    "description": "Optional description"
  }
}
```

**Errors:**
- `400` - Invalid M3U URL
- `400` - Playlist limit reached
- `400` - Name required

---

### `PUT /api/playlists/:id`
Update existing playlist

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Updated Name",
  "m3u_url": "https://example.com/new-playlist.m3u",
  "description": "Updated description"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Playlist updated successfully",
  "playlist": { /* updated playlist */ }
}
```

**Errors:**
- `404` - Playlist not found
- `403` - Not authorized (not owner)

---

### `DELETE /api/playlists/:id`
Delete playlist (soft delete)

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Playlist deleted successfully"
}
```

---

## Channel Endpoints

### `POST /api/channels`
Fetch and parse M3U playlist

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "playlist_id": 1
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "channels": [
    {
      "id": "ch_abc123",
      "name": "BBC News",
      "group": "News",
      "logo": "https://example.com/logos/bbc.png",
      "url": "https://stream.example.com/bbc.m3u8"
    },
    {
      "id": "ch_def456",
      "name": "CNN International",
      "group": "News",
      "logo": "https://example.com/logos/cnn.png",
      "url": "https://stream.example.com/cnn.m3u8"
    }
  ],
  "groups": ["News", "Sports", "Entertainment"],
  "total": 150
}
```

**Caching:**
- Results cached for 5 minutes per playlist
- Forces refresh if cache expired

**Errors:**
- `400` - Invalid playlist ID
- `403` - Not authorized to access this playlist
- `500` - Failed to fetch M3U URL
- `500` - Failed to parse M3U

---

### `GET /api/channels/groups/:playlist_id`
Get all groups/categories from a playlist

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "groups": [
    { "name": "News", "count": 25 },
    { "name": "Sports", "count": 40 },
    { "name": "Movies", "count": 85 }
  ]
}
```

---

## Favorite Endpoints

### `GET /api/favorites`
Get all favorites for user

**Headers:** `Authorization: Bearer <token>`

**Query Params:** `?playlist_id=1` (optional)

**Response:** `200 OK`
```json
{
  "success": true,
  "favorites": [
    {
      "id": 1,
      "playlist_id": 1,
      "channel_id": "ch_abc123",
      "channel_name": "BBC News",
      "channel_url": "https://stream.example.com/bbc.m3u8",
      "channel_logo": "https://example.com/logos/bbc.png",
      "channel_group": "News",
      "created_at": "2025-11-09T10:00:00Z"
    }
  ]
}
```

---

### `POST /api/favorites`
Add channel to favorites

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "playlist_id": 1,
  "channel_id": "ch_abc123",
  "channel_name": "BBC News",
  "channel_url": "https://stream.example.com/bbc.m3u8",
  "channel_logo": "https://example.com/logos/bbc.png",
  "channel_group": "News"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Added to favorites"
}
```

**Errors:**
- `409` - Already in favorites

---

### `DELETE /api/favorites/:id`
Remove from favorites

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Removed from favorites"
}
```

---

### `DELETE /api/favorites/channel/:channel_id`
Remove by channel ID

**Headers:** `Authorization: Bearer <token>`

**Query Params:** `?playlist_id=1`

**Response:** `200 OK`

---

## Watch History Endpoints

### `GET /api/history`
Get watch history

**Headers:** `Authorization: Bearer <token>`

**Query Params:** 
- `?limit=10` (default: 10)
- `?playlist_id=1` (optional)

**Response:** `200 OK`
```json
{
  "success": true,
  "history": [
    {
      "id": 100,
      "channel_id": "ch_abc123",
      "channel_name": "BBC News",
      "playlist_id": 1,
      "watched_at": "2025-11-09T11:30:00Z",
      "duration_seconds": 1200
    }
  ]
}
```

---

### `POST /api/history`
Log watch event

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "playlist_id": 1,
  "channel_id": "ch_abc123",
  "channel_name": "BBC News",
  "duration_seconds": 1200
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Watch logged"
}
```

---

### `GET /api/history/recent`
Get recently watched channels (unique)

**Headers:** `Authorization: Bearer <token>`

**Query Params:** `?limit=10` (default: 10)

**Response:** `200 OK`
```json
{
  "success": true,
  "recent": [
    {
      "channel_id": "ch_abc123",
      "channel_name": "BBC News",
      "last_watched": "2025-11-09T11:30:00Z"
    }
  ]
}
```

---

## Display Endpoints

### `POST /api/displays/verify`
Verify display token and get configuration

**Request Body:**
```json
{
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "display": {
    "id": 1,
    "name": "Wall Display 1",
    "location": "Main Cafe - North Wall",
    "assigned_playlist_id": 1,
    "assigned_channel_id": null,
    "config": {
      "volume": 0.5,
      "auto_play": true,
      "auto_reconnect": true
    }
  },
  "playlist": {
    "id": 1,
    "name": "Main Cafe Channels",
    "m3u_url": "https://example.com/playlist.m3u"
  }
}
```

**Errors:**
- `401` - Invalid display token
- `404` - Display not found

---

### `POST /api/displays/heartbeat`
Display sends heartbeat (every 1 minute)

**Request Body:**
```json
{
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "online",
  "current_channel_id": "ch_abc123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Heartbeat received",
  "commands": [] // Future: remote commands
}
```

---

### `GET /api/displays` (Admin only)
List all displays

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "displays": [
    {
      "id": 1,
      "name": "Wall Display 1",
      "location": "Main Cafe",
      "status": "online",
      "last_heartbeat": "2025-11-09T11:45:00Z",
      "assigned_playlist_id": 1
    }
  ]
}
```

---

### `POST /api/displays` (Admin only)
Create new display

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "name": "Counter Display",
  "location": "Main Cafe - Counter",
  "assigned_playlist_id": 1,
  "config": {
    "volume": 0.3,
    "auto_play": true
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "display": {
    "id": 2,
    "name": "Counter Display",
    "token": "generated-uuid-token",
    "display_url": "https://iptv.bakegrillcafe.com?display=generated-uuid-token"
  }
}
```

---

### `PUT /api/displays/:id` (Admin only)
Update display configuration

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "name": "Updated Name",
  "assigned_playlist_id": 2,
  "assigned_channel_id": "ch_xyz789",
  "config": { "volume": 0.7 }
}
```

**Response:** `200 OK`

---

### `DELETE /api/displays/:id` (Admin only)
Delete display

**Response:** `200 OK`

---

## Admin Endpoints

### `GET /api/admin/users`
List all users

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "role": "user",
      "created_at": "2025-11-09T10:00:00Z",
      "last_login": "2025-11-09T11:00:00Z"
    }
  ]
}
```

---

### `POST /api/admin/users`
Create user (admin only)

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "tempPassword123",
  "role": "user"
}
```

**Response:** `201 Created`

---

### `PUT /api/admin/users/:id`
Update user (change role, reset password)

**Request Body:**
```json
{
  "role": "admin",
  "password": "newPassword123"
}
```

**Response:** `200 OK`

---

### `DELETE /api/admin/users/:id`
Delete user

**Response:** `200 OK`

---

### `GET /api/admin/stats`
Get dashboard statistics

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "stats": {
    "total_users": 45,
    "active_users_30d": 32,
    "total_playlists": 78,
    "total_displays": 5,
    "online_displays": 4,
    "total_favorites": 234,
    "total_watch_hours_7d": 1248
  }
}
```

---

## Settings Endpoints

### `GET /api/settings`
Get all app settings (public settings only for non-admin)

**Response:** `200 OK`
```json
{
  "success": true,
  "settings": {
    "app_name": "Bake and Grill TV",
    "pwa_icon_path": "/pwa-512x512.png",
    "allow_registration": true
  }
}
```

---

### `PUT /api/settings/:key` (Admin only)
Update setting value

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "value": "new value"
}
```

**Response:** `200 OK`

---

### `POST /api/settings/upload-icon` (Admin only)
Upload custom PWA icon

**Headers:** 
- `Authorization: Bearer <admin-token>`
- `Content-Type: multipart/form-data`

**Request Body:** FormData with `icon` file field

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Icon uploaded successfully",
  "icon_path": "/uploads/pwa-icon-1234567890.png"
}
```

---

## Health Endpoints

### `GET /api/health`
Health check (no auth required)

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T11:45:00Z",
  "uptime": 3600,
  "database": "connected"
}
```

---

## 🔒 Authorization Rules

| Endpoint Pattern | Required Role |
|-----------------|---------------|
| `/api/auth/*` | None (public) |
| `/api/playlists/*` | User |
| `/api/channels/*` | User |
| `/api/favorites/*` | User |
| `/api/history/*` | User |
| `/api/displays/verify` | None |
| `/api/displays/heartbeat` | None |
| `/api/displays/*` (CRUD) | Admin |
| `/api/admin/*` | Admin |
| `/api/settings/*` (GET) | None |
| `/api/settings/*` (PUT/POST) | Admin |
| `/api/health` | None |

---

## 📊 Rate Limiting (Future)
```
/api/auth/login: 5 requests per 15 minutes per IP
/api/auth/register: 3 requests per hour per IP
/api/channels: 20 requests per minute per user
All others: 100 requests per minute per user
```

---

**Next:** Features Checklist

