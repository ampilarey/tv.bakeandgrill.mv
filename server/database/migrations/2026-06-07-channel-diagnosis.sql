-- Extend channel_health with deep diagnosis fields
ALTER TABLE channel_health ADD COLUMN original_url TEXT NULL;
ALTER TABLE channel_health ADD COLUMN final_url TEXT NULL;
ALTER TABLE channel_health ADD COLUMN status_code INT NULL;
ALTER TABLE channel_health ADD COLUMN content_type VARCHAR(255) NULL;
ALTER TABLE channel_health ADD COLUMN is_hls TINYINT(1) NULL;
ALTER TABLE channel_health ADD COLUMN is_http TINYINT(1) NULL;
ALTER TABLE channel_health ADD COLUMN is_https TINYINT(1) NULL;
ALTER TABLE channel_health ADD COLUMN manifest_reachable TINYINT(1) NULL;
ALTER TABLE channel_health ADD COLUMN first_segment_reachable TINYINT(1) NULL;
ALTER TABLE channel_health ADD COLUMN segment_content_type VARCHAR(255) NULL;
ALTER TABLE channel_health ADD COLUMN codec_video VARCHAR(128) NULL;
ALTER TABLE channel_health ADD COLUMN codec_audio VARCHAR(128) NULL;
ALTER TABLE channel_health ADD COLUMN requires_referrer TINYINT(1) NULL DEFAULT 0;
ALTER TABLE channel_health ADD COLUMN requires_user_agent TINYINT(1) NULL DEFAULT 0;
ALTER TABLE channel_health ADD COLUMN playable_ios TINYINT(1) NULL;
ALTER TABLE channel_health ADD COLUMN playable_android_chrome TINYINT(1) NULL;
ALTER TABLE channel_health ADD COLUMN playable_desktop_chrome TINYINT(1) NULL;
ALTER TABLE channel_health ADD COLUMN playable_tv_browser TINYINT(1) NULL;
ALTER TABLE channel_health ADD COLUMN failure_reason_code VARCHAR(64) NULL;
ALTER TABLE channel_health ADD COLUMN failure_message TEXT NULL;
ALTER TABLE channel_health ADD COLUMN needs_proxy TINYINT(1) NULL DEFAULT 0;
ALTER TABLE channel_health ADD COLUMN is_drm TINYINT(1) NULL DEFAULT 0;
ALTER TABLE channel_health ADD COLUMN diagnosis_version INT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS channel_overrides (
  playlist_id  INT          NOT NULL,
  url_hash     CHAR(32)     NOT NULL,
  is_hidden    TINYINT(1)   NOT NULL DEFAULT 0,
  is_trusted   TINYINT(1)   NOT NULL DEFAULT 1,
  admin_note   TEXT         NULL,
  updated_by   INT          NULL,
  updated_at   TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (playlist_id, url_hash),
  INDEX idx_overrides_hidden (is_hidden),
  INDEX idx_overrides_trusted (is_trusted)
);

ALTER TABLE playlists ADD COLUMN trusted_streams_only TINYINT(1) NOT NULL DEFAULT 0;
