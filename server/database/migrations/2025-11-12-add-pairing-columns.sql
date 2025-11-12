-- Add columns for display pairing system
-- Run date: 2025-11-12

-- Note: If column already exists, skip this migration or run individual statements

-- Add created_by column (from previous migration)
ALTER TABLE displays ADD COLUMN created_by INT NULL DEFAULT NULL;

-- Add pairing columns  
ALTER TABLE displays ADD COLUMN location_pin VARCHAR(4);
ALTER TABLE displays ADD COLUMN last_ip VARCHAR(45);

-- Add indexes
ALTER TABLE displays ADD INDEX idx_displays_location_pin (location_pin);
ALTER TABLE displays ADD INDEX idx_displays_last_ip (last_ip);
ALTER TABLE displays ADD INDEX idx_displays_owner (created_by);

-- Add foreign key
ALTER TABLE displays ADD CONSTRAINT fk_displays_owner FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

