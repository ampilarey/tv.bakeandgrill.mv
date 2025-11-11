const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin, verifyDisplayToken } = require('../middleware/auth');
const { validateDisplayCreate } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkPermission, checkResourceLimit } = require('../middleware/permissions');
const axios = require('axios');
const { parseM3U } = require('../utils/m3uParser');

const router = express.Router();

/**
 * POST /api/displays/verify
 * Verify display token (public endpoint for displays)
 */
router.post('/verify', verifyDisplayToken, asyncHandler(async (req, res) => {
  const { token } = req.body;
  const db = getDatabase();
  const axios = require('axios');
  const { parseM3U } = require('../utils/m3uParser');
  
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
        const m3uResponse = await axios.get(playlist.m3u_url, {
          timeout: 10000,
          headers: { 'User-Agent': 'BakeGrillTV/1.0' }
        });
        channels = parseM3U(m3uResponse.data);
      } catch (error) {
        console.error('Error fetching M3U for display:', error.message);
      }
    }
  }
  
  res.json({
    success: true,
    display: {
      id: display.id,
      name: display.name,
      location: display.location,
      playlistId: display.playlist_id,
      currentChannelId: display.current_channel_id,
      autoPlay: display.auto_play === 1,
      scheduleEnabled: display.schedule_enabled === 1
    },
    playlist,
    channels // Include channels in response
  });
}));

/**
 * POST /api/displays/heartbeat
 * Update display heartbeat (public endpoint for displays)
 */
router.post('/heartbeat', verifyDisplayToken, asyncHandler(async (req, res) => {
  const { token, current_channel_id } = req.body;
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
  
  // Update heartbeat and optional current channel
  if (current_channel_id) {
    await db.query(
      'UPDATE displays SET last_heartbeat = CURRENT_TIMESTAMP, current_channel_id = ? WHERE id = ?',
      [current_channel_id, display.id]
    );
  } else {
    await db.query('UPDATE displays SET last_heartbeat = CURRENT_TIMESTAMP WHERE id = ?', [display.id]);
  }
  
  res.json({
    success: true,
    message: 'Heartbeat updated'
  });
}));

/**
 * GET /api/displays/commands/:token
 * Poll for pending commands (public endpoint for displays)
 */
router.get('/commands/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
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
  
  // Get unexecuted commands
  const [commands] = await db.query(
    'SELECT * FROM display_commands WHERE display_id = ? AND is_executed = FALSE ORDER BY created_at ASC',
    [display.id]
  );
  
  res.json({
    success: true,
    commands
  });
}));

/**
 * PATCH /api/displays/commands/:id/execute
 * Mark command as executed (public endpoint for displays)
 */
router.patch('/commands/:id/execute', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  await db.query('UPDATE display_commands SET is_executed = TRUE, executed_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  
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
  
  // Calculate status for each display (online if heartbeat < 45 seconds ago)
  const now = new Date();
  const enrichedDisplays = displays.map(display => {
    let status = 'offline';
    
    // Check if display has ever sent a heartbeat
    if (display.last_heartbeat && display.last_heartbeat !== null) {
      const lastHeartbeat = new Date(display.last_heartbeat);
      const secondsAgo = (now - lastHeartbeat) / 1000;
      
      // Display is online if heartbeat was within last 45 seconds (displays heartbeat every 30s)
      if (secondsAgo < 45) {
        status = 'online';
      }
    }
    
    return {
      ...display,
      status,
      auto_play: display.auto_play === 1,
      schedule_enabled: display.schedule_enabled === 1,
      is_active: display.is_active === 1
    };
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
  
  // Get created display
  const [displays] = await db.query('SELECT * FROM displays WHERE id = ?', [result.insertId]);
  
  res.status(201).json({
    success: true,
    display: {
      ...displays[0],
      displayUrl: `/display?token=${token}`
    }
  });
}));

/**
 * GET /api/displays/:id
 * Get display details (Admin only)
 */
router.get('/:id', asyncHandler(async (req, res) => {
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
    display: displays[0]
  });
}));

/**
 * PUT /api/displays/:id
 * Update display (Admin only)
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { name, location, playlist_id, current_channel_id, is_active, auto_play, schedule_enabled } = req.body;
  
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
  
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  
  if (location !== undefined) {
    updates.push('location = ?');
    params.push(location);
  }
  
  if (playlist_id !== undefined) {
    updates.push('playlist_id = ?');
    params.push(playlist_id);
  }
  
  if (current_channel_id !== undefined) {
    updates.push('current_channel_id = ?');
    params.push(current_channel_id);
  }
  
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
  
  // Get updated display
  const [displays] = await db.query('SELECT * FROM displays WHERE id = ?', [id]);
  
  res.json({
    success: true,
    display: displays[0]
  });
}));

/**
 * DELETE /api/displays/:id
 * Delete display (Admin only)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
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
router.get('/:id/status', asyncHandler(async (req, res) => {
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
  
  // Calculate status
  let status = 'offline';
  let minutesSinceHeartbeat = null;
  
  if (display.last_heartbeat) {
    const now = new Date();
    const lastHeartbeat = new Date(display.last_heartbeat);
    minutesSinceHeartbeat = (now - lastHeartbeat) / 1000 / 60;
    
    if (minutesSinceHeartbeat < 5) {
      status = 'online';
    }
  }
  
  res.json({
    success: true,
    status,
    display,
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

module.exports = router;
