/**
 * Announcements API Routes
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { checkAnyPermission } = require('../middleware/permissions');
const { getDatabase } = require('../database/init');
const { asyncHandler } = require('../middleware/errorHandler');

async function canManageDisplay(req, displayId) {
  if (req.user.role === 'admin') return true;
  const db = getDatabase();
  const [displays] = await db.query('SELECT id FROM displays WHERE id = ?', [displayId]);
  if (displays.length === 0) return false;
  const [rows] = await db.query(
    'SELECT id FROM displays WHERE id = ? AND (created_by = ? OR user_id = ?)',
    [displayId, req.user.id, req.user.id]
  );
  if (rows.length > 0) return true;
  const [perms] = await db.query(
    'SELECT can_manage_displays, can_control_displays FROM user_permissions WHERE user_id = ?',
    [req.user.id]
  );
  return perms.length > 0 && (perms[0].can_manage_displays || perms[0].can_control_displays);
}

async function assertDisplayToken(displayId, token) {
  if (!token) return false;
  const db = getDatabase();
  const [rows] = await db.query(
    'SELECT id FROM displays WHERE id = ? AND token = ? AND is_active = 1',
    [displayId, token]
  );
  return rows.length > 0;
}

function extractDisplayToken(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.substring(7);
  return req.query.token || null;
}

/**
 * GET /api/announcements/:displayId
 * Requires valid display token for the display
 */
router.get('/:displayId', asyncHandler(async (req, res) => {
  const displayId = parseInt(req.params.displayId, 10);
  const token = extractDisplayToken(req);

  if (!(await assertDisplayToken(displayId, token))) {
    return res.status(401).json({ success: false, error: 'Valid display token required' });
  }

  const db = getDatabase();
  const [announcements] = await db.query(
    `SELECT text, text_dv, background_color, text_color, duration_seconds, expires_at, created_at
     FROM announcements
     WHERE display_id = ?
     AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC
     LIMIT 1`,
    [displayId]
  );

  res.json({
    success: true,
    announcement: announcements.length > 0 ? announcements[0] : null
  });
}));

/**
 * POST /api/announcements
 */
router.post('/', verifyToken, checkAnyPermission(['can_manage_displays', 'can_control_displays']), asyncHandler(async (req, res) => {
  const {
    display_id,
    text,
    text_dv,
    duration_seconds,
    background_color,
    text_color,
    expires_at
  } = req.body;

  if (!display_id || !text?.trim()) {
    return res.status(400).json({ success: false, message: 'display_id and text are required' });
  }

  const db = getDatabase();

  if (!(await canManageDisplay(req, display_id))) {
    return res.status(403).json({ success: false, message: 'Not authorized for this display' });
  }

  const dur = Math.min(Math.max(parseInt(duration_seconds, 10) || 30, 5), 600);
  const expiresAt = expires_at || new Date(Date.now() + dur * 1000);

  const [result] = await db.query(
    `INSERT INTO announcements (display_id, text, text_dv, duration_seconds, background_color, text_color, expires_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      display_id,
      text.trim(),
      text_dv || null,
      dur,
      background_color || '#000000',
      text_color || '#FFFFFF',
      expiresAt,
      req.user.id
    ]
  );

  res.status(201).json({
    success: true,
    announcement: { id: result.insertId, display_id, text }
  });
}));

/**
 * DELETE /api/announcements/:displayId/dismiss
 * Kiosk / display token — staff tap-to-dismiss on TV
 */
router.delete('/:displayId/dismiss', asyncHandler(async (req, res) => {
  const displayId = parseInt(req.params.displayId, 10);
  const token = extractDisplayToken(req);

  if (!(await assertDisplayToken(displayId, token))) {
    return res.status(401).json({ success: false, error: 'Valid display token required' });
  }

  const db = getDatabase();
  await db.query('DELETE FROM announcements WHERE display_id = ?', [displayId]);
  res.json({ success: true, message: 'Announcement dismissed' });
}));

/**
 * DELETE /api/announcements/:id
 */
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  const [announcements] = await db.query(
    `SELECT a.id FROM announcements a
     JOIN displays d ON d.id = a.display_id
     WHERE a.id = ? AND (d.created_by = ? OR d.user_id = ?)`,
    [id, req.user.id, req.user.id]
  );

  if (announcements.length === 0) {
    return res.status(404).json({ success: false, message: 'Announcement not found' });
  }

  await db.query('DELETE FROM announcements WHERE id = ?', [id]);
  res.json({ success: true, message: 'Announcement deleted' });
}));

/**
 * DELETE /api/announcements/display/:displayId/clear
 */
router.delete('/display/:displayId/clear', verifyToken, checkAnyPermission(['can_manage_displays', 'can_control_displays']), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const displayId = parseInt(req.params.displayId, 10);

  if (!(await canManageDisplay(req, displayId))) {
    return res.status(403).json({ success: false, message: 'Not authorized for this display' });
  }

  await db.query('DELETE FROM announcements WHERE display_id = ?', [displayId]);
  res.json({ success: true, message: 'Announcements cleared' });
}));

module.exports = router;
