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
