# Database Schema (SQLite)

## Overview
Using SQLite for simplicity and cPanel compatibility. Single file database: `database.sqlite`

---

## Tables

### 1. `users`
Stores all user accounts (admin, regular users)

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK(role IN ('admin', 'user')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Fields:**
- `id`: Auto-increment primary key
- `email`: Unique login email
- `password_hash`: bcrypt hashed password
- `role`: 'admin' or 'user'
- `first_name`, `last_name`: Optional profile info
- `is_active`: Soft delete flag

---

### 2. `playlists`
User's M3U playlist URLs

```sql
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  m3u_url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_fetched DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_playlists_user ON playlists(user_id);
CREATE INDEX idx_playlists_active ON playlists(is_active);
```

**Fields:**
- `id`: Auto-increment primary key
- `user_id`: Owner of the playlist
- `name`: User-friendly name (e.g., "My Sports Channels")
- `m3u_url`: Full URL to M3U file
- `description`: Optional notes
- `is_active`: Enable/disable playlist
- `last_fetched`: Cache timestamp

---

### 3. `favorites`
User's favorite channels (per playlist)

```sql
CREATE TABLE favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  playlist_id INTEGER NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  UNIQUE(user_id, playlist_id, channel_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_playlist ON favorites(playlist_id);
```

**Fields:**
- `channel_id`: Unique identifier from M3U (hash of URL)
- `channel_name`: Cached for display
- Composite unique constraint prevents duplicates

---

### 4. `watch_history`
Track what users watch and for how long

```sql
CREATE TABLE watch_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  playlist_id INTEGER NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

CREATE INDEX idx_history_user ON watch_history(user_id);
CREATE INDEX idx_history_watched_at ON watch_history(watched_at DESC);
CREATE INDEX idx_history_channel ON watch_history(channel_id);
```

**Fields:**
- `duration_seconds`: How long watched (tracked client-side)
- `watched_at`: Timestamp of viewing session

---

### 5. `displays`
Cafe display/kiosk configurations

```sql
CREATE TABLE displays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  token VARCHAR(255) UNIQUE NOT NULL,
  assigned_playlist_id INTEGER,
  current_channel_id VARCHAR(255),
  is_active BOOLEAN DEFAULT 1,
  auto_play BOOLEAN DEFAULT 1,
  schedule_enabled BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME,
  FOREIGN KEY (assigned_playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
);

CREATE INDEX idx_displays_token ON displays(token);
CREATE INDEX idx_displays_active ON displays(is_active);
```

**Fields:**
- `name`: Display identifier (e.g., "Wall Display 1")
- `location`: Physical location (e.g., "Main Cafe Wall")
- `token`: Unique auth token for display URL
- `assigned_playlist_id`: Which playlist to play
- `current_channel_id`: Currently playing channel
- `schedule_enabled`: Use time-based scheduling
- `last_seen`: Heartbeat timestamp

---

### 6. `display_schedules`
Time-based channel scheduling for displays

```sql
CREATE TABLE display_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_id INTEGER NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  day_of_week INTEGER CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE
);

CREATE INDEX idx_schedules_display ON display_schedules(display_id);
CREATE INDEX idx_schedules_time ON display_schedules(day_of_week, start_time);
```

**Fields:**
- `day_of_week`: 0 = Sunday, 6 = Saturday (NULL = every day)
- `start_time`, `end_time`: HH:MM:SS format
- Example: Play "Morning Show" from 08:00 to 10:00 on weekdays

---

### 7. `app_settings`
System-wide configuration (key-value store)

```sql
CREATE TABLE app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT INTO app_settings (key, value, description) VALUES
  ('pwa_icon_path', '/default-icon.png', 'Path to custom PWA icon'),
  ('app_name', 'Bake and Grill TV', 'Application display name'),
  ('max_playlists_per_user', '5', 'Maximum playlists per user'),
  ('enable_user_registration', 'true', 'Allow new user signups'),
  ('session_timeout_days', '7', 'JWT token expiry (days)');
```

**Fields:**
- `key`: Setting identifier
- `value`: JSON or string value
- `description`: Human-readable description

---

### 8. `display_heartbeats`
Monitor display health (optional for Phase 4+)

```sql
CREATE TABLE display_heartbeats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_id INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'online',
  current_channel_id VARCHAR(255),
  error_message TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE
);

CREATE INDEX idx_heartbeats_display ON display_heartbeats(display_id);
CREATE INDEX idx_heartbeats_time ON display_heartbeats(timestamp DESC);
```

**Purpose**: Track display status over time for analytics

---

## Default Data

### Default Admin User
```sql
INSERT INTO users (email, password_hash, role, first_name, last_name) 
VALUES (
  'admin@bakegrill.com',
  '$2b$10$...', -- bcrypt hash of 'BakeGrill2025!'
  'admin',
  'Admin',
  'User'
);
```

### Default Display (for testing)
```sql
INSERT INTO displays (name, location, token, is_active) 
VALUES (
  'Test Display',
  'Development',
  'dev-display-token-12345',
  1
);
```

---

## Database Initialization

The backend will include a migration system:

```javascript
// server/database/init.js
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

function initDatabase() {
  const db = new Database(path.join(__dirname, 'database.sqlite'));
  
  // Execute all CREATE TABLE statements
  // Check if tables exist, create if not
  // Insert default data
  // Return db instance
  
  return db;
}
```

---

## Relationships Diagram

```
users (1) ──────┬──────> (N) playlists
                │
                ├──────> (N) favorites
                │
                └──────> (N) watch_history

playlists (1) ───┬─────> (N) favorites
                 │
                 ├─────> (N) watch_history
                 │
                 └─────> (N) displays (assigned_playlist_id)

displays (1) ────┬─────> (N) display_schedules
                 │
                 └─────> (N) display_heartbeats
```

---

## Migration Strategy

For future updates:
1. Version table: `schema_version (version INT, applied_at DATETIME)`
2. Migration files: `001_initial.sql`, `002_add_feature.sql`
3. Auto-apply on server start

---

## Performance Considerations

- **Indexes**: Added on frequently queried columns (user_id, playlist_id, timestamps)
- **Cascading Deletes**: When user deleted, all related data removed automatically
- **Soft Deletes**: Use `is_active` flag for important entities
- **Date Format**: SQLite DATETIME stored as ISO8601 strings
- **Text Limit**: SQLite TEXT can store up to 1GB (more than enough for M3U URLs)

---

## Backup Strategy

For cPanel deployment:
1. Daily cron job to copy `database.sqlite` to backup folder
2. Keep last 7 days of backups
3. Export script for JSON backup (included in admin panel)

