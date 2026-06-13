-- Direct stream channels (persistent manual channels alongside M3U playlists)

CREATE TABLE IF NOT EXISTS direct_channels (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  playlist_id     INT NOT NULL,
  source_type     ENUM('direct_stream') NOT NULL DEFAULT 'direct_stream',
  name            VARCHAR(255) NOT NULL,
  stream_url      TEXT NOT NULL,
  stream_url_hash CHAR(32) NOT NULL,
  stream_type     ENUM('hls','mp4','web_video','unknown') NOT NULL DEFAULT 'unknown',
  group_name      VARCHAR(255) NULL,
  logo_url        TEXT NULL,
  playback_mode   ENUM('auto','direct','proxy') NOT NULL DEFAULT 'auto',
  http_user_agent VARCHAR(512) NULL,
  http_referer    VARCHAR(1024) NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  sort_order      INT NOT NULL DEFAULT 0,
  created_by      INT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_direct_url_per_playlist (playlist_id, stream_url_hash),
  INDEX idx_direct_playlist_active (playlist_id, is_active, sort_order),
  CONSTRAINT fk_direct_channels_playlist FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- Allow direct-only playlists without remote M3U URL
ALTER TABLE playlists MODIFY m3u_url TEXT NULL;

-- Playlist kind: m3u remote, mixed (m3u + direct), or direct_only
ALTER TABLE playlists ADD COLUMN playlist_kind ENUM('m3u','mixed','direct_only') NOT NULL DEFAULT 'm3u';

-- Seed default Direct Streams playlist (idempotent)
INSERT INTO playlists (name, m3u_url, description, playlist_kind, is_active)
SELECT 'Direct Streams', NULL, 'Manually added direct HLS and video streams', 'direct_only', TRUE
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM playlists WHERE name = 'Direct Streams' AND playlist_kind = 'direct_only' LIMIT 1);
