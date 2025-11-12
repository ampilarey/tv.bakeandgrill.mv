const express = require('express');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication and admin role
router.use(verifyToken, requireAdmin);

/**
 * GET /api/notifications
 * Get all notifications for admin
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { limit = 50 } = req.query;
  
  const [notifications] = await db.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [req.user.id, parseInt(limit)]
  );
  
  res.json({
    success: true,
    notifications
  });
}));

/**
 * POST /api/notifications
 * Create a notification (system use)
 */
router.post('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { user_id, type, title, message } = req.body;
  
  const [result] = await db.query(
    'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
    [user_id, type, title, message]
  );
  
  const [notifications] = await db.query(
    'SELECT * FROM notifications WHERE id = ?',
    [result.insertId]
  );
  
  res.status(201).json({
    success: true,
    notification: notifications[0]
  });
}));

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  await db.query(
    'UPDATE notifications SET `read` = 1 WHERE id = ? AND user_id = ?',
    [id, req.user.id]
  );
  
  res.json({
    success: true,
    message: 'Notification marked as read'
  });
}));

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  const [result] = await db.query(
    'UPDATE notifications SET `read` = 1 WHERE user_id = ?',
    [req.user.id]
  );
  
  res.json({
    success: true,
    message: `Marked ${result.affectedRows} notifications as read`
  });
}));

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  await db.query(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [id, req.user.id]
  );
  
  res.json({
    success: true,
    message: 'Notification deleted'
  });
}));

module.exports = router;

