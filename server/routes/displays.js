const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin, verifyDisplayToken } = require('../middleware/auth');
const { validateDisplayCreate } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkPermission, checkResourceLimit } = require('../middleware/permissions');
const { fetch } = require('../utils/httpClient');
const { parseM3U } = require('../utils/m3uParser');

const router = express.Router();

// Strip location_pin before returning a display object to API consumers.
// Admins need the token to configure displays, but location_pin is an
// internal authentication secret used only during pairing and must never
// appear in list/detail API responses.
function sanitizeDisplay(display) {
  if (!display) return display;
  const { location_pin, ...safe } = display; // eslint-disable-line no-unused-vars
  return safe;
}

// Rate limiter for display endpoints (60 requests per minute per display)
const displayLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests from this display, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/displays/verify
 * Verify display token (public endpoint for displays)
 */
router.post('/verify', verifyDisplayToken, asyncHandler(async (req, res) => {
  const { token } = req.body;
  const db = getDatabase();
  
  const [displays] = await db.query('SELECT * FROM displays WHERE token = ? AND is_active = TRUE', [token]);
  
  if (displays.length === 0) {
    return res.status(401).json({
      success: false,
      error: 'Invalid display token',
      code: 'DISPLAY_INVALID_TOKEN'
    });
  }
  
  const display = displays[0];
  
  // Get assigned playlist and fetch channels
  let playlist = null;
  let channels = [];
  
  if (display.playlist_id) {
    const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ?', [display.playlist_id]);
    playlist = playlists[0] || null;
    
    // Fetch and parse M3U for display (so display doesn't need JWT)
    if (playlist && playlist.m3u_url) {
      try {
        const m3uResponse = await fetch(playlist.m3u_url, {
          timeout: 10000,
          headers: { 'User-Agent': 'BakeGrillTV/1.0' }
        });
        channels = parseM3U(m3uResponse.data);
      } catch (error) {
        console.error('Error fetching M3U for display:', error.message);
      }
    }
  }
  
  // Resolve active media playlist via content schedule
  let resolvedMediaPlaylistId = display.media_playlist_id || null;
  try {
    const now      = new Date();
    const dayIdx   = now.getDay();
    const nowTime  = now.toTimeString().slice(0, 8);
    const zoneId   = display.zone_id || -1;
    const [scheds] = await db.query(`
      SELECT playlist_id FROM content_schedules
      WHERE enabled = 1
        AND ( (target_type='display' AND target_id=?) OR (target_type='zone' AND target_id=?) )
        AND FIND_IN_SET(?, REPLACE(days_of_week, ', ', ',')) > 0
        AND start_time <= ? AND end_time >= ?
      ORDER BY CASE target_type WHEN 'display' THEN 1 ELSE 0 END DESC, priority DESC
      LIMIT 1
    `, [display.id, zoneId, dayIdx, nowTime, nowTime]);
    if (scheds.length) resolvedMediaPlaylistId = scheds[0].playlist_id;

    // Outdoor day/night override
    if (display.is_outdoor) {
      const dayStart   = (display.day_start_time   || '07:00:00');
      const nightStart = (display.night_start_time || '18:00:00');
      const isNight = nowTime >= nightStart || nowTime < dayStart;
      if (isNight  && display.night_playlist_id) resolvedMediaPlaylistId = display.night_playlist_id;
      else if (display.day_playlist_id)           resolvedMediaPlaylistId = display.day_playlist_id;
    }
  } catch (err) { if (err.code !== 'ER_NO_SUCH_TABLE') console.error('Schedule resolution error:', err.message); }

  // Active emergency override
  let activeOverridePlaylistId = null;
  try {
    const [ovrs] = await db.query(
      `SELECT COALESCE(media_playlist_id, playlist_id) AS pid
       FROM emergency_overrides
       WHERE is_active=1 AND expires_at > NOW()
         AND (
           display_id = ? OR
           zone_id    = ? OR
           (display_id IS NULL AND zone_id IS NULL)
         )
       ORDER BY started_at DESC LIMIT 1`,
      [display.id, display.zone_id || -1]
    );
    if (ovrs.length && ovrs[0].pid) activeOverridePlaylistId = ovrs[0].pid;
  } catch (err) { if (err.code !== 'ER_NO_SUCH_TABLE') console.error('Override resolution error:', err.message); }

  res.json({
    success: true,
    display: {
      id:                display.id,
      name:              display.name,
      location:          display.location,
      playlistId:        display.playlist_id,
      currentChannelId:  display.current_channel_id,
      autoPlay:          display.auto_play === 1,
      scheduleEnabled:   display.schedule_enabled === 1,
      displayType:       display.display_type || 'stream',
      mediaPlaylistId:   activeOverridePlaylistId || resolvedMediaPlaylistId,
      muteAudio:         display.mute_audio === 1,
      isOutdoor:         display.is_outdoor === 1,
      showClockOverlay:  display.show_clock_overlay === 1,
      showBrandOverlay:  display.show_brand_overlay !== 0,
      overlayMode:       display.overlay_mode       || 'none',
      overlaySafeArea:   display.overlay_safe_area  || 'standard',
      showWifiQr:           display.show_wifi_qr === 1,
      wifiSsid:             display.wifi_ssid          || null,
      wifiPassword:         display.wifi_password      || null,
      wifiSecurity:         display.wifi_security      || 'WPA',
      wifiQrPosition:       display.wifi_qr_position   || 'bottom-right',
      autoRebootTime:       display.auto_reboot_time   || null,
      failoverPlaylistId:   display.failover_playlist_id   || null,
      failoverAfterMinutes: display.failover_after_minutes ?? 5,
    },
    playlist,
    channels
  });
}));

/**
 * POST /api/displays/heartbeat
 * Update display heartbeat (public endpoint for displays)
 * Body: { token, current_channel_id?, status?, nowPlaying?, uptime?, appVersion? }
 */
router.post('/heartbeat', displayLimiter, verifyDisplayToken, asyncHandler(async (req, res) => {
  const { token, current_channel_id, status, nowPlaying, uptime, appVersion } = req.body;
  const db = getDatabase();

  const [displays] = await db.query('SELECT id FROM displays WHERE token = ?', [token]);

  if (displays.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found',
      code: 'DISPLAY_NOT_FOUND'
    });
  }

  const display = displays[0];

  await db.query(
    `UPDATE displays
     SET last_heartbeat   = CURRENT_TIMESTAMP,
         current_channel_id = COALESCE(?, current_channel_id),
         last_status        = COALESCE(?, last_status),
         now_playing        = COALESCE(?, now_playing),
         uptime_seconds     = COALESCE(?, uptime_seconds),
         app_version        = COALESCE(?, app_version)
     WHERE id = ?`,
    [
      current_channel_id || null,
      status     || null,
      nowPlaying || null,
      uptime     || null,
      appVersion || null,
      display.id
    ]
  );

  res.json({ success: true, message: 'Heartbeat updated' });
}));

/**
 * POST /api/displays/screenshot
 * Body: { token, imageData }  imageData = base64 JPEG from kiosk canvas capture
 */
router.post('/screenshot', displayLimiter, verifyDisplayToken, asyncHandler(async (req, res) => {
  const { token, imageData } = req.body;
  if (!imageData) return res.status(400).json({ success: false, error: 'No imageData' });
  // Limit screenshot to ~2MB base64 (~1.5MB decoded)
  if (imageData.length > 2 * 1024 * 1024) return res.status(413).json({ success: false, error: 'Screenshot too large' });

  const db = getDatabase();
  const [rows] = await db.query('SELECT id FROM displays WHERE token = ?', [token]);
  if (!rows.length) return res.status(404).json({ success: false });

  const displayId = rows[0].id;
  const screenshotsDir = path.join(__dirname, '../uploads/screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const filename  = `display-${displayId}.jpg`;
  const filepath  = path.join(screenshotsDir, filename);
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));

  const url = `/uploads/screenshots/${filename}`;
  await db.query(
    'UPDATE displays SET last_screenshot_url = ?, last_screenshot_at = NOW() WHERE id = ?',
    [url, displayId]
  );
  res.json({ success: true, url });
}));

/**
 * GET /api/displays/:id/screenshot
 * Returns latest screenshot info for a display
 */
router.get('/:id/screenshot', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [rows] = await db.query(
    'SELECT last_screenshot_url, last_screenshot_at FROM displays WHERE id = ?',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ success: false });
  res.json({ success: true, url: rows[0].last_screenshot_url, taken_at: rows[0].last_screenshot_at });
}));

/**
 * GET /api/displays/commands/:token
 * Poll for pending commands + active override (public endpoint for displays)
 */
router.get('/commands/:token', displayLimiter, asyncHandler(async (req, res) => {
  const { token } = req.params;
  const db = getDatabase();

  const [displays] = await db.query(
    'SELECT id, zone_id FROM displays WHERE token = ?',
    [token]
  );

  if (displays.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found',
      code: 'DISPLAY_NOT_FOUND'
    });
  }

  const display = displays[0];

  // Pending commands
  const [commands] = await db.query(
    'SELECT * FROM display_commands WHERE display_id = ? AND is_executed = FALSE ORDER BY created_at ASC',
    [display.id]
  );

  // Active emergency override for this display or its zone
  let override = null;
  try {
    const [overrides] = await db.query(
      `SELECT eo.*, p.m3u_url, p.name AS playlist_name
       FROM emergency_overrides eo
       LEFT JOIN playlists p ON p.id = eo.playlist_id
       WHERE eo.is_active = 1
         AND eo.expires_at > NOW()
         AND (
           eo.display_id = ? OR
           eo.zone_id    = ? OR
           (eo.display_id IS NULL AND eo.zone_id IS NULL)
         )
       ORDER BY eo.started_at DESC
       LIMIT 1`,
      [display.id, display.zone_id || -1]
    );
    if (overrides.length) override = overrides[0];
  } catch {
    // emergency_overrides table may not exist yet on first boot — safe to ignore
  }

  res.json({ success: true, commands, override });
}));

/**
 * GET /api/displays/events/:token
 * Server-Sent Events stream for real-time kiosk command delivery.
 * Falls back gracefully: clients that can't connect revert to the 2s polling
 * endpoint above.  The stream sends:
 *   - "connected" event on open
 *   - "command" event whenever a new unexecuted command exists
 *   - "keepalive" comment every 25 s to prevent proxy timeouts
 */
const sseClients = new Map(); // token → Set<res>

router.get('/events/:token', displayLimiter, asyncHandler(async (req, res) => {
  const { token } = req.params;
  const db = getDatabase();

  const [displays] = await db.query('SELECT id FROM displays WHERE token = ?', [token]);
  if (displays.length === 0) {
    return res.status(404).json({ success: false, error: 'Display not found' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx
  res.flushHeaders();

  // Register client
  if (!sseClients.has(token)) sseClients.set(token, new Set());
  const clients = sseClients.get(token);
  clients.add(res);

  res.write('event: connected\ndata: {}\n\n');

  // Keepalive every 25 s
  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 25_000);

  // Send any currently pending commands immediately on connect
  db.query(
    'SELECT * FROM display_commands WHERE display_id = ? AND is_executed = FALSE ORDER BY created_at ASC',
    [displays[0].id]
  ).then(([cmds]) => {
    if (cmds.length) {
      res.write(`event: command\ndata: ${JSON.stringify({ commands: cmds })}\n\n`);
    }
  }).catch(() => {});

  req.on('close', () => {
    clearInterval(keepalive);
    clients.delete(res);
    if (clients.size === 0) sseClients.delete(token);
  });
}));

/**
 * Internal helper used by the command-creation route to push events to
 * any connected SSE clients for a given display token.
 */
function pushCommandToSSE(token, commands) {
  const clients = sseClients.get(token);
  if (!clients || clients.size === 0) return;
  const payload = `event: command\ndata: ${JSON.stringify({ commands })}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { /* client disconnected */ }
  }
}

/**
 * PATCH /api/displays/commands/:id/execute
 * Mark command as executed (public endpoint for displays)
 */
router.patch('/commands/:id/execute', displayLimiter, verifyDisplayToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  // Verify the command belongs to the display making the request
  const { token } = req.body;
  const [displayRows] = await db.query('SELECT id FROM displays WHERE token = ?', [token]);
  if (!displayRows.length) {
    return res.status(404).json({ success: false, error: 'Display not found' });
  }

  const [result] = await db.query(
    'UPDATE display_commands SET is_executed = TRUE, executed_at = CURRENT_TIMESTAMP WHERE id = ? AND display_id = ? AND is_executed = FALSE',
    [id, displayRows[0].id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, error: 'Command not found or already executed' });
  }

  res.json({
    success: true,
    message: 'Command marked as executed'
  });
}));

// Protected routes below require authentication
// Some routes check for admin OR specific permissions
router.use(verifyToken);

/**
 * GET /api/displays
 * List all displays (requires permission)
 */
router.get('/', 
  checkPermission('can_manage_displays'),
  asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  const [displays] = await db.query('SELECT * FROM displays ORDER BY created_at DESC');
  
  // Calculate status for each display (online if heartbeat < 90 seconds ago)
  const now = new Date();
  const enrichedDisplays = displays.map(display => {
    let status = 'offline';

    if (display.last_heartbeat && display.last_heartbeat !== null) {
      const lastHeartbeat = new Date(display.last_heartbeat);
      const secondsAgo = (now - lastHeartbeat) / 1000;
      if (secondsAgo < 90) {
        status = 'online';
      }
    }
    
    return sanitizeDisplay({
      ...display,
      status,
      auto_play: display.auto_play === 1,
      schedule_enabled: display.schedule_enabled === 1,
      is_active: display.is_active === 1
    });
  });
  
  res.json({
    success: true,
    displays: enrichedDisplays
  });
}));

/**
 * POST /api/displays
 * Create new display (requires permission and checks limit)
 */
router.post('/', 
  checkPermission('can_manage_displays'),
  checkResourceLimit('displays', 'displays', {
    countQuery: 'SELECT COUNT(*) as count FROM displays WHERE created_by = ?',
    countParamsBuilder: (req) => [req.user.id]
  }),
  validateDisplayCreate, 
  asyncHandler(async (req, res) => {
  const { name, location, playlist_id } = req.body;
  const db = getDatabase();
  
  // Generate unique token
  const token = uuidv4();
  
  // Insert display
  let result;
  try {
    [result] = await db.query(
      'INSERT INTO displays (name, location, playlist_id, token, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, location, playlist_id, token, req.user.id]
    );
  } catch (error) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      [result] = await db.query(
        'INSERT INTO displays (name, location, playlist_id, token) VALUES (?, ?, ?, ?)',
        [name, location, playlist_id, token]
      );
    } else {
      throw error;
    }
  }
  
  const [displays] = await db.query('SELECT * FROM displays WHERE id = ?', [result.insertId]);
  
  res.status(201).json({
    success: true,
    display: {
      ...sanitizeDisplay(displays[0]),
      displayUrl: `/display?token=${token}`
    }
  });
}));

/**
 * GET /api/displays/:id
 * Get display details (Admin only)
 */
router.get('/:id', checkPermission('can_manage_displays'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const [displays] = await db.query('SELECT * FROM displays WHERE id = ?', [id]);
  
  if (displays.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found',
      code: 'DISPLAY_NOT_FOUND'
    });
  }
  
  res.json({
    success: true,
    display: sanitizeDisplay(displays[0])
  });
}));

/**
 * PUT /api/displays/:id
 * Update display (Admin only)
 */
router.put('/:id', checkPermission('can_manage_displays'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { name, location, playlist_id, current_channel_id, is_active, auto_play, schedule_enabled,
          zone_id, media_playlist_id, display_type, is_outdoor, mute_audio,
          day_playlist_id, night_playlist_id, day_start_time, night_start_time,
          show_clock_overlay, show_brand_overlay } = req.body;
  
  const [existing] = await db.query('SELECT id FROM displays WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found',
      code: 'DISPLAY_NOT_FOUND'
    });
  }
  
  // Build update query
  const updates = [];
  const params = [];
  
  if (name               !== undefined) { updates.push('name = ?');               params.push(name); }
  if (location           !== undefined) { updates.push('location = ?');           params.push(location); }
  if (playlist_id        !== undefined) { updates.push('playlist_id = ?');        params.push(playlist_id); }
  if (current_channel_id !== undefined) { updates.push('current_channel_id = ?'); params.push(current_channel_id); }
  if (zone_id            !== undefined) { updates.push('zone_id = ?');            params.push(zone_id); }
  if (media_playlist_id  !== undefined) { updates.push('media_playlist_id = ?'); params.push(media_playlist_id); }
  if (display_type       !== undefined) { updates.push('display_type = ?');       params.push(display_type); }
  if (is_outdoor         !== undefined) { updates.push('is_outdoor = ?');         params.push(is_outdoor ? 1 : 0); }
  if (mute_audio         !== undefined) { updates.push('mute_audio = ?');         params.push(mute_audio ? 1 : 0); }
  if (day_playlist_id    !== undefined) { updates.push('day_playlist_id = ?');    params.push(day_playlist_id); }
  if (night_playlist_id  !== undefined) { updates.push('night_playlist_id = ?');  params.push(night_playlist_id); }
  if (day_start_time     !== undefined) { updates.push('day_start_time = ?');     params.push(day_start_time); }
  if (night_start_time   !== undefined) { updates.push('night_start_time = ?');   params.push(night_start_time); }
  if (show_clock_overlay !== undefined) { updates.push('show_clock_overlay = ?'); params.push(show_clock_overlay ? 1 : 0); }
  if (show_brand_overlay !== undefined) { updates.push('show_brand_overlay = ?'); params.push(show_brand_overlay ? 1 : 0); }
  if (req.body.overlay_mode      !== undefined) { updates.push('overlay_mode = ?');      params.push(req.body.overlay_mode); }
  if (req.body.overlay_safe_area !== undefined) { updates.push('overlay_safe_area = ?'); params.push(req.body.overlay_safe_area); }
  // WiFi QR
  if (req.body.show_wifi_qr     !== undefined) { updates.push('show_wifi_qr = ?');     params.push(req.body.show_wifi_qr ? 1 : 0); }
  if (req.body.wifi_ssid        !== undefined) { updates.push('wifi_ssid = ?');        params.push(req.body.wifi_ssid || null); }
  if (req.body.wifi_password    !== undefined) { updates.push('wifi_password = ?');    params.push(req.body.wifi_password || null); }
  if (req.body.wifi_security    !== undefined) { updates.push('wifi_security = ?');    params.push(req.body.wifi_security || 'WPA'); }
  if (req.body.wifi_qr_position !== undefined) { updates.push('wifi_qr_position = ?'); params.push(req.body.wifi_qr_position || 'bottom-right'); }
  // Auto-reboot
  if (req.body.auto_reboot_time !== undefined) { updates.push('auto_reboot_time = ?'); params.push(req.body.auto_reboot_time || null); }
  // Auto-failover
  if (req.body.failover_playlist_id   !== undefined) { updates.push('failover_playlist_id = ?');   params.push(req.body.failover_playlist_id   || null); }
  if (req.body.failover_after_minutes !== undefined) { updates.push('failover_after_minutes = ?'); params.push(req.body.failover_after_minutes ?? 5); }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }
  
  if (auto_play !== undefined) {
    updates.push('auto_play = ?');
    params.push(auto_play ? 1 : 0);
  }
  
  if (schedule_enabled !== undefined) {
    updates.push('schedule_enabled = ?');
    params.push(schedule_enabled ? 1 : 0);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No fields to update',
      code: 'VALIDATION_ERROR'
    });
  }
  
  params.push(id);
  
  await db.query(`UPDATE displays SET ${updates.join(', ')} WHERE id = ?`, params);
  
  const [displays] = await db.query('SELECT * FROM displays WHERE id = ?', [id]);
  
  res.json({
    success: true,
    display: sanitizeDisplay(displays[0])
  });
}));

/**
 * DELETE /api/displays/:id
 * Delete display (Admin only)
 */
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const [existing] = await db.query('SELECT id FROM displays WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found',
      code: 'DISPLAY_NOT_FOUND'
    });
  }
  
  // Delete display (cascades to commands and schedules)
  await db.query('DELETE FROM displays WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: 'Display deleted successfully'
  });
}));

/**
 * GET /api/displays/:id/status
 * Get display status and details (Admin only)
 */
router.get('/:id/status', checkPermission('can_manage_displays'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const [displays] = await db.query('SELECT * FROM displays WHERE id = ?', [id]);
  
  if (displays.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found',
      code: 'DISPLAY_NOT_FOUND'
    });
  }
  
  const display = displays[0];
  
  let status = 'offline';
  let minutesSinceHeartbeat = null;
  
  if (display.last_heartbeat) {
    const now = new Date();
    const lastHeartbeat = new Date(display.last_heartbeat);
    minutesSinceHeartbeat = (now - lastHeartbeat) / 1000 / 60;
    if (minutesSinceHeartbeat < 1.5) { // 90 seconds, consistent with list endpoint
      status = 'online';
    }
  }
  
  res.json({
    success: true,
    status,
    display: sanitizeDisplay(display),
    minutesSinceHeartbeat: minutesSinceHeartbeat ? Math.round(minutesSinceHeartbeat) : null
  });
}));

/**
 * POST /api/displays/:id/control
 * Send remote control command to display (requires permission)
 */
router.post('/:id/control', 
  checkPermission('can_control_displays'),
  asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { action, channel_id, channel_name, volume } = req.body;
  
  if (!action) {
    return res.status(400).json({
      success: false,
      error: 'Action is required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  const [existing] = await db.query('SELECT id FROM displays WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found',
      code: 'DISPLAY_NOT_FOUND'
    });
  }
  
  // Create command data based on action type
  let commandData = {};
  
  switch (action) {
    case 'change_channel':
      commandData = { channel_id, channel_name };
      break;
    case 'set_volume':
      commandData = { volume };
      break;
    case 'mute':
    case 'unmute':
      commandData = {};
      break;
    default:
      commandData = { channel_id, channel_name, volume };
  }
  
  const commandDataStr = JSON.stringify(commandData);
  
  const [result] = await db.query(
    'INSERT INTO display_commands (display_id, command_type, command_data) VALUES (?, ?, ?)',
    [id, action, commandDataStr]
  );
  
  const [commands] = await db.query('SELECT * FROM display_commands WHERE id = ?', [result.insertId]);
  
  res.status(201).json({
    success: true,
    command: commands[0],
    message: 'Command queued for display'
  });
}));

/**
 * POST /api/displays/:id/enable-pairing
 * Open a 10-minute pairing window for this display (admin only)
 */
router.post('/:id/enable-pairing', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const parsed = parseInt(req.body.minutes, 10);
  const minutes = (Number.isFinite(parsed) && parsed > 0 && parsed <= 60) ? parsed : 10;
  const until = new Date(Date.now() + minutes * 60 * 1000);

  const [existing] = await db.query('SELECT id FROM displays WHERE id = ?', [id]);
  if (!existing.length) return res.status(404).json({ success: false, error: 'Display not found' });

  await db.query('UPDATE displays SET pairing_enabled_until = ? WHERE id = ?', [until, id]);
  res.json({ success: true, pairing_enabled_until: until, message: `Pairing window open for ${minutes} min` });
}));

module.exports = router;
