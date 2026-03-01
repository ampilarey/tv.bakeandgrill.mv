/**
 * Display Scenes API
 * Save and restore full display configuration snapshots.
 *
 * A "scene" is a named JSON snapshot of ALL active display settings.
 * Applying a scene does a bulk PUT to restore every display's settings.
 *
 * GET  /api/display-scenes              — list scenes
 * POST /api/display-scenes              — create (snapshot current displays)
 * PUT  /api/display-scenes/:id          — rename / edit description
 * DELETE /api/display-scenes/:id        — delete scene
 * POST /api/display-scenes/:id/apply   — restore all displays to snapshot
 * POST /api/display-scenes/:id/update  — re-snapshot current state into existing scene
 */
const express = require('express');
const { getDatabase }               = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler }              = require('../middleware/errorHandler');

const router = express.Router();
router.use(verifyToken, requireAdmin);

const SNAP_FIELDS = [
  'name','location','display_type','playlist_id','media_playlist_id',
  'overlay_mode','overlay_safe_area','zone_id','is_outdoor','mute_audio',
  'show_brand_overlay','show_clock_overlay','day_playlist_id','night_playlist_id',
  'day_start_time','night_start_time','show_wifi_qr','wifi_ssid','wifi_password',
  'wifi_security','wifi_qr_position','auto_reboot_time',
];

async function snapshotDisplays(db) {
  const [displays] = await db.query(
    `SELECT id, ${SNAP_FIELDS.join(',')} FROM displays WHERE is_active = 1 ORDER BY id`
  );
  return displays.map(d => {
    const snap = { display_id: d.id };
    SNAP_FIELDS.forEach(f => { snap[f] = d[f] ?? null; });
    return snap;
  });
}

/** GET /api/display-scenes */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [scenes] = await db.query(`
    SELECT s.*, u.email AS created_by_email,
           JSON_LENGTH(s.snapshot_json) AS display_count
    FROM display_scenes s
    LEFT JOIN users u ON u.id = s.created_by
    ORDER BY s.created_at DESC
  `);
  res.json({ success: true, scenes });
}));

/** POST /api/display-scenes — create from current state */
router.post('/', asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name is required' });

  const db = getDatabase();
  const snapshot = await snapshotDisplays(db);

  const [result] = await db.query(
    'INSERT INTO display_scenes (name, description, snapshot_json, created_by) VALUES (?, ?, ?, ?)',
    [name, description || null, JSON.stringify(snapshot), req.user.id]
  );
  const [rows] = await db.query('SELECT * FROM display_scenes WHERE id = ?', [result.insertId]);
  res.status(201).json({ success: true, scene: rows[0], display_count: snapshot.length });
}));

/** PUT /api/display-scenes/:id */
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const db = getDatabase();
  await db.query(
    'UPDATE display_scenes SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
    [name || null, description !== undefined ? (description || null) : null, req.params.id]
  );
  const [rows] = await db.query('SELECT * FROM display_scenes WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Scene not found' });
  res.json({ success: true, scene: rows[0] });
}));

/** DELETE /api/display-scenes/:id */
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  await db.query('DELETE FROM display_scenes WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

/** POST /api/display-scenes/:id/apply — restore snapshot */
router.post('/:id/apply', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [rows] = await db.query('SELECT * FROM display_scenes WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Scene not found' });

  const snapshot = JSON.parse(rows[0].snapshot_json || '[]');
  let applied = 0;
  const errors = [];

  for (const item of snapshot) {
    const { display_id, ...settings } = item;
    if (!display_id) continue;

    // Build SET clause from non-null settings
    const setClauses = [];
    const values = [];
    for (const [key, val] of Object.entries(settings)) {
      if (key === 'name' || key === 'location') continue; // preserve current name/location
      setClauses.push(`${key} = ?`);
      values.push(val);
    }
    if (!setClauses.length) continue;
    values.push(display_id);

    try {
      await db.query(`UPDATE displays SET ${setClauses.join(', ')} WHERE id = ?`, values);
      applied++;
    } catch (e) { errors.push(`display ${display_id}: ${e.message}`); }
  }

  res.json({
    success: true,
    applied,
    total: snapshot.length,
    errors: errors.length ? errors : undefined,
    message: `Applied "${rows[0].name}" to ${applied}/${snapshot.length} displays`
  });
}));

/** POST /api/display-scenes/:id/update — re-snapshot into existing scene */
router.post('/:id/update', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const snapshot = await snapshotDisplays(db);
  await db.query(
    'UPDATE display_scenes SET snapshot_json = ?, updated_at = NOW() WHERE id = ?',
    [JSON.stringify(snapshot), req.params.id]
  );
  res.json({ success: true, display_count: snapshot.length });
}));

module.exports = router;
