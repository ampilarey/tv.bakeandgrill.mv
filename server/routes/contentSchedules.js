/**
 * Content Schedules
 * Time-based media playlist scheduling for displays or zones.
 * Does NOT replace existing display_schedules (channel-level); this targets media playlists.
 */
const express = require('express');
const { getDatabase }               = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler }              = require('../middleware/errorHandler');

const router = express.Router();
router.use(verifyToken);

/** GET /api/content-schedules */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [schedules] = await db.query(`
    SELECT cs.*, mp.name AS playlist_name
    FROM content_schedules cs
    LEFT JOIN media_playlists mp ON mp.id = cs.playlist_id
    ORDER BY cs.priority DESC, cs.start_time ASC
  `);
  res.json({ success: true, schedules });
}));

/** POST /api/content-schedules */
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { target_type, target_id, playlist_id, days_of_week, start_time, end_time, priority, enabled } = req.body;
  if (!target_type || !target_id || !playlist_id || !start_time || !end_time) {
    return res.status(400).json({ success: false, error: 'target_type, target_id, playlist_id, start_time, end_time required' });
  }
  const db = getDatabase();
  const [r] = await db.query(
    `INSERT INTO content_schedules (target_type, target_id, playlist_id, days_of_week, start_time, end_time, priority, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [target_type, target_id, playlist_id,
     days_of_week || '0,1,2,3,4,5,6', start_time, end_time,
     priority || 0, enabled !== false ? 1 : 0]
  );
  const [rows] = await db.query('SELECT * FROM content_schedules WHERE id = ?', [r.insertId]);
  res.status(201).json({ success: true, schedule: rows[0] });
}));

/** PUT /api/content-schedules/:id */
router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const fields = ['target_type','target_id','playlist_id','days_of_week','start_time','end_time','priority','enabled'];
  const updates = [];
  const params  = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
  params.push(req.params.id);
  const db = getDatabase();
  await db.query(`UPDATE content_schedules SET ${updates.join(', ')} WHERE id = ?`, params);
  const [rows] = await db.query('SELECT * FROM content_schedules WHERE id = ?', [req.params.id]);
  res.json({ success: true, schedule: rows[0] });
}));

/** DELETE /api/content-schedules/:id */
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  await db.query('DELETE FROM content_schedules WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Schedule deleted' });
}));

/**
 * GET /api/content-schedules/resolve?display_id=N&now=ISO
 * Resolve the active media playlist for a display right now.
 * Returns { playlist_id, source } or { playlist_id: null }
 */
router.get('/resolve', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const displayId = parseInt(req.query.display_id, 10);
  if (!displayId) return res.status(400).json({ success: false, error: 'display_id required' });

  const now     = new Date();
  const dayIdx  = now.getDay();                    // 0=Sun … 6=Sat
  const nowTime = now.toTimeString().slice(0, 8);  // HH:MM:SS

  // Fetch display
  const [displays] = await db.query('SELECT * FROM displays WHERE id = ?', [displayId]);
  if (!displays.length) return res.status(404).json({ success: false, error: 'Display not found' });
  const display = displays[0];

  // Outdoor day/night selection
  if (display.is_outdoor && display.day_playlist_id && display.night_playlist_id) {
    const dayStart   = display.day_start_time   || '07:00:00';
    const nightStart = display.night_start_time || '18:00:00';
    const isDay   = nowTime >= dayStart   && nowTime < nightStart;
    const isNight = nowTime >= nightStart || nowTime < dayStart;
    if (isNight && display.night_playlist_id) return res.json({ success: true, playlist_id: display.night_playlist_id, source: 'outdoor_night' });
    if (isDay   && display.day_playlist_id)   return res.json({ success: true, playlist_id: display.day_playlist_id,   source: 'outdoor_day' });
  }

  // Content schedules: check display-level then zone-level
  const zoneId = display.zone_id || null;

  const [schedules] = await db.query(`
    SELECT * FROM content_schedules
    WHERE enabled = 1
      AND (
        (target_type = 'display' AND target_id = ?) OR
        (target_type = 'zone'    AND target_id = ?)
      )
      AND FIND_IN_SET(?, REPLACE(days_of_week, ', ', ',')) > 0
      AND start_time <= ?
      AND end_time   >= ?
    ORDER BY
      CASE target_type WHEN 'display' THEN 1 ELSE 0 END DESC,
      priority DESC
    LIMIT 1
  `, [displayId, zoneId || -1, dayIdx, nowTime, nowTime]);

  if (schedules.length) return res.json({ success: true, playlist_id: schedules[0].playlist_id, source: 'schedule', schedule: schedules[0] });

  // Fallback: display default media playlist
  if (display.media_playlist_id) return res.json({ success: true, playlist_id: display.media_playlist_id, source: 'default' });

  res.json({ success: true, playlist_id: null, source: 'none' });
}));

module.exports = router;
