-- Migration: Make email column nullable (phone number is now primary identifier)
-- Date: 2025-01-20
-- Description: Email is now optional, phone_number is mandatory

-- Make email nullable
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'email'
  AND IS_NULLABLE = 'NO'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL',
  'SELECT "Email column already nullable" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

