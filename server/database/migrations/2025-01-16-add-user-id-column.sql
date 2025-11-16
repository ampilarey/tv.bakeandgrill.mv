-- Migration: Add user_id column to displays table
-- Date: 2025-01-16
-- Description: Add user_id column to link displays to their display users

-- Check if column exists, then add it
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'displays' 
  AND COLUMN_NAME = 'user_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE displays ADD COLUMN user_id INT NULL AFTER playlist_id',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key (ignore if exists)
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'displays' 
  AND CONSTRAINT_NAME = 'fk_displays_user'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE displays ADD CONSTRAINT fk_displays_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index (ignore if exists)
SET @index_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'displays' 
  AND INDEX_NAME = 'idx_displays_user'
);

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX idx_displays_user ON displays(user_id)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

