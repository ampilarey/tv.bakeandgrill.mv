-- Migration: Add 'display' role to users table CHECK constraint
-- Date: 2025-01-16
-- Description: Allow 'display' role for display/kiosk system users

-- For MySQL 8.0.16+, we can drop and recreate the constraint
-- This will work even if the constraint doesn't exist yet

-- Drop existing constraint if it exists (ignore error if it doesn't)
SET @sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE users DROP CHECK users_chk_1',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND CONSTRAINT_NAME = 'users_chk_1'
);

SET @sql = IFNULL(@sql, 'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new constraint with 'display' role included
ALTER TABLE users 
ADD CONSTRAINT users_chk_1 
CHECK (role IN ('admin', 'staff', 'user', 'display'));
