-- Persist client device type on playback failure reports
ALTER TABLE channel_health ADD COLUMN last_device_type VARCHAR(32) NULL;
