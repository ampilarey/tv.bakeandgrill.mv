-- Add columns for display pairing system
-- Run date: 2025-11-12

ALTER TABLE displays 
ADD COLUMN location_pin VARCHAR(4) AFTER token,
ADD COLUMN last_ip VARCHAR(45) AFTER location_pin,
ADD INDEX idx_displays_location_pin (location_pin),
ADD INDEX idx_displays_last_ip (last_ip);

