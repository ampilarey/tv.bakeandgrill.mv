CREATE TABLE IF NOT EXISTS display_uptime_events (
  id           INT          NOT NULL AUTO_INCREMENT,
  display_id   INT          NOT NULL,
  event_type   VARCHAR(16)  NOT NULL,
  occurred_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_display_time (display_id, occurred_at)
);

ALTER TABLE displays ADD COLUMN last_screenshot_url VARCHAR(255) NULL;
ALTER TABLE displays ADD COLUMN last_screenshot_at  DATETIME NULL;
ALTER TABLE displays ADD COLUMN failover_playlist_id  INT NULL;
ALTER TABLE displays ADD COLUMN failover_after_minutes TINYINT UNSIGNED NULL DEFAULT 5;
