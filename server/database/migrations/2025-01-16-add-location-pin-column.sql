-- Migration: Add location_pin column to displays table
-- Date: 2025-01-16
-- Description: Add location_pin column for display pairing by location

-- Check if column exists, then add it
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'displays' 
  AND COLUMN_NAME = 'location_pin'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE displays ADD COLUMN location_pin VARCHAR(4) NULL AFTER token',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index (will fail if exists, that's ok)
SET @index_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'displays' 
  AND INDEX_NAME = 'idx_displays_location_pin'
);

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX idx_displays_location_pin ON displays(location_pin)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

