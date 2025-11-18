-- Migration: Add phone_number and force_password_change to users table
-- Date: 2025-01-17
-- Description: Support login with phone number and force password change on first login

-- Add phone_number column
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'phone_number'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) NULL UNIQUE AFTER email',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add force_password_change column
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'force_password_change'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT FALSE AFTER is_active',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on phone_number
SET @index_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND INDEX_NAME = 'idx_users_phone'
);

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX idx_users_phone ON users(phone_number)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

