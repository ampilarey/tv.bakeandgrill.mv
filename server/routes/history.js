const express = require('express');
const { getDatabase } = require('../database/init');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/history
 * Get user's watch history (paginated)
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { limit = 50, offset = 0, playlistId } = req.query;
  
  // Validate and sanitize limit and offset
  const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500); // Max 500
  const safeOffset = Math.max(parseInt(offset) || 0, 0);
  
  const params = [req.user.id];
  let whereClause = 'user_id = ?';

  if (playlistId) {
    whereClause += ' AND playlist_id = ?';
    params.push(parseInt(playlistId));
  }

  const [history] = await db.query(
    `SELECT * FROM watch_history WHERE ${whereClause} ORDER BY watched_at DESC LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset]
  );
  
  const [countResult] = await db.query(
    `SELECT COUNT(*) as count FROM watch_history WHERE ${whereClause}`,
    params
  );
  
  res.json({
    success: true,
    history,
    total: countResult[0].count,
    limit: safeLimit,
    offset: safeOffset
  });
}));

/**
 * POST /api/history
 * Log a watch session
 */
router.post('/', asyncHandler(async (req, res) => {
  const { playlist_id, channel_id, channel_name, duration_seconds } = req.body;
  const db = getDatabase();
  
  if (!playlist_id || !channel_id) {
    return res.status(400).json({
      success: false,
      error: 'Playlist ID and channel ID are required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  // Insert watch record
  const [result] = await db.query(
    'INSERT INTO watch_history (user_id, playlist_id, channel_id, channel_name, duration_seconds) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, playlist_id, channel_id, channel_name, duration_seconds || 0]
  );
  
  // Get created record
  const [history] = await db.query('SELECT * FROM watch_history WHERE id = ?', [result.insertId]);
  
  res.status(201).json({
    success: true,
    record: history[0]
  });
}));

/**
 * GET /api/history/recent
 * Get recently watched channels (last 10)
 */
router.get('/recent', asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  const [recent] = await db.query(
    'SELECT * FROM watch_history WHERE user_id = ? ORDER BY watched_at DESC LIMIT 10',
    [req.user.id]
  );
  
  res.json({
    success: true,
    recent
  });
}));

/**
 * GET /api/history/analytics
 * Get personal watch analytics
 */
router.get('/analytics', asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  // Total watch time
  const [totalTime] = await db.query(
    'SELECT SUM(duration_seconds) as total FROM watch_history WHERE user_id = ?',
    [req.user.id]
  );
  
  // Most watched channels
  const [mostWatched] = await db.query(
    `SELECT 
      channel_id, 
      channel_name, 
      COUNT(*) as view_count,
      SUM(duration_seconds) as total_seconds
    FROM watch_history 
    WHERE user_id = ?
    GROUP BY channel_id 
    ORDER BY view_count DESC 
    LIMIT 10`,
    [req.user.id]
  );
  
  // Watch time by playlist
  const [byPlaylist] = await db.query(
    `SELECT 
      playlist_id,
      SUM(duration_seconds) as total_seconds,
      COUNT(*) as view_count
    FROM watch_history 
    WHERE user_id = ?
    GROUP BY playlist_id`,
    [req.user.id]
  );
  
  res.json({
    success: true,
    analytics: {
      totalWatchTime: totalTime[0].total || 0,
      mostWatchedChannels: mostWatched,
      watchByPlaylist: byPlaylist
    }
  });
}));

/**
 * DELETE /api/history/:id
 * Delete single history entry
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  // Check ownership
  const [records] = await db.query('SELECT id FROM watch_history WHERE id = ? AND user_id = ?', [id, req.user.id]);
  
  if (records.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'History record not found',
      code: 'HISTORY_NOT_FOUND'
    });
  }
  
  await db.query('DELETE FROM watch_history WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: 'History entry deleted'
  });
}));

/**
 * DELETE /api/history
 * Clear all history for user
 */
router.delete('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  const [result] = await db.query('DELETE FROM watch_history WHERE user_id = ?', [req.user.id]);
  
  res.json({
    success: true,
    message: `Deleted ${result.affectedRows} history entries`
  });
}));

module.exports = router;
