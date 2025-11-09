const express = require('express');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication and admin role
router.use(verifyToken, requireAdmin);

/**
 * GET /api/analytics/overview
 * System-wide overview statistics
 */
router.get('/overview', asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  // Total users
  const [totalUsers] = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE');
  
  // Total playlists
  const [totalPlaylists] = await db.query('SELECT COUNT(*) as count FROM playlists WHERE is_active = TRUE');
  
  // Total displays
  const [totalDisplays] = await db.query('SELECT COUNT(*) as count FROM displays WHERE is_active = TRUE');
  
  // Active displays (heartbeat < 5 minutes)
  const [activeDisplays] = await db.query(
    `SELECT COUNT(*) as count FROM displays 
     WHERE is_active = TRUE 
     AND last_heartbeat IS NOT NULL
     AND last_heartbeat > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
  );
  
  // Total watch time
  const [totalWatchTime] = await db.query('SELECT SUM(duration_seconds) as total FROM watch_history');
  
  // Total watch sessions
  const [totalSessions] = await db.query('SELECT COUNT(*) as count FROM watch_history');
  
  res.json({
    success: true,
    overview: {
      totalUsers: totalUsers[0].count,
      totalPlaylists: totalPlaylists[0].count,
      totalDisplays: totalDisplays[0].count,
      activeDisplays: activeDisplays[0].count,
      totalWatchTime: totalWatchTime[0].total || 0,
      totalSessions: totalSessions[0].count
    }
  });
}));

/**
 * GET /api/analytics/channels
 * Most watched channels
 */
router.get('/channels', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { limit = 20, days = 30 } = req.query;
  
  const [mostWatched] = await db.query(
    `SELECT 
      channel_id,
      channel_name,
      COUNT(*) as view_count,
      SUM(duration_seconds) as total_seconds,
      AVG(duration_seconds) as avg_seconds
    FROM watch_history
    WHERE watched_at > DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY channel_id
    ORDER BY view_count DESC
    LIMIT ?`,
    [parseInt(days), parseInt(limit)]
  );
  
  res.json({
    success: true,
    channels: mostWatched
  });
}));

/**
 * GET /api/analytics/users
 * User activity statistics
 */
router.get('/users', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { days = 30 } = req.query;
  
  // User activity (watch sessions per user)
  const [userActivity] = await db.query(
    `SELECT 
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      COUNT(wh.id) as session_count,
      SUM(wh.duration_seconds) as total_watch_seconds,
      MAX(wh.watched_at) as last_watched
    FROM users u
    LEFT JOIN watch_history wh ON u.id = wh.user_id
      AND wh.watched_at > DATE_SUB(NOW(), INTERVAL ? DAY)
    WHERE u.is_active = TRUE
    GROUP BY u.id
    ORDER BY session_count DESC`,
    [parseInt(days)]
  );
  
  res.json({
    success: true,
    userActivity
  });
}));

/**
 * GET /api/analytics/displays
 * Display uptime and status metrics
 */
router.get('/displays', asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  const [displays] = await db.query('SELECT * FROM displays WHERE is_active = TRUE');
  
  // Calculate metrics for each display
  const displayMetrics = displays.map(display => {
    let status = 'offline';
    let uptimePercentage = 0;
    
    if (display.last_heartbeat) {
      const now = new Date();
      const lastHeartbeat = new Date(display.last_heartbeat);
      const minutesAgo = (now - lastHeartbeat) / 1000 / 60;
      
      if (minutesAgo < 5) {
        status = 'online';
      }
      
      // Calculate uptime (simple: based on creation date and current status)
      const ageInHours = (now - new Date(display.created_at)) / 1000 / 60 / 60;
      
      if (status === 'online' && ageInHours > 0) {
        uptimePercentage = 99; // Simplified - in real system, track downtime events
      }
    }
    
    return {
      id: display.id,
      name: display.name,
      location: display.location,
      status,
      lastHeartbeat: display.last_heartbeat,
      currentChannel: display.current_channel_id,
      uptimePercentage
    };
  });
  
  res.json({
    success: true,
    displays: displayMetrics
  });
}));

/**
 * GET /api/analytics/watch-time
 * Watch time breakdown
 */
router.get('/watch-time', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { days = 30 } = req.query;
  
  // Total watch time by playlist
  const [byPlaylist] = await db.query(
    `SELECT 
      p.id,
      p.name,
      COUNT(wh.id) as session_count,
      SUM(wh.duration_seconds) as total_seconds
    FROM playlists p
    LEFT JOIN watch_history wh ON p.id = wh.playlist_id
      AND wh.watched_at > DATE_SUB(NOW(), INTERVAL ? DAY)
    WHERE p.is_active = TRUE
    GROUP BY p.id
    ORDER BY total_seconds DESC`,
    [parseInt(days)]
  );
  
  // Watch time by day (last N days)
  const [byDay] = await db.query(
    `SELECT 
      DATE(watched_at) as date,
      COUNT(*) as session_count,
      SUM(duration_seconds) as total_seconds
    FROM watch_history
    WHERE watched_at > DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY DATE(watched_at)
    ORDER BY date ASC`,
    [parseInt(days)]
  );
  
  res.json({
    success: true,
    byPlaylist,
    byDay
  });
}));

module.exports = router;
