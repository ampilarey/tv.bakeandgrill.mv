-- Multiple stream playlists per display (merged channel list on kiosk).
CREATE TABLE IF NOT EXISTS display_playlists (
  display_id INT NOT NULL,
  playlist_id INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (display_id, playlist_id),
  INDEX idx_display_playlists_display (display_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
