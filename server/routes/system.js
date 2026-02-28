/**
 * System Health API
 * Returns server status, DB connectivity, background service timestamps,
 * and resource usage. Admin-only.
 */
const express = require('express');
const os      = require('os');
const { getDatabase }               = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler }              = require('../middleware/errorHandler');

const router = express.Router();
router.use(verifyToken, requireAdmin);

const SERVER_START = Date.now();

/** GET /api/system/health */
router.get('/health', asyncHandler(async (req, res) => {
  const db = getDatabase();

  // DB ping
  let dbOk = false;
  let dbLatencyMs = null;
  try {
    const t0 = Date.now();
    await db.query('SELECT 1');
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch { /* ignore */ }

  // Display stats
  const [[{ total, online, offline }]] = await db.query(`
    SELECT
      COUNT(*)  AS total,
      SUM(CASE WHEN last_heartbeat > DATE_SUB(NOW(), INTERVAL 65 SECOND) THEN 1 ELSE 0 END) AS online,
      SUM(CASE WHEN last_heartbeat IS NULL OR last_heartbeat <= DATE_SUB(NOW(), INTERVAL 65 SECOND) THEN 1 ELSE 0 END) AS offline
    FROM displays WHERE is_active = 1
  `).catch(() => [[{ total: 0, online: 0, offline: 0 }]]);

  // Last channel check
  const [[lastCheck]] = await db.query(
    'SELECT MAX(last_checked) AS last_checked FROM channel_health'
  ).catch(() => [[{ last_checked: null }]]);

  // Last M3U fetch
  const [[lastFetch]] = await db.query(
    'SELECT MAX(last_fetched) AS last_fetched FROM playlists'
  ).catch(() => [[{ last_fetched: null }]]);

  // Active sessions (users logged in within last 24h based on last_login)
  const [[{ active_users }]] = await db.query(
    "SELECT COUNT(*) AS active_users FROM users WHERE last_login > DATE_SUB(NOW(), INTERVAL 24 HOUR)"
  ).catch(() => [[{ active_users: 0 }]]);

  // Active broadcasts
  const [[{ active_broadcasts }]] = await db.query(
    "SELECT COUNT(*) AS active_broadcasts FROM overlay_messages WHERE target_type='all' AND enabled=1 AND (end_at IS NULL OR end_at > NOW())"
  ).catch(() => [[{ active_broadcasts: 0 }]]);

  // Active overrides
  const [[{ active_overrides }]] = await db.query(
    'SELECT COUNT(*) AS active_overrides FROM emergency_overrides WHERE is_active=1 AND expires_at > NOW()'
  ).catch(() => [[{ active_overrides: 0 }]]);

  const uptimeSec = Math.round((Date.now() - SERVER_START) / 1000);
  const mem       = process.memoryUsage();

  res.json({
    success: true,
    health: {
      server: {
        uptime_seconds: uptimeSec,
        uptime_human:   fmtUptime(uptimeSec),
        node_version:   process.version,
        platform:       process.platform,
        memory_mb: {
          rss:      Math.round(mem.rss      / 1024 / 1024),
          heap_used:Math.round(mem.heapUsed / 1024 / 1024),
          heap_total:Math.round(mem.heapTotal/ 1024 / 1024),
        },
        load_avg: os.loadavg().map(v => Math.round(v * 100) / 100),
      },
      database: {
        ok:         dbOk,
        latency_ms: dbLatencyMs,
      },
      displays: {
        total:   Number(total)   || 0,
        online:  Number(online)  || 0,
        offline: Number(offline) || 0,
      },
      services: {
        last_channel_check: lastCheck?.last_checked || null,
        last_m3u_fetch:     lastFetch?.last_fetched || null,
        active_broadcasts:  Number(active_broadcasts) || 0,
        active_overrides:   Number(active_overrides)  || 0,
      },
      users: {
        active_last_24h: Number(active_users) || 0,
      },
    }
  });
}));

/** GET /api/system/login-log?limit=50 */
router.get('/login-log', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const [rows] = await db.query(
    `SELECT ll.*, u.email, u.role
     FROM auth_log ll
     LEFT JOIN users u ON u.id = ll.user_id
     ORDER BY ll.created_at DESC LIMIT ?`,
    [limit]
  ).catch(() => [[]]);
  res.json({ success: true, logs: rows });
}));

/** GET /api/system/export — download all config as JSON */
router.get('/export', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [displays]  = await db.query('SELECT id,name,location,display_type,overlay_mode,overlay_safe_area,is_outdoor,zone_id,media_playlist_id,playlist_id FROM displays WHERE is_active=1').catch(() => [[]]);
  const [zones]     = await db.query('SELECT * FROM zones').catch(() => [[]]);
  const [playlists] = await db.query('SELECT id,name,m3u_url FROM playlists WHERE is_active=1').catch(() => [[]]);
  const [mPlaylists]= await db.query('SELECT id,name,shuffle FROM media_playlists').catch(() => [[]]);
  const [schedules] = await db.query('SELECT * FROM content_schedules WHERE enabled=1').catch(() => [[]]);
  const [overlays]  = await db.query('SELECT id,text,icon,enabled,target_type,target_id FROM overlay_messages WHERE enabled=1').catch(() => [[]]);

  res.setHeader('Content-Disposition', `attachment; filename="bakeandgrill-tv-config-${new Date().toISOString().slice(0,10)}.json"`);
  res.json({
    exported_at: new Date().toISOString(),
    displays, zones, playlists, media_playlists: mPlaylists, content_schedules: schedules, overlay_messages: overlays
  });
}));

function fmtUptime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

module.exports = router;
