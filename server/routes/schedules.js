const express = require('express');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateScheduleCreate } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication and admin role
router.use(verifyToken, requireAdmin);

/**
 * GET /api/displays/:displayId/schedules
 * Get all schedules for a display (Phase 5: with date range filtering)
 */
router.get('/displays/:displayId/schedules', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { displayId } = req.params;
  const { date, priority, schedule_type } = req.query;
  
  let query = 'SELECT * FROM display_schedules WHERE display_id = ?';
  const params = [displayId];
  
  // Filter by date (if provided)
  if (date) {
    query += ' AND (date_start IS NULL OR date_start <= ?) AND (date_end IS NULL OR date_end >= ?)';
    params.push(date, date);
  }
  
  // Filter by priority (if provided)
  if (priority !== undefined) {
    query += ' AND priority = ?';
    params.push(priority);
  }
  
  // Filter by schedule type (if provided)
  if (schedule_type) {
    query += ' AND schedule_type = ?';
    params.push(schedule_type);
  }
  
  // Order by priority (desc), then date, then time
  query += ' ORDER BY priority DESC, date_start ASC, day_of_week ASC, start_time ASC';
  
  const [schedules] = await db.query(query, params);
  
  res.json({
    success: true,
    schedules
  });
}));

/**
 * POST /api/displays/:displayId/schedules
 * Create new schedule for a display (Phase 5: with date ranges, priorities, presets)
 */
router.post('/displays/:displayId/schedules', validateScheduleCreate, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { displayId } = req.params;
  const {
    channel_id,
    channel_name,
    playlist_id,
    day_of_week,
    start_time,
    end_time,
    date_start,
    date_end,
    priority = 0,
    schedule_type = 'time_of_day',
    event_name,
    meal_period,
    is_recurring = false,
    is_active = true
  } = req.body;
  
  // Check if display exists
  const [displays] = await db.query('SELECT id FROM displays WHERE id = ?', [displayId]);
  
  if (displays.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found',
      code: 'DISPLAY_NOT_FOUND'
    });
  }
  
  // Check for conflicts if priority is being set
  if (priority > 0 && day_of_week !== null && start_time && end_time) {
    const conflicts = await checkScheduleConflicts(db, displayId, {
      day_of_week,
      start_time,
      end_time,
      date_start,
      date_end
    });
    
    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Schedule conflict detected',
        code: 'SCHEDULE_CONFLICT',
        conflicts
      });
    }
  }
  
  // Insert schedule (Phase 5: with new fields)
  const [result] = await db.query(
    `INSERT INTO display_schedules (
      display_id, channel_id, channel_name, playlist_id,
      day_of_week, start_time, end_time,
      date_start, date_end, priority, schedule_type,
      event_name, meal_period, is_recurring, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      displayId, channel_id, channel_name, playlist_id,
      day_of_week, start_time, end_time,
      date_start || null, date_end || null, priority, schedule_type,
      event_name || null, meal_period || null, is_recurring ? 1 : 0, is_active ? 1 : 0
    ]
  );
  
  // Get created schedule
  const [schedules] = await db.query('SELECT * FROM display_schedules WHERE id = ?', [result.insertId]);
  
  res.status(201).json({
    success: true,
    schedule: schedules[0]
  });
}));

/**
 * GET /api/schedules/:id
 * Get single schedule
 */
router.get('/schedules/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const [schedules] = await db.query('SELECT * FROM display_schedules WHERE id = ?', [id]);
  
  if (schedules.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Schedule not found',
      code: 'SCHEDULE_NOT_FOUND'
    });
  }
  
  res.json({
    success: true,
    schedule: schedules[0]
  });
}));

/**
 * PUT /api/schedules/:id
 * Update schedule
 */
router.put('/schedules/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { channel_id, channel_name, day_of_week, start_time, end_time, is_active } = req.body;
  
  const [existing] = await db.query('SELECT id FROM display_schedules WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Schedule not found',
      code: 'SCHEDULE_NOT_FOUND'
    });
  }
  
  // Build update query
  const updates = [];
  const params = [];
  
  if (channel_id !== undefined) {
    updates.push('channel_id = ?');
    params.push(channel_id);
  }
  
  if (channel_name !== undefined) {
    updates.push('channel_name = ?');
    params.push(channel_name);
  }
  
  if (day_of_week !== undefined) {
    updates.push('day_of_week = ?');
    params.push(day_of_week);
  }
  
  if (start_time !== undefined) {
    updates.push('start_time = ?');
    params.push(start_time);
  }
  
  if (end_time !== undefined) {
    updates.push('end_time = ?');
    params.push(end_time);
  }
  
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No fields to update',
      code: 'VALIDATION_ERROR'
    });
  }
  
  params.push(id);
  
  await db.query(`UPDATE display_schedules SET ${updates.join(', ')} WHERE id = ?`, params);
  
  // Get updated schedule
  const [schedules] = await db.query('SELECT * FROM display_schedules WHERE id = ?', [id]);
  
  res.json({
    success: true,
    schedule: schedules[0]
  });
}));

/**
 * DELETE /api/schedules/:id
 * Delete schedule
 */
router.delete('/schedules/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const [existing] = await db.query('SELECT id FROM display_schedules WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Schedule not found',
      code: 'SCHEDULE_NOT_FOUND'
    });
  }
  
  await db.query('DELETE FROM display_schedules WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: 'Schedule deleted successfully'
  });
}));

/**
 * GET /api/schedules/current/:displayId
 * Get current scheduled channel for a display (Phase 5: with date ranges and priorities)
 */
router.get('/schedules/current/:displayId', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { displayId } = req.params;
  
  // Get current day and time
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Find matching schedule (Phase 5: with date ranges and priority)
  const [schedules] = await db.query(
    `SELECT * FROM display_schedules 
     WHERE display_id = ? 
     AND is_active = TRUE
     AND (date_start IS NULL OR date_start <= ?)
     AND (date_end IS NULL OR date_end >= ?)
     AND (day_of_week = ? OR day_of_week IS NULL OR schedule_type != 'time_of_day')
     AND (start_time <= ? OR schedule_type != 'time_of_day')
     AND (end_time >= ? OR schedule_type != 'time_of_day')
     ORDER BY priority DESC, date_start DESC, start_time DESC
     LIMIT 1`,
    [displayId, currentDate, currentDate, dayOfWeek, currentTime, currentTime]
  );
  
  if (schedules.length > 0) {
    res.json({
      success: true,
      schedule: schedules[0]
    });
  } else {
    res.json({
      success: true,
      schedule: null,
      message: 'No active schedule for current time'
    });
  }
}));

/**
 * Check for schedule conflicts (Phase 5)
 */
async function checkScheduleConflicts(db, displayId, schedule) {
  const { day_of_week, start_time, end_time, date_start, date_end } = schedule;
  
  // Two time ranges [s1,e1] and [s2,e2] overlap when s1 < e2 AND e1 > s2
  const [conflicts] = await db.query(
    `SELECT * FROM display_schedules
     WHERE display_id = ?
     AND is_active = TRUE
     AND (
       (date_start IS NULL AND date_end IS NULL) OR
       (date_start <= ? AND date_end >= ?) OR
       (? <= date_end AND ? >= date_start)
     )
     AND (
       (day_of_week = ? OR day_of_week IS NULL) AND
       (start_time < ? AND end_time > ?)
     )`,
    [
      displayId,
      date_end || '2099-12-31',
      date_start || '1900-01-01',
      date_start || '1900-01-01',
      date_end || '2099-12-31',
      day_of_week,
      end_time,
      start_time
    ]
  );
  
  return conflicts;
}

/**
 * GET /api/schedules/presets
 * Get schedule presets (Phase 5)
 */
router.get('/schedules/presets', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { schedule_type } = req.query;
  
  let query = 'SELECT * FROM schedule_presets WHERE 1=1';
  const params = [];
  
  if (schedule_type) {
    query += ' AND schedule_type = ?';
    params.push(schedule_type);
  }
  
  query += ' ORDER BY is_system DESC, created_at DESC';
  
  const [presets] = await db.query(query, params);
  
  res.json({
    success: true,
    presets
  });
}));

/**
 * POST /api/schedules/apply-preset/:presetId
 * Apply a schedule preset to displays (Phase 5)
 */
router.post('/schedules/apply-preset/:presetId', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { presetId } = req.params;
  const { displayIds } = req.body; // Array of display IDs
  
  if (!Array.isArray(displayIds) || displayIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'displayIds array required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  // Get preset
  const [presets] = await db.query('SELECT * FROM schedule_presets WHERE id = ?', [presetId]);
  
  if (presets.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Preset not found',
      code: 'PRESET_NOT_FOUND'
    });
  }
  
  const preset = presets[0];
  const config = typeof preset.config === 'string' ? JSON.parse(preset.config) : preset.config;
  
  // Apply preset to each display
  const appliedSchedules = [];
  
  for (const displayId of displayIds) {
    // Check if display exists
    const [displays] = await db.query('SELECT id FROM displays WHERE id = ?', [displayId]);
    if (displays.length === 0) continue;
    
    // Create schedule from preset config
    const [result] = await db.query(
      `INSERT INTO display_schedules (
        display_id, day_of_week, start_time, end_time,
        schedule_type, priority, meal_period, event_name, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        displayId,
        config.days ? JSON.stringify(config.days) : config.day_of_week || null,
        config.start_time || null,
        config.end_time || null,
        preset.schedule_type,
        config.priority || 0,
        config.meal_period || null,
        config.event_name || null,
        true
      ]
    );
    
    const [schedules] = await db.query('SELECT * FROM display_schedules WHERE id = ?', [result.insertId]);
    appliedSchedules.push(schedules[0]);
  }
  
  res.json({
    success: true,
    message: `Preset applied to ${appliedSchedules.length} display(s)`,
    schedules: appliedSchedules
  });
}));

/**
 * GET /api/schedules/conflicts/:displayId
 * Check for schedule conflicts (Phase 5)
 */
router.get('/schedules/conflicts/:displayId', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { displayId } = req.params;
  
  // Get all active schedules
  const [schedules] = await db.query(
    'SELECT * FROM display_schedules WHERE display_id = ? AND is_active = TRUE',
    [displayId]
  );
  
  // Check for overlaps
  const conflicts = [];
  
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const s1 = schedules[i];
      const s2 = schedules[j];
      
      // Check if they overlap (simplified check)
      if (s1.day_of_week === s2.day_of_week) {
        if (s1.start_time < s2.end_time && s1.end_time > s2.start_time) {
          conflicts.push({
            schedule1: s1,
            schedule2: s2,
            reason: 'Time overlap'
          });
        }
      }
    }
  }
  
  res.json({
    success: true,
    conflicts
  });
}));

module.exports = router;
