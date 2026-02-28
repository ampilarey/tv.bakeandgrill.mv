CREATE TABLE IF NOT EXISTS zones (
  id          INT           NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)  NOT NULL,
  description TEXT          NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS emergency_overrides (
  id               INT           NOT NULL AUTO_INCREMENT,
  zone_id          INT           NULL DEFAULT NULL,
  display_id       INT           NULL DEFAULT NULL,
  playlist_id      INT           NULL DEFAULT NULL,
  override_message VARCHAR(255)  NOT NULL DEFAULT 'Emergency override active',
  duration_minutes INT           NOT NULL DEFAULT 60,
  started_by       INT           NOT NULL,
  started_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at       DATETIME      NOT NULL,
  is_active        TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  INDEX idx_zone_id    (zone_id),
  INDEX idx_display_id (display_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_is_active  (is_active)
);

ALTER TABLE displays ADD COLUMN zone_id INT NULL DEFAULT NULL;
ALTER TABLE displays ADD COLUMN pairing_enabled_until DATETIME NULL DEFAULT NULL;
ALTER TABLE displays ADD COLUMN last_status VARCHAR(50) NULL DEFAULT NULL;
ALTER TABLE displays ADD COLUMN now_playing TEXT NULL DEFAULT NULL;
ALTER TABLE displays ADD COLUMN app_version VARCHAR(20) NULL DEFAULT NULL;
ALTER TABLE displays ADD COLUMN uptime_seconds INT NULL DEFAULT NULL;
