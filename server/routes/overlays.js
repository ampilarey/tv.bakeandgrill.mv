/**
 * Overlays API
 * Manages overlay_messages and promo_cards for TV display overlays.
 *
 * Endpoints:
 *   GET  /api/overlays/for-display?token=X   — used by kiosk player (no auth)
 *   GET  /api/overlays/messages              — admin: list all messages
 *   POST /api/overlays/messages              — admin: create
 *   PUT  /api/overlays/messages/:id          — admin: update
 *   DELETE /api/overlays/messages/:id        — admin: delete
 *   GET  /api/overlays/cards                 — admin: list all promo cards
 *   POST /api/overlays/cards                 — admin: create
 *   PUT  /api/overlays/cards/:id             — admin: update
 *   DELETE /api/overlays/cards/:id           — admin: delete
 */
const express = require('express');
const { getDatabase }               = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler }              = require('../middleware/errorHandler');

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Filter items active right now and matching this display/zone.
 */
function filterActive(items, displayId, zoneId) {
  const now = new Date();
  return items.filter(item => {
    if (!item.enabled) return false;
    if (item.start_at && new Date(item.start_at) > now) return false;
    if (item.end_at   && new Date(item.end_at)   < now) return false;

    if (item.target_type === 'all') return true;
    if (item.target_type === 'display' && String(item.target_id) === String(displayId)) return true;
    if (item.target_type === 'zone'    && zoneId && String(item.target_id) === String(zoneId)) return true;
    return false;
  });
}

// ── Public kiosk endpoint ──────────────────────────────────────────────────

/**
 * GET /api/overlays/for-display?token=TOKEN
 * Returns overlay config + active messages + active promo cards for this display.
 * No auth required — uses display token.
 */
router.get('/for-display', asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string' || token.length > 255) {
    return res.status(400).json({ success: false, error: 'token required' });
  }

  const db = getDatabase();
  const [displays] = await db.query(
    'SELECT id, zone_id, overlay_mode, overlay_safe_area FROM displays WHERE token = ? AND is_active = 1',
    [token]
  );
  if (!displays.length) return res.status(404).json({ success: false, error: 'Display not found' });

  const display = displays[0];
  const zoneId  = display.zone_id || null;

  // Fetch all enabled messages and cards; filter in JS for time + target
  const [allMessages] = await db.query('SELECT * FROM overlay_messages WHERE enabled = 1 ORDER BY priority DESC, id ASC');
  const [allCards]    = await db.query(`
    SELECT pc.*, ma.url AS asset_url
    FROM promo_cards pc
    LEFT JOIN media_assets ma ON ma.id = pc.image_media_id
    WHERE pc.enabled = 1
    ORDER BY pc.id ASC
  `);

  const messages = filterActive(allMessages, display.id, zoneId);
  const cards    = filterActive(allCards, display.id, zoneId)
    .map(c => ({ ...c, image_url: c.image_url || c.asset_url || null }));

  res.json({
    success:     true,
    overlayMode: display.overlay_mode     || 'none',
    safeArea:    display.overlay_safe_area || 'standard',
    messages,
    cards
  });
}));

// ── Messages CRUD ──────────────────────────────────────────────────────────

router.get('/messages', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [rows] = await db.query('SELECT * FROM overlay_messages ORDER BY priority DESC, id ASC');
  res.json({ success: true, messages: rows });
}));

router.post('/messages', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { text, icon, enabled, priority, rotation_seconds, show_qr, qr_url, start_at, end_at, target_type, target_id } = req.body;
  if (!text?.trim()) return res.status(400).json({ success: false, error: 'text is required' });

  const db = getDatabase();
  const [r] = await db.query(
    `INSERT INTO overlay_messages (text, icon, enabled, priority, rotation_seconds, show_qr, qr_url, start_at, end_at, target_type, target_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [text.trim(), icon || null, enabled !== false ? 1 : 0, priority || 0,
     rotation_seconds || 8, show_qr ? 1 : 0, qr_url || null,
     start_at || null, end_at || null, target_type || 'all', target_id || null]
  );
  const [rows] = await db.query('SELECT * FROM overlay_messages WHERE id = ?', [r.insertId]);
  res.status(201).json({ success: true, message: rows[0] });
}));

router.put('/messages/:id', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const fields = ['text','icon','enabled','priority','rotation_seconds','show_qr','qr_url','start_at','end_at','target_type','target_id'];
  const updates = []; const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(['enabled','show_qr'].includes(f) ? (req.body[f] ? 1 : 0) : req.body[f]);
    }
  }
  if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
  params.push(req.params.id);
  const db = getDatabase();
  await db.query(`UPDATE overlay_messages SET ${updates.join(', ')} WHERE id = ?`, params);
  const [rows] = await db.query('SELECT * FROM overlay_messages WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: rows[0] });
}));

router.delete('/messages/:id', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  await db.query('DELETE FROM overlay_messages WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Deleted' });
}));

// ── Promo Cards CRUD ───────────────────────────────────────────────────────

router.get('/cards', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [rows] = await db.query(`
    SELECT pc.*, ma.url AS asset_url, ma.thumbnail_url AS asset_thumb
    FROM promo_cards pc
    LEFT JOIN media_assets ma ON ma.id = pc.image_media_id
    ORDER BY pc.id ASC
  `);
  res.json({ success: true, cards: rows.map(c => ({ ...c, image_url: c.image_url || c.asset_url })) });
}));

router.post('/cards', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { title, price_text, subtitle, image_media_id, image_url, enabled, display_seconds, popup_interval_seconds, start_at, end_at, target_type, target_id } = req.body;
  if (!title?.trim()) return res.status(400).json({ success: false, error: 'title is required' });

  const db = getDatabase();
  const [r] = await db.query(
    `INSERT INTO promo_cards (title, price_text, subtitle, image_media_id, image_url, enabled, display_seconds, popup_interval_seconds, start_at, end_at, target_type, target_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title.trim(), price_text || null, subtitle || null,
     image_media_id || null, image_url || null,
     enabled !== false ? 1 : 0,
     display_seconds || 12, popup_interval_seconds || 30,
     start_at || null, end_at || null, target_type || 'all', target_id || null]
  );
  const [rows] = await db.query('SELECT * FROM promo_cards WHERE id = ?', [r.insertId]);
  res.status(201).json({ success: true, card: rows[0] });
}));

router.put('/cards/:id', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const fields = ['title','price_text','subtitle','image_media_id','image_url','enabled','display_seconds','popup_interval_seconds','start_at','end_at','target_type','target_id'];
  const updates = []; const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(f === 'enabled' ? (req.body[f] ? 1 : 0) : req.body[f]);
    }
  }
  if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
  params.push(req.params.id);
  const db = getDatabase();
  await db.query(`UPDATE promo_cards SET ${updates.join(', ')} WHERE id = ?`, params);
  const [rows] = await db.query('SELECT * FROM promo_cards WHERE id = ?', [req.params.id]);
  res.json({ success: true, card: rows[0] });
}));

router.delete('/cards/:id', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  await db.query('DELETE FROM promo_cards WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Deleted' });
}));

module.exports = router;
