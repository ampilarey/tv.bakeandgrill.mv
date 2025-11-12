-- Add columns for display pairing system
-- Run date: 2025-11-12

-- Note: If column already exists, skip that statement

-- Add created_by column (from previous migration)
ALTER TABLE displays ADD COLUMN created_by INT NULL DEFAULT NULL;

-- Add pairing columns  
ALTER TABLE displays ADD COLUMN location_pin VARCHAR(4);
ALTER TABLE displays ADD COLUMN last_ip VARCHAR(45);

-- Add user_id to link display to a user account (for history/favorites tracking)
ALTER TABLE displays ADD COLUMN user_id INT NULL DEFAULT NULL;

-- Add indexes
ALTER TABLE displays ADD INDEX idx_displays_location_pin (location_pin);
ALTER TABLE displays ADD INDEX idx_displays_last_ip (last_ip);
ALTER TABLE displays ADD INDEX idx_displays_owner (created_by);
ALTER TABLE displays ADD INDEX idx_displays_user (user_id);

-- Add foreign keys
ALTER TABLE displays ADD CONSTRAINT fk_displays_owner FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE displays ADD CONSTRAINT fk_displays_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

