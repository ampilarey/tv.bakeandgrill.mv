# Database Schema (SQLite)

## 📊 Complete Schema

### Table: `users`
Stores all user accounts (admin, regular users)

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- 'admin', 'user'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Fields:**
- `id`: Auto-incrementing primary key
- `email`: Unique email address for login
- `password_hash`: bcrypt hashed password
- `role`: User role (admin or user)
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update
- `last_login`: Last successful login time

---

### Table: `playlists`
Stores M3U playlist URLs associated with users

```sql
CREATE TABLE playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    m3u_url TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_fetched DATETIME,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlists_active ON playlists(is_active);
```

**Fields:**
- `id`: Playlist identifier
- `user_id`: Owner of the playlist
- `name`: User-friendly playlist name
- `m3u_url`: URL to M3U/M3U8 playlist file
- `description`: Optional description
- `last_fetched`: Last time channels were fetched
- `is_active`: Soft delete flag

---

### Table: `favorites`
Stores user's favorite channels per playlist

```sql
CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    playlist_id INTEGER NOT NULL,
    channel_id TEXT NOT NULL, -- Generated from M3U data
    channel_name TEXT NOT NULL,
    channel_url TEXT NOT NULL,
    channel_logo TEXT,
    channel_group TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    UNIQUE(user_id, playlist_id, channel_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_playlist_id ON favorites(playlist_id);
CREATE INDEX idx_favorites_user_playlist ON favorites(user_id, playlist_id);
```

**Fields:**
- `channel_id`: Hash or unique identifier from M3U
- `channel_name`: Display name
- `channel_url`: Stream URL
- `channel_logo`: Logo URL (if available)
- `channel_group`: Category/group name

---

### Table: `watch_history`
Tracks what users are watching (for recently watched feature)

```sql
CREATE TABLE watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    playlist_id INTEGER NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INTEGER DEFAULT 0, -- How long they watched
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

CREATE INDEX idx_history_user_id ON watch_history(user_id);
CREATE INDEX idx_history_watched_at ON watch_history(watched_at DESC);
CREATE INDEX idx_history_user_watched ON watch_history(user_id, watched_at DESC);
```

**Features:**
- Stores every channel view
- Enables "Recently Watched" feature
- Can show watch time analytics (future)

---

### Table: `displays`
Manages cafe display screens

```sql
CREATE TABLE displays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, -- e.g., "Wall Display 1", "Counter Display"
    token TEXT UNIQUE NOT NULL, -- UUID for authentication
    assigned_playlist_id INTEGER,
    assigned_channel_id TEXT, -- Specific channel (optional)
    location TEXT, -- e.g., "Main Cafe - Wall"
    status TEXT DEFAULT 'offline', -- 'online', 'offline', 'error'
    last_heartbeat DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    config JSON, -- Display-specific settings (volume, quality, etc.)
    FOREIGN KEY (assigned_playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
);

CREATE INDEX idx_displays_token ON displays(token);
CREATE INDEX idx_displays_status ON displays(status);
```

**Fields:**
- `name`: Human-readable display name
- `token`: Secret token for display authentication
- `assigned_playlist_id`: Which playlist this display shows
- `assigned_channel_id`: Optional specific channel (overrides playlist)
- `location`: Physical location in cafe
- `status`: Current operational status
- `last_heartbeat`: Last time display checked in
- `config`: JSON blob for settings (volume, auto-play, etc.)

---

### Table: `display_schedules`
Schedule what content plays on displays at different times

```sql
CREATE TABLE display_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_id INTEGER NOT NULL,
    day_of_week INTEGER, -- 0=Sunday, 6=Saturday, NULL=all days
    start_time TIME NOT NULL, -- e.g., '08:00'
    end_time TIME NOT NULL, -- e.g., '10:00'
    playlist_id INTEGER NOT NULL,
    channel_id TEXT, -- Specific channel (optional)
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

CREATE INDEX idx_schedules_display_id ON display_schedules(display_id);
CREATE INDEX idx_schedules_time ON display_schedules(start_time, end_time);
CREATE INDEX idx_schedules_active ON display_schedules(is_active);
```

**Use Cases:**
- Morning shows 8-10am
- Lunch content 12-2pm
- Evening programming 6-9pm
- Different content on weekends

---

### Table: `app_settings`
Global application settings (key-value store)

```sql
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT INTO app_settings (key, value, description) VALUES
    ('pwa_icon_path', '/pwa-512x512.png', 'Path to PWA icon file'),
    ('app_name', 'Bake and Grill TV', 'Application display name'),
    ('allow_registration', 'true', 'Allow new user registration'),
    ('default_playlist_cache_minutes', '5', 'M3U cache duration'),
    ('max_playlists_per_user', '10', 'Playlist limit per user'),
    ('display_heartbeat_timeout_minutes', '5', 'Mark display offline after');
```

**Use Cases:**
- Store PWA icon path (when admin uploads new icon)
- Global app configuration
- Feature flags
- System settings

---

## 🔄 Sample Data Insertion

### Create Admin User
```sql
-- Password: admin123 (bcrypt hashed)
INSERT INTO users (email, password_hash, role) VALUES 
    ('admin@bakegrillcafe.com', '$2b$10$...hash...', 'admin');
```

### Create Sample Display
```sql
INSERT INTO displays (name, token, location, config) VALUES
    ('Wall Display 1', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Main Cafe - North Wall', 
     '{"volume": 0.5, "auto_play": true, "auto_reconnect": true}');
```

### Create Sample Playlist
```sql
INSERT INTO playlists (user_id, name, m3u_url, description) VALUES
    (1, 'Main Cafe Channels', 'https://example.com/playlist.m3u', 'Default cafe playlist');
```

---

## 📈 Database Statistics & Monitoring Queries

### Active Users Count
```sql
SELECT COUNT(*) as active_users 
FROM users 
WHERE last_login > datetime('now', '-30 days');
```

### Total Favorites by User
```sql
SELECT u.email, COUNT(f.id) as favorite_count
FROM users u
LEFT JOIN favorites f ON u.id = f.user_id
GROUP BY u.id
ORDER BY favorite_count DESC;
```

### Display Status Overview
```sql
SELECT 
    status,
    COUNT(*) as count,
    GROUP_CONCAT(name, ', ') as display_names
FROM displays
GROUP BY status;
```

### Most Watched Channels (Last 7 Days)
```sql
SELECT 
    channel_name,
    COUNT(*) as view_count,
    SUM(duration_seconds) as total_watch_time
FROM watch_history
WHERE watched_at > datetime('now', '-7 days')
GROUP BY channel_id, channel_name
ORDER BY view_count DESC
LIMIT 10;
```

### Online Displays
```sql
SELECT name, location, last_heartbeat
FROM displays
WHERE last_heartbeat > datetime('now', '-5 minutes')
ORDER BY last_heartbeat DESC;
```

---

## 🔒 Data Integrity Rules

### Foreign Key Constraints:
- ✅ Enabled in SQLite (PRAGMA foreign_keys = ON)
- ✅ CASCADE deletes for user-owned data
- ✅ SET NULL for display assignments when playlist deleted

### Unique Constraints:
- ✅ User email (prevent duplicate accounts)
- ✅ Display token (unique authentication)
- ✅ Favorite combination (user + playlist + channel)

### Default Values:
- ✅ Timestamps auto-populate
- ✅ Active flags default to true
- ✅ Role defaults to 'user'

---

## 🚀 Migration Strategy

### Initial Setup (server.js runs on first start):
```javascript
const db = require('./config/database');
db.initialize(); // Creates all tables, inserts default admin
```

### Future Migrations:
If schema changes needed, create migration files:
```
/server/migrations/
    001_initial_schema.sql
    002_add_display_schedules.sql
    003_add_settings_table.sql
```

---

**Next:** API Endpoints Documentation

