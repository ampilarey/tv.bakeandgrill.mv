-- Kiosk reliability: debug flag, diagnosis stage, reconnect secret
ALTER TABLE displays ADD COLUMN kiosk_debug TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE channel_health ADD COLUMN failure_stage VARCHAR(64) NULL;
ALTER TABLE reconnection_requests ADD COLUMN check_secret VARCHAR(64) NULL;
ALTER TABLE displays ADD COLUMN last_screenshot_filename VARCHAR(255) NULL;
