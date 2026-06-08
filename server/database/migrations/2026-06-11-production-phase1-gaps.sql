-- Bootstrap tables missing on older production DBs (phase1 foundation never applied).
-- Safe to re-run: uses IF NOT EXISTS / ON DUPLICATE KEY / idempotent alters.

CREATE TABLE IF NOT EXISTS feature_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flag_name VARCHAR(100) UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  description TEXT,
  rollout_percentage INT DEFAULT 0 COMMENT '0-100: percentage of users to enable for',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_feature_flags_name (flag_name),
  INDEX idx_feature_flags_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO feature_flags (flag_name, is_enabled, description) VALUES
('multi_type_player', FALSE, 'Enable multi-type content player (images, videos, YouTube)'),
('image_slides', FALSE, 'Enable image slide support'),
('youtube_embed', FALSE, 'Enable YouTube video embedding'),
('info_ticker', TRUE, 'Enable scrolling info ticker'),
('qr_codes', FALSE, 'Enable QR code generation on slides'),
('scenes', FALSE, 'Enable one-click scene configurations'),
('multilang', FALSE, 'Enable multi-language support (English + Dhivehi)'),
('offline_cache', FALSE, 'Enable offline content caching'),
('slide_templates', FALSE, 'Enable slide template system'),
('kids_mode', FALSE, 'Enable kids/family-friendly mode'),
('upsell_logic', FALSE, 'Enable smart upsell/promotion logic'),
('announcements', TRUE, 'Enable quick announcements overlay'),
('staff_training_mode', FALSE, 'Enable staff training mode'),
('advanced_scheduling', FALSE, 'Enable date-based scheduling')
ON DUPLICATE KEY UPDATE flag_name = flag_name;

UPDATE feature_flags
SET is_enabled = TRUE, updated_at = NOW()
WHERE flag_name IN ('info_ticker', 'announcements');

CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  display_id INT NOT NULL,
  text TEXT NOT NULL,
  text_dv TEXT COMMENT 'Text in Dhivehi',
  duration_seconds INT DEFAULT 10,
  background_color VARCHAR(7) DEFAULT '#1e293b',
  text_color VARCHAR(7) DEFAULT '#ffffff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  created_by INT NULL,
  INDEX idx_announcements_display (display_id),
  INDEX idx_announcements_active (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE announcements ADD COLUMN created_by INT NULL;
