-- Ensure pairing tables/columns exist on DBs that skipped earlier migrations.

CREATE TABLE IF NOT EXISTS pairing_sessions (
  id          INT           NOT NULL AUTO_INCREMENT,
  type        ENUM('pin','qr') NOT NULL,
  token       VARCHAR(64)   NOT NULL,
  display_id  INT           NULL DEFAULT NULL,
  expires_at  DATETIME      NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token (token),
  INDEX idx_expires (expires_at)
);

ALTER TABLE displays ADD COLUMN location_pin VARCHAR(4) NULL;
ALTER TABLE displays ADD COLUMN created_by INT NULL DEFAULT NULL;
ALTER TABLE displays ADD COLUMN user_id INT NULL DEFAULT NULL;
ALTER TABLE displays ADD COLUMN pairing_enabled_until DATETIME NULL DEFAULT NULL;
