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
 * Get all schedules for a display
 */
router.get('/displays/:displayId/schedules', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { displayId } = req.params;
  
  const [schedules] = await db.query(
    'SELECT * FROM display_schedules WHERE display_id = ? ORDER BY day_of_week, start_time',
    [displayId]
  );
  
  res.json({
    success: true,
    schedules
  });
}));

/**
 * POST /api/displays/:displayId/schedules
 * Create new schedule for a display
 */
router.post('/displays/:displayId/schedules', validateScheduleCreate, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { displayId } = req.params;
  const { channel_id, channel_name, day_of_week, start_time, end_time, is_active = true } = req.body;
  
  // Check if display exists
  const [displays] = await db.query('SELECT id FROM displays WHERE id = ?', [displayId]);
  
  if (displays.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found',
      code: 'DISPLAY_NOT_FOUND'
    });
  }
  
  // Insert schedule
  const [result] = await db.query(
    'INSERT INTO display_schedules (display_id, channel_id, channel_name, day_of_week, start_time, end_time, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [displayId, channel_id, channel_name, day_of_week, start_time, end_time, is_active ? 1 : 0]
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
 * Get current scheduled channel for a display (based on current time)
 */
router.get('/schedules/current/:displayId', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { displayId } = req.params;
  
  // Get current day and time
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
  
  // Find matching schedule
  const [schedules] = await db.query(
    `SELECT * FROM display_schedules 
     WHERE display_id = ? 
     AND is_active = TRUE
     AND (day_of_week = ? OR day_of_week IS NULL)
     AND start_time <= ?
     AND end_time >= ?
     ORDER BY day_of_week DESC, start_time DESC
     LIMIT 1`,
    [displayId, dayOfWeek, currentTime, currentTime]
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

module.exports = router;
