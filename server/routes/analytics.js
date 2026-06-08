/**
 * Analytics API
 * GET /api/analytics/displays  — 7-day uptime data per display
 * GET /api/analytics/summary   — aggregated totals
 */
const express = require('express');
const { getDatabase }               = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler }              = require('../middleware/errorHandler');

const router = express.Router();
router.use(verifyToken, requireAdmin);

/** Build an array of the last N days as 'YYYY-MM-DD' strings (oldest first) */
function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/**
 * From a sorted array of {event_type, occurred_at} events for ONE display and ONE day,
 * compute approximate uptime percentage (0-100).
 * We reconstruct the online/offline timeline in minutes and sum.
 */
function computeDayUptime(eventsForDay, dayStr, prevStatusOnline) {
  const DAY_MINUTES = 1440;
  const dayStart = new Date(dayStr + 'T00:00:00').getTime();
  const dayEnd   = new Date(dayStr + 'T23:59:59').getTime();

  let onlineMinutes = 0;
  let lastTs    = dayStart;
  let online    = prevStatusOnline; // status at start of day

  for (const e of eventsForDay) {
    const ts = new Date(e.occurred_at).getTime();
    const clampedTs = Math.min(Math.max(ts, dayStart), dayEnd);
    const segMinutes = (clampedTs - lastTs) / 60_000;

    if (online) onlineMinutes += segMinutes;
    online = e.event_type === 'online';
    lastTs = clampedTs;
  }

  // Remainder of day
  const remainder = (dayEnd - lastTs) / 60_000;
  if (online) onlineMinutes += remainder;

  return Math.min(100, Math.round((onlineMinutes / DAY_MINUTES) * 100));
}

/**
 * GET /api/analytics/overview
 * Legacy endpoint used by AdminDashboard stats cards.
 * Returns quick counts for users, playlists, displays.
 */
router.get('/overview', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const now = Date.now();
  const MAX_STORAGE_MB = parseInt(process.env.MAX_STORAGE_MB || '2048', 10);

  const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) AS totalUsers FROM users WHERE is_active = 1').catch(() => [[{ totalUsers: 0 }]]);
  const [[{ totalPlaylists }]] = await db.query('SELECT COUNT(*) AS totalPlaylists FROM playlists WHERE is_active = 1').catch(() => [[{ totalPlaylists: 0 }]]);
  const [displays] = await db.query(
    'SELECT id, last_heartbeat, media_playlist_id FROM displays WHERE is_active = 1'
  ).catch(() => [[]]);

  const totalDisplays = displays.length;
  const activeDisplays = displays.filter((d) =>
    d.last_heartbeat && (now - new Date(d.last_heartbeat).getTime()) < 90_000
  ).length;

  let totalMediaFiles = 0;
  let storageUsedMb = 0;
  let unusedMedia = 0;
  let brokenPlaylistItems = 0;
  let mediaPlaylists = 0;
  let unassignedMediaPlaylists = 0;
  let displaysWithoutAssignment = 0;

  try {
    const [[mediaTotals]] = await db.query(`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(size_bytes), 0) AS bytes FROM media_assets
    `);
    totalMediaFiles = Number(mediaTotals.cnt || 0);
    storageUsedMb = Math.round(Number(mediaTotals.bytes || 0) / 1024 / 1024 * 10) / 10;

    const [[unused]] = await db.query(`
      SELECT COUNT(*) AS cnt FROM media_assets ma
      WHERE NOT EXISTS (SELECT 1 FROM media_playlist_items mpi WHERE mpi.media_id = ma.id)
    `);
    unusedMedia = Number(unused.cnt || 0);

    const [[broken]] = await db.query(`
      SELECT COUNT(*) AS cnt FROM media_playlist_items mpi
      LEFT JOIN media_assets ma ON ma.id = mpi.media_id
      WHERE ma.id IS NULL
    `);
    brokenPlaylistItems = Number(broken.cnt || 0);

    const [[mpCount]] = await db.query('SELECT COUNT(*) AS cnt FROM media_playlists');
    mediaPlaylists = Number(mpCount.cnt || 0);

    const [assignedPl] = await db.query(`
      SELECT DISTINCT media_playlist_id AS pid FROM displays WHERE media_playlist_id IS NOT NULL
      UNION
      SELECT DISTINCT day_playlist_id FROM displays WHERE day_playlist_id IS NOT NULL
      UNION
      SELECT DISTINCT night_playlist_id FROM displays WHERE night_playlist_id IS NOT NULL
    `);
    const assignedSet = new Set(assignedPl.map((r) => r.pid).filter(Boolean));
    unassignedMediaPlaylists = Math.max(0, mediaPlaylists - assignedSet.size);

    displaysWithoutAssignment = displays.filter((d) => !d.media_playlist_id).length;
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') console.error('Media overview stats:', err.message);
  }

  res.json({
    success: true,
    overview: {
      totalUsers: Number(totalUsers),
      totalPlaylists: Number(totalPlaylists),
      totalDisplays,
      activeDisplays,
      totalMediaFiles,
      storageUsedMb,
      storageMaxMb: MAX_STORAGE_MB,
      unusedMedia,
      brokenPlaylistItems,
      mediaPlaylists,
      unassignedMediaPlaylists,
      displaysWithoutAssignment,
    },
  });
}));

/** GET /api/analytics/displays */
router.get('/displays', asyncHandler(async (req, res) => {
  const days = lastNDays(7);
  const db   = getDatabase();

  const [displays] = await db.query(
    `SELECT id, name, location, last_heartbeat, now_playing, uptime_seconds
     FROM displays WHERE is_active = 1 ORDER BY name`
  );

  // Fetch all uptime events for last 7+ days (extra day to get prev-status context)
  const [events] = await db.query(
    `SELECT display_id, event_type, occurred_at
     FROM display_uptime_events
     WHERE occurred_at >= DATE_SUB(NOW(), INTERVAL 8 DAY)
     ORDER BY display_id, occurred_at ASC`
  ).catch(() => [[]]);

  // Group by display
  const byDisplay = {};
  for (const e of events) {
    if (!byDisplay[e.display_id]) byDisplay[e.display_id] = [];
    byDisplay[e.display_id].push(e);
  }

  const now = Date.now();

  const result = displays.map(d => {
    const displayEvents = byDisplay[d.id] || [];
    const isOnlineNow = d.last_heartbeat && (now - new Date(d.last_heartbeat).getTime()) < 90_000;

    // Compute uptime per day
    const dailyUptime = days.map((day, idx) => {
      const dayEvents = displayEvents.filter(e => {
        const ds = new Date(e.occurred_at).toISOString().slice(0, 10);
        return ds === day;
      });

      // Determine status at start of this day from previous events
      const prevEvents = displayEvents.filter(e => {
        return new Date(e.occurred_at).toISOString().slice(0, 10) < day;
      });
      const prevOnline = prevEvents.length > 0
        ? prevEvents[prevEvents.length - 1].event_type === 'online'
        : null; // unknown

      if (dayEvents.length === 0) {
        // For today: use current heartbeat
        if (idx === 6) return isOnlineNow ? 100 : null;
        return prevOnline === null ? null : (prevOnline ? 100 : 0);
      }

      if (prevOnline === null) {
        // Assume started offline if we have no prior data
        return computeDayUptime(dayEvents, day, false);
      }
      return computeDayUptime(dayEvents, day, prevOnline);
    });

    return {
      id:              d.id,
      name:            d.name,
      location:        d.location,
      last_heartbeat:  d.last_heartbeat,
      now_playing:     d.now_playing,
      uptime_seconds:  d.uptime_seconds,
      is_online:       isOnlineNow,
      daily_uptime:    dailyUptime,
    };
  });

  res.json({ success: true, displays: result, days });
}));

/** GET /api/analytics/summary */
router.get('/summary', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const now = Date.now();

  const [displays] = await db.query(
    'SELECT last_heartbeat, uptime_seconds FROM displays WHERE is_active = 1'
  );

  const totalDisplays  = displays.length;
  const onlineDisplays = displays.filter(d =>
    d.last_heartbeat && (now - new Date(d.last_heartbeat).getTime()) < 90_000
  ).length;

  const totalUptime = displays.reduce((s, d) => s + (d.uptime_seconds || 0), 0);
  const avgUptimeHours = totalDisplays > 0
    ? Math.round(totalUptime / totalDisplays / 3600)
    : 0;

  // Events in last 24h
  const [eventCount] = await db.query(
    "SELECT COUNT(*) AS n FROM display_uptime_events WHERE occurred_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"
  ).catch(() => [[{ n: 0 }]]);

  res.json({
    success: true,
    total_displays: totalDisplays,
    online_displays: onlineDisplays,
    offline_displays: totalDisplays - onlineDisplays,
    avg_uptime_hours: avgUptimeHours,
    events_24h: eventCount[0].n,
  });
}));

module.exports = router;
