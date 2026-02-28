ALTER TABLE displays ADD COLUMN overlay_mode      VARCHAR(20)  NOT NULL DEFAULT 'none';
ALTER TABLE displays ADD COLUMN overlay_safe_area VARCHAR(10)  NOT NULL DEFAULT 'standard';

CREATE TABLE IF NOT EXISTS overlay_messages (
  id              INT           NOT NULL AUTO_INCREMENT,
  text            VARCHAR(500)  NOT NULL,
  icon            VARCHAR(50)   NULL DEFAULT NULL,
  enabled         TINYINT(1)    NOT NULL DEFAULT 1,
  priority        INT           NOT NULL DEFAULT 0,
  rotation_seconds INT          NOT NULL DEFAULT 8,
  show_qr         TINYINT(1)    NOT NULL DEFAULT 0,
  qr_url          VARCHAR(500)  NULL DEFAULT NULL,
  start_at        DATETIME      NULL DEFAULT NULL,
  end_at          DATETIME      NULL DEFAULT NULL,
  target_type     VARCHAR(10)   NOT NULL DEFAULT 'all',
  target_id       INT           NULL DEFAULT NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_enabled    (enabled),
  INDEX idx_target     (target_type, target_id),
  INDEX idx_priority   (priority)
);

CREATE TABLE IF NOT EXISTS promo_cards (
  id              INT           NOT NULL AUTO_INCREMENT,
  title           VARCHAR(255)  NOT NULL,
  price_text      VARCHAR(100)  NULL DEFAULT NULL,
  subtitle        VARCHAR(500)  NULL DEFAULT NULL,
  image_media_id  INT           NULL DEFAULT NULL,
  image_url       TEXT          NULL DEFAULT NULL,
  enabled         TINYINT(1)    NOT NULL DEFAULT 1,
  display_seconds INT           NOT NULL DEFAULT 12,
  popup_interval_seconds INT    NOT NULL DEFAULT 30,
  start_at        DATETIME      NULL DEFAULT NULL,
  end_at          DATETIME      NULL DEFAULT NULL,
  target_type     VARCHAR(10)   NOT NULL DEFAULT 'all',
  target_id       INT           NULL DEFAULT NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_enabled    (enabled),
  INDEX idx_target     (target_type, target_id)
);
