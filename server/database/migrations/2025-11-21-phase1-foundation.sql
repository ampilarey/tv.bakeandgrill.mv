-- ============================================
-- PHASE 1: FOUNDATION - Database Migrations
-- Date: 2025-11-21
-- Purpose: Add new tables for multi-type content system
-- Risk: LOW (additive only, no breaking changes)
-- ============================================

-- ============================================
-- Table: playlist_items
-- Stores multi-type content (M3U, images, videos, YouTube, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS playlist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playlist_id INT NOT NULL,
  
  -- Content type
  type ENUM('m3u', 'video', 'youtube', 'youtube_playlist', 'onedrive', 'image', 'template') DEFAULT 'm3u',
  
  -- Multi-language support
  title VARCHAR(255) NOT NULL,
  title_dv VARCHAR(255) COMMENT 'Title in Dhivehi',
  description TEXT,
  description_dv TEXT COMMENT 'Description in Dhivehi',
  
  -- Content URLs
  url TEXT NOT NULL,
  embed_url TEXT COMMENT 'Processed embed URL for YouTube/OneDrive',
  thumbnail_url VARCHAR(500),
  
  -- Media settings
  duration_seconds INT DEFAULT 0 COMMENT 'For images/slides: display duration',
  sound_enabled BOOLEAN DEFAULT TRUE,
  
  -- Special features
  qr_target_url VARCHAR(500) COMMENT 'URL for QR code generation',
  is_upsell BOOLEAN DEFAULT FALSE COMMENT 'Is this an upsell/promotion slide',
  is_kids_friendly BOOLEAN DEFAULT TRUE,
  is_staff_training BOOLEAN DEFAULT FALSE,
  
  -- Organization
  sort_order INT DEFAULT 0,
  group_name VARCHAR(100) COMMENT 'Category/group name',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  INDEX idx_playlist_items_playlist (playlist_id),
  INDEX idx_playlist_items_type (type),
  INDEX idx_playlist_items_sort (playlist_id, sort_order),
  INDEX idx_playlist_items_group (group_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: ticker_messages
-- Scrolling info ticker messages
-- ============================================
CREATE TABLE IF NOT EXISTS ticker_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Multi-language text
  text TEXT NOT NULL,
  text_dv TEXT COMMENT 'Text in Dhivehi',
  
  -- Targeting
  display_id INT NULL COMMENT 'NULL = global message, otherwise display-specific',
  
  -- Scheduling
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0 COMMENT 'Higher priority shows first',
  start_date DATE NULL,
  end_date DATE NULL,
  
  -- Metadata
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_ticker_active (is_active, priority),
  INDEX idx_ticker_display (display_id),
  INDEX idx_ticker_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: announcements
-- Quick full-screen announcements
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  display_id INT NOT NULL,
  
  -- Multi-language text
  text TEXT NOT NULL,
  text_dv TEXT COMMENT 'Text in Dhivehi',
  
  -- Display settings
  duration_seconds INT DEFAULT 10,
  background_color VARCHAR(7) DEFAULT '#1e293b',
  text_color VARCHAR(7) DEFAULT '#ffffff',
  
  -- Timing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  
  FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE,
  INDEX idx_announcements_display (display_id),
  INDEX idx_announcements_active (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: slide_templates
-- Reusable slide design templates
-- ============================================
CREATE TABLE IF NOT EXISTS slide_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Template info
  name VARCHAR(255) NOT NULL,
  template_type ENUM('image_price', 'text_only', 'offer', 'qr_code', 'custom') DEFAULT 'custom',
  
  -- Design settings (JSON for flexibility)
  layout_config JSON COMMENT 'Layout configuration (positions, sizes)',
  background_color VARCHAR(7) DEFAULT '#ffffff',
  primary_color VARCHAR(7) DEFAULT '#1e293b',
  secondary_color VARCHAR(7) DEFAULT '#64748b',
  font_family VARCHAR(100) DEFAULT 'Inter',
  
  -- Preview
  preview_url VARCHAR(500),
  
  -- Metadata
  created_by INT NULL,
  is_system BOOLEAN DEFAULT FALSE COMMENT 'System template vs user-created',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_templates_type (template_type),
  INDEX idx_templates_creator (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: scenes
-- One-click display configurations
-- ============================================
CREATE TABLE IF NOT EXISTS scenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Scene info
  name VARCHAR(255) NOT NULL,
  name_dv VARCHAR(255) COMMENT 'Name in Dhivehi',
  description TEXT,
  
  -- Configuration
  playlist_id INT NULL,
  ticker_enabled BOOLEAN DEFAULT TRUE,
  upsell_frequency INT DEFAULT 5 COMMENT 'Show upsell every N items',
  audio_enabled BOOLEAN DEFAULT TRUE,
  theme VARCHAR(50) DEFAULT 'default',
  
  -- Additional settings (JSON for flexibility)
  settings JSON COMMENT 'Additional scene settings',
  
  -- Metadata
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_scenes_creator (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: feature_flags
-- System-wide feature toggle system
-- ============================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Feature info
  flag_name VARCHAR(100) UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  description TEXT,
  
  -- Rollout control
  rollout_percentage INT DEFAULT 0 COMMENT '0-100: percentage of users to enable for',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_feature_flags_name (flag_name),
  INDEX idx_feature_flags_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: screen_profiles
-- Per-display configuration profiles
-- ============================================
CREATE TABLE IF NOT EXISTS screen_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  display_id INT NOT NULL UNIQUE,
  
  -- Language settings
  language ENUM('en', 'dv', 'both', 'alternate') DEFAULT 'en',
  
  -- Default configs
  default_scene_id INT NULL,
  default_mode ENUM('normal', 'kids', 'training') DEFAULT 'normal',
  theme VARCHAR(50) DEFAULT 'default',
  
  -- Settings (JSON for flexibility)
  settings JSON COMMENT 'Display-specific settings',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE,
  FOREIGN KEY (default_scene_id) REFERENCES scenes(id) ON DELETE SET NULL,
  INDEX idx_screen_profiles_display (display_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Insert default feature flags (all disabled)
-- ============================================
INSERT INTO feature_flags (flag_name, is_enabled, description) VALUES
('multi_type_player', FALSE, 'Enable multi-type content player (images, videos, YouTube)'),
('image_slides', FALSE, 'Enable image slide support'),
('youtube_embed', FALSE, 'Enable YouTube video embedding'),
('info_ticker', FALSE, 'Enable scrolling info ticker'),
('qr_codes', FALSE, 'Enable QR code generation on slides'),
('scenes', FALSE, 'Enable one-click scene configurations'),
('multilang', FALSE, 'Enable multi-language support (English + Dhivehi)'),
('offline_cache', FALSE, 'Enable offline content caching'),
('slide_templates', FALSE, 'Enable slide template system'),
('kids_mode', FALSE, 'Enable kids/family-friendly mode'),
('upsell_logic', FALSE, 'Enable smart upsell/promotion logic'),
('announcements', FALSE, 'Enable quick announcements overlay'),
('staff_training_mode', FALSE, 'Enable staff training mode'),
('advanced_scheduling', FALSE, 'Enable date-based scheduling')
ON DUPLICATE KEY UPDATE flag_name=flag_name;

-- ============================================
-- PHASE 1 MIGRATION COMPLETE
-- ============================================

