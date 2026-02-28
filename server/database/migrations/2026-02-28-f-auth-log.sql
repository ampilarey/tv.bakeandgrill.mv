-- Auth log table for tracking user logins
CREATE TABLE IF NOT EXISTS auth_log (
  id          INT          NOT NULL AUTO_INCREMENT,
  user_id     INT          NOT NULL,
  event       VARCHAR(32)  NOT NULL DEFAULT 'login',
  ip_address  VARCHAR(64)  NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
