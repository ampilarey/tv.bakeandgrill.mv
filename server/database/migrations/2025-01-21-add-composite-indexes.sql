-- Migration: Add composite indexes for improved query performance
-- Date: 2025-01-21
-- Description: Add composite indexes to optimize common query patterns

-- Add composite index for display commands (faster command polling)
ALTER TABLE display_commands 
ADD INDEX idx_commands_pending (display_id, is_executed, created_at);

-- Add composite index for watch history (faster "recently watched" queries)
ALTER TABLE watch_history 
ADD INDEX idx_history_user_recent (user_id, watched_at DESC);

-- Add composite index for notifications (faster unread queries)
ALTER TABLE notifications 
ADD INDEX idx_notifications_unread (user_id, `read`, created_at DESC);

-- Add index for last_heartbeat (faster online/offline status checks)
ALTER TABLE displays
ADD INDEX idx_displays_heartbeat (last_heartbeat);

