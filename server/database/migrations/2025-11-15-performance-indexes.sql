-- Bake & Grill TV - Performance Indexes Migration
-- Date: 2025-11-15
-- Purpose: Add composite indexes for common query patterns to improve performance

-- ============================================
-- Composite Indexes for Watch History
-- ============================================
-- Common query: Get user's history sorted by watched_at DESC
-- Common query: Get history for specific user and playlist
CREATE INDEX IF NOT EXISTS idx_history_user_watched_at ON watch_history(user_id, watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_user_playlist_watched_at ON watch_history(user_id, playlist_id, watched_at DESC);

-- ============================================
-- Composite Indexes for Favorites
-- ============================================
-- Common query: Get user's favorites for a specific playlist
-- Note: Already has UNIQUE (user_id, playlist_id, channel_id) but composite index helps queries
CREATE INDEX IF NOT EXISTS idx_favorites_user_playlist ON favorites(user_id, playlist_id);

-- ============================================
-- Composite Indexes for Display Schedules
-- ============================================
-- Common query: Get active schedules for display on specific day/time
CREATE INDEX IF NOT EXISTS idx_schedules_display_active_time ON display_schedules(display_id, is_active, day_of_week, start_time);

-- ============================================
-- Composite Indexes for Display Commands
-- ============================================
-- Common query: Get pending commands for a display ordered by creation time
CREATE INDEX IF NOT EXISTS idx_commands_display_pending_created ON display_commands(display_id, is_executed, created_at);

-- ============================================
-- Index for Playlists (common query pattern)
-- ============================================
-- Common query: Get active playlists by owner
CREATE INDEX IF NOT EXISTS idx_playlists_owner_active ON playlists(created_by, is_active);

