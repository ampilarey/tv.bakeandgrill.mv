-- Channel health tracking table
-- url_hash = MD5(url), used as fast lookup key since URLs can be very long
CREATE TABLE IF NOT EXISTS channel_health (
  url_hash     CHAR(32)     NOT NULL,
  playlist_id  INT          NOT NULL,
  url          TEXT         NOT NULL,
  channel_name VARCHAR(255) NULL,
  is_live      TINYINT(1)   NULL    DEFAULT NULL COMMENT 'NULL=unchecked, 1=live, 0=down',
  last_checked DATETIME     NULL    DEFAULT NULL,
  consecutive_failures INT  NOT NULL DEFAULT 0,
  last_seen_live DATETIME   NULL    DEFAULT NULL,
  PRIMARY KEY (url_hash, playlist_id),
  INDEX idx_playlist_id (playlist_id),
  INDEX idx_is_live (is_live)
)
