CREATE TABLE IF NOT EXISTS channel_health (
  url_hash             CHAR(32)     NOT NULL,
  playlist_id          INT          NOT NULL,
  url                  TEXT         NOT NULL,
  channel_name         VARCHAR(255) NULL,
  is_live              TINYINT(1)   NULL DEFAULT NULL,
  last_checked         DATETIME     NULL DEFAULT NULL,
  consecutive_failures INT          NOT NULL DEFAULT 0,
  last_seen_live       DATETIME     NULL DEFAULT NULL,
  PRIMARY KEY (url_hash, playlist_id),
  INDEX idx_playlist_id (playlist_id),
  INDEX idx_is_live (is_live)
);
