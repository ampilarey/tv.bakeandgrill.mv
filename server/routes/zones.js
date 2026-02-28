const express = require('express');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.use(verifyToken);

// ---------------------------------------------------------------------------
// Zones CRUD
// ---------------------------------------------------------------------------

/** GET /api/zones — list all zones with display count */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [zones] = await db.query(`
    SELECT z.*,
           COUNT(d.id) AS display_count
    FROM zones z
    LEFT JOIN displays d ON d.zone_id = z.id AND d.is_active = 1
    GROUP BY z.id
    ORDER BY z.name
  `);
  res.json({ success: true, zones });
}));

/** POST /api/zones — create zone (admin only) */
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name is required' });
  const db = getDatabase();
  const [result] = await db.query(
    'INSERT INTO zones (name, description) VALUES (?, ?)',
    [name, description || null]
  );
  const [rows] = await db.query('SELECT * FROM zones WHERE id = ?', [result.insertId]);
  res.status(201).json({ success: true, zone: rows[0] });
}));

/** PUT /api/zones/:id — update zone (admin only) */
router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const db = getDatabase();
  await db.query(
    'UPDATE zones SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
    [name || null, description !== undefined ? description : undefined, req.params.id]
  );
  const [rows] = await db.query('SELECT * FROM zones WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Zone not found' });
  res.json({ success: true, zone: rows[0] });
}));

/** DELETE /api/zones/:id — delete zone (admin only) */
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  await db.query('UPDATE displays SET zone_id = NULL WHERE zone_id = ?', [req.params.id]);
  await db.query('DELETE FROM zones WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Zone deleted' });
}));

// ---------------------------------------------------------------------------
// Zone → displays
// ---------------------------------------------------------------------------

/** GET /api/zones/:id/displays — all displays in zone */
router.get('/:id/displays', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [displays] = await db.query(
    'SELECT * FROM displays WHERE zone_id = ? ORDER BY name',
    [req.params.id]
  );
  const now = new Date();
  const enriched = displays.map(d => ({
    ...d,
    status: d.last_heartbeat && (now - new Date(d.last_heartbeat)) / 1000 < 45 ? 'online' : 'offline'
  }));
  res.json({ success: true, displays: enriched });
}));

/** POST /api/zones/:id/command — push a command to every display in zone (admin only) */
router.post('/:id/command', requireAdmin, asyncHandler(async (req, res) => {
  const { action, channel_id, channel_name, playlist_id } = req.body;
  if (!action) return res.status(400).json({ success: false, error: 'action is required' });

  const db = getDatabase();
  const [displays] = await db.query(
    'SELECT id FROM displays WHERE zone_id = ? AND is_active = 1',
    [req.params.id]
  );

  const commandData = JSON.stringify({ channel_id, channel_name, playlist_id });
  for (const d of displays) {
    await db.query(
      'INSERT INTO display_commands (display_id, command_type, command_data) VALUES (?, ?, ?)',
      [d.id, action, commandData]
    );
  }

  res.json({ success: true, dispatched: displays.length, message: `Command sent to ${displays.length} display(s)` });
}));

// ---------------------------------------------------------------------------
// Emergency overrides
// ---------------------------------------------------------------------------

/** GET /api/zones/overrides — all active overrides */
router.get('/overrides/active', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [overrides] = await db.query(`
    SELECT eo.*,
           z.name  AS zone_name,
           d.name  AS display_name,
           p.name  AS playlist_name,
           u.email AS started_by_email
    FROM emergency_overrides eo
    LEFT JOIN zones    z ON z.id = eo.zone_id
    LEFT JOIN displays d ON d.id = eo.display_id
    LEFT JOIN playlists p ON p.id = eo.playlist_id
    LEFT JOIN users    u ON u.id = eo.started_by
    WHERE eo.is_active = 1 AND eo.expires_at > NOW()
    ORDER BY eo.started_at DESC
  `);
  res.json({ success: true, overrides });
}));

/** POST /api/zones/override — create emergency override (admin only) */
router.post('/override', requireAdmin, asyncHandler(async (req, res) => {
  const { zone_id, display_id, playlist_id, override_message, duration_minutes, target_all } = req.body;
  if (!playlist_id) return res.status(400).json({ success: false, error: 'playlist_id is required' });
  if (!target_all && !zone_id && !display_id) return res.status(400).json({ success: false, error: 'zone_id, display_id, or target_all is required' });

  const db = getDatabase();
  const dur = parseInt(duration_minutes, 10) || 60;
  const expiresAt = new Date(Date.now() + dur * 60 * 1000);

  const [result] = await db.query(
    `INSERT INTO emergency_overrides
       (zone_id, display_id, playlist_id, override_message, duration_minutes, started_by, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [zone_id || null, display_id || null, playlist_id,
     override_message || 'Emergency override active', dur, req.user.id, expiresAt]
  );

  // Determine affected displays
  let targets;
  if (target_all) {
    [targets] = await db.query('SELECT id FROM displays WHERE is_active = 1');
  } else if (zone_id) {
    [targets] = await db.query('SELECT id FROM displays WHERE zone_id = ? AND is_active = 1', [zone_id]);
  } else {
    [targets] = await db.query('SELECT id FROM displays WHERE id = ? AND is_active = 1', [display_id]);
  }

  for (const d of targets) {
    await db.query(
      'INSERT INTO display_commands (display_id, command_type, command_data) VALUES (?, ?, ?)',
      [d.id, 'check_override', JSON.stringify({ override_id: result.insertId })]
    );
  }

  res.status(201).json({
    success: true,
    override_id: result.insertId,
    expires_at: expiresAt,
    affected_displays: targets.length
  });
}));

/** DELETE /api/zones/override/:id — cancel override (admin only) */
router.delete('/override/:id', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  await db.query(
    'UPDATE emergency_overrides SET is_active = 0 WHERE id = ?',
    [req.params.id]
  );

  // Get affected displays and push revert command
  const [ovr] = await db.query('SELECT * FROM emergency_overrides WHERE id = ?', [req.params.id]);
  if (ovr.length) {
    const o = ovr[0];
    const selector = o.zone_id
      ? 'SELECT id FROM displays WHERE zone_id = ? AND is_active = 1'
      : 'SELECT id FROM displays WHERE id = ? AND is_active = 1';
    const [targets] = await db.query(selector, [o.zone_id || o.display_id]);
    for (const d of targets) {
      await db.query(
        'INSERT INTO display_commands (display_id, command_type, command_data) VALUES (?, ?, ?)',
        [d.id, 'revert_override', '{}']
      );
    }
  }

  res.json({ success: true, message: 'Override cancelled' });
}));

module.exports = router;
