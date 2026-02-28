CREATE TABLE IF NOT EXISTS display_scenes (
  id            INT          NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  description   TEXT         NULL,
  snapshot_json LONGTEXT     NOT NULL,
  created_by    INT          NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_created_by (created_by)
);

ALTER TABLE displays ADD COLUMN wifi_ssid        VARCHAR(100) NULL;
ALTER TABLE displays ADD COLUMN wifi_password    VARCHAR(100) NULL;
ALTER TABLE displays ADD COLUMN wifi_security    VARCHAR(20)  NULL DEFAULT 'WPA';
ALTER TABLE displays ADD COLUMN show_wifi_qr     TINYINT(1)  NOT NULL DEFAULT 0;
ALTER TABLE displays ADD COLUMN wifi_qr_position VARCHAR(20)  NULL DEFAULT 'bottom-right';
ALTER TABLE displays ADD COLUMN auto_reboot_time TIME NULL;
