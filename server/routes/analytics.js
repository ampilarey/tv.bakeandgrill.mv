const express = require('express');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication and admin role
router.use(verifyToken, requireAdmin);

/**
 * GET /api/analytics
 * Get platform analytics
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { range = '7d' } = req.query;

  // Calculate date range
  let dateFilter = '';
  let dateParams = [];
  
  if (range !== 'all') {
    const now = new Date();
    let startDate;
    
    switch(range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    
    dateFilter = 'WHERE watched_at >= ?';
    dateParams = [startDate.toISOString()];
  }

  // Total users
  const [totalUsersResult] = await db.query('SELECT COUNT(*) as count FROM users');
  const totalUsers = totalUsersResult[0].count;

  // Active displays (heartbeat in last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const [activeDisplaysResult] = await db.query(
    'SELECT COUNT(*) as count FROM displays WHERE last_heartbeat >= ?',
    [fiveMinutesAgo]
  );
  const activeDisplays = activeDisplaysResult[0].count;

  // Total playlists
  const [totalPlaylistsResult] = await db.query('SELECT COUNT(*) as count FROM playlists WHERE is_active = 1');
  const totalPlaylists = totalPlaylistsResult[0].count;

  // Total watch time
  const watchTimeQuery = `SELECT SUM(duration_seconds) as total FROM watch_history ${dateFilter}`;
  const [totalWatchTimeResult] = await db.query(watchTimeQuery, dateParams);
  const totalWatchTime = totalWatchTimeResult[0].total || 0;

  // Most watched channels
  const mostWatchedQuery = `
    SELECT 
      channel_id,
      channel_name,
      COUNT(*) as view_count,
      SUM(duration_seconds) as total_seconds
    FROM watch_history
    ${dateFilter}
    GROUP BY channel_id, channel_name
    ORDER BY view_count DESC
    LIMIT 10
  `;
  const [mostWatchedChannels] = await db.query(mostWatchedQuery, dateParams);

  // Recent activity (last 20 records)
  const recentActivityQuery = `
    SELECT 
      wh.id,
      wh.channel_name,
      wh.watched_at,
      wh.duration_seconds,
      u.email as user_email
    FROM watch_history wh
    LEFT JOIN users u ON wh.user_id = u.id
    ${dateFilter}
    ORDER BY wh.watched_at DESC
    LIMIT 20
  `;
  const [recentActivity] = await db.query(recentActivityQuery, dateParams);

  // Watch by playlist
  const watchByPlaylistQuery = `
    SELECT 
      p.id,
      p.name,
      COUNT(wh.id) as view_count,
      SUM(wh.duration_seconds) as total_seconds
    FROM playlists p
    LEFT JOIN watch_history wh ON p.id = wh.playlist_id ${dateFilter ? 'AND ' + dateFilter.replace('WHERE', '') : ''}
    GROUP BY p.id, p.name
    ORDER BY view_count DESC
  `;
  const [watchByPlaylist] = await db.query(watchByPlaylistQuery, dateParams);

  // Active users (users who watched in the time range)
  const activeUsersQuery = `
    SELECT COUNT(DISTINCT user_id) as count
    FROM watch_history
    ${dateFilter}
  `;
  const [activeUsersResult] = await db.query(activeUsersQuery, dateParams);
  const activeUsers = activeUsersResult[0].count;

  res.json({
    success: true,
    totalUsers,
    activeDisplays,
    totalPlaylists,
    totalWatchTime,
    activeUsers,
    mostWatchedChannels,
    recentActivity,
    watchByPlaylist
  });
}));

module.exports = router;
