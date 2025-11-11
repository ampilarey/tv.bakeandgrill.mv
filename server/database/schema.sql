-- Bake & Grill TV - MySQL Database Schema

-- ============================================
-- Table: users
-- Stores admin and staff user accounts
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK(role IN ('admin', 'staff', 'user')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: playlists
-- Stores M3U playlist URLs
-- ============================================
CREATE TABLE IF NOT EXISTS playlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  m3u_url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_fetched TIMESTAMP NULL,
  INDEX idx_playlists_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: favorites
-- User's favorite channels
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  playlist_id INT NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favorite (user_id, playlist_id, channel_id),
  INDEX idx_favorites_user (user_id),
  INDEX idx_favorites_playlist (playlist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: watch_history
-- Track viewing sessions
-- ============================================
CREATE TABLE IF NOT EXISTS watch_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  playlist_id INT NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  INDEX idx_history_user (user_id),
  INDEX idx_history_watched_at (watched_at),
  INDEX idx_history_channel (channel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: displays
-- Cafe display/kiosk configurations
-- ============================================
CREATE TABLE IF NOT EXISTS displays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  playlist_id INT,
  current_channel_id VARCHAR(255),
  token VARCHAR(255) UNIQUE NOT NULL,
  last_heartbeat TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  auto_play BOOLEAN DEFAULT TRUE,
  schedule_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL,
  INDEX idx_displays_token (token),
  INDEX idx_displays_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: display_schedules
-- Time-based channel scheduling
-- ============================================
CREATE TABLE IF NOT EXISTS display_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  display_id INT NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  day_of_week INT CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE,
  INDEX idx_schedules_display (display_id),
  INDEX idx_schedules_time (day_of_week, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: display_commands
-- Remote control command queue
-- ============================================
CREATE TABLE IF NOT EXISTS display_commands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  display_id INT NOT NULL,
  command_type VARCHAR(50) NOT NULL,
  command_data TEXT,
  is_executed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  executed_at TIMESTAMP NULL,
  FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE,
  INDEX idx_commands_display (display_id, is_executed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: user_permissions
-- Granular user permissions and limits
-- ============================================
CREATE TABLE IF NOT EXISTS user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  
  -- Feature permissions (boolean)
  can_add_playlists BOOLEAN DEFAULT FALSE,
  can_edit_own_playlists BOOLEAN DEFAULT FALSE,
  can_delete_own_playlists BOOLEAN DEFAULT FALSE,
  can_manage_displays BOOLEAN DEFAULT FALSE,
  can_control_displays BOOLEAN DEFAULT FALSE,
  can_create_users BOOLEAN DEFAULT FALSE,
  can_view_analytics BOOLEAN DEFAULT FALSE,
  can_manage_schedules BOOLEAN DEFAULT FALSE,
  
  -- Resource limits (-1 = none, 0 = unlimited, N = specific number)
  max_playlists INT DEFAULT -1,
  max_displays INT DEFAULT -1,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_permission (user_id),
  INDEX idx_permissions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: user_assigned_playlists
-- Admin can assign their playlists to users
-- ============================================
CREATE TABLE IF NOT EXISTS user_assigned_playlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  playlist_id INT NOT NULL,
  assigned_by INT NOT NULL,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_assignment (user_id, playlist_id),
  INDEX idx_assigned_user (user_id),
  INDEX idx_assigned_playlist (playlist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: app_settings
-- System-wide configuration
-- ============================================
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
