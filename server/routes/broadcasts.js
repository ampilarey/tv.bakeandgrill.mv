/**
 * Broadcasts API
 * Instant text/ticker messages pushed to all displays.
 * Under the hood creates overlay_messages with target_type='all'
 * and pushes a refresh_overlays command so displays pick it up within 2 s.
 */
const express = require('express');
const { getDatabase }               = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler }              = require('../middleware/errorHandler');

const router = express.Router();
router.use(verifyToken, requireAdmin);

async function pushRefreshCommand(db) {
  const [displays] = await db.query('SELECT id FROM displays WHERE is_active = 1');
  for (const d of displays) {
    await db.query(
      'INSERT INTO display_commands (display_id, command_type, command_data) VALUES (?, ?, ?)',
      [d.id, 'refresh_overlays', '{}']
    );
  }
  return displays.length;
}

/** GET /api/broadcasts — active broadcasts */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [rows] = await db.query(`
    SELECT * FROM overlay_messages
    WHERE target_type = 'all' AND enabled = 1
      AND (end_at IS NULL OR end_at > NOW())
    ORDER BY created_at DESC
  `);
  res.json({ success: true, broadcasts: rows });
}));

/** POST /api/broadcasts — create instant broadcast */
router.post('/', asyncHandler(async (req, res) => {
  const { text, icon, duration_minutes = 30, show_qr = false, qr_url } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'text is required' });

  const db = getDatabase();
  const dur = Math.min(Math.max(parseInt(duration_minutes) || 30, 1), 1440);
  const endAt = new Date(Date.now() + dur * 60 * 1000);

  const [result] = await db.query(
    `INSERT INTO overlay_messages
       (text, icon, enabled, priority, rotation_seconds, show_qr, qr_url,
        start_at, end_at, target_type, target_id)
     VALUES (?, ?, 1, 10, 8, ?, ?, NOW(), ?, 'all', NULL)`,
    [text, icon || null, show_qr ? 1 : 0, qr_url || null, endAt]
  );

  const count = await pushRefreshCommand(db);

  res.status(201).json({
    success: true,
    id: result.insertId,
    expires_at: endAt,
    pushed_to: count,
    message: `Broadcast active. Pushed to ${count} display(s).`
  });
}));

/** DELETE /api/broadcasts/:id — cancel broadcast */
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  await db.query(
    "UPDATE overlay_messages SET enabled = 0 WHERE id = ? AND target_type = 'all'",
    [req.params.id]
  );
  await pushRefreshCommand(db);
  res.json({ success: true, message: 'Broadcast cancelled' });
}));

module.exports = router;
