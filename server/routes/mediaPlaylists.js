/**
 * Media Playlists — photo/video slideshow playlists for café displays.
 * Separate from M3U/IPTV playlists.
 */
const express = require('express');
const { getDatabase }               = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler }              = require('../middleware/errorHandler');

const router = express.Router();
router.use(verifyToken);

// ── Playlists CRUD ─────────────────────────────────────────────────────────

/** GET /api/media-playlists */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [playlists] = await db.query(`
    SELECT mp.*,
           COUNT(mpi.id) AS item_count
    FROM media_playlists mp
    LEFT JOIN media_playlist_items mpi ON mpi.playlist_id = mp.id
    GROUP BY mp.id
    ORDER BY mp.name
  `);
  res.json({ success: true, playlists });
}));

/** POST /api/media-playlists */
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, shuffle } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name is required' });
  const db = getDatabase();
  const [r] = await db.query(
    'INSERT INTO media_playlists (name, description, shuffle, created_by) VALUES (?, ?, ?, ?)',
    [name, description || null, shuffle ? 1 : 0, req.user.id]
  );
  const [rows] = await db.query('SELECT * FROM media_playlists WHERE id = ?', [r.insertId]);
  res.status(201).json({ success: true, playlist: rows[0] });
}));

/** GET /api/media-playlists/:id */
router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [rows] = await db.query('SELECT * FROM media_playlists WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Playlist not found' });

  const [items] = await db.query(`
    SELECT mpi.*, ma.type, ma.url, ma.thumbnail_url, ma.original_name,
           ma.width, ma.height, ma.duration_seconds, ma.mime_type, ma.size_bytes
    FROM media_playlist_items mpi
    JOIN media_assets ma ON ma.id = mpi.media_id
    WHERE mpi.playlist_id = ?
    ORDER BY mpi.sort_order ASC, mpi.id ASC
  `, [req.params.id]);

  res.json({ success: true, playlist: rows[0], items });
}));

/** PUT /api/media-playlists/:id */
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, shuffle } = req.body;
  const db = getDatabase();
  const updates = [];
  const params  = [];
  if (name        !== undefined) { updates.push('name = ?');        params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (shuffle     !== undefined) { updates.push('shuffle = ?');     params.push(shuffle ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
  params.push(req.params.id);
  await db.query(`UPDATE media_playlists SET ${updates.join(', ')} WHERE id = ?`, params);
  const [rows] = await db.query('SELECT * FROM media_playlists WHERE id = ?', [req.params.id]);
  res.json({ success: true, playlist: rows[0] });
}));

/** DELETE /api/media-playlists/:id */
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  await db.query('DELETE FROM media_playlist_items WHERE playlist_id = ?', [req.params.id]);
  await db.query('DELETE FROM media_playlists WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Playlist deleted' });
}));

// ── Items ─────────────────────────────────────────────────────────────────

/** GET /api/media-playlists/:id/items */
router.get('/:id/items', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [items] = await db.query(`
    SELECT mpi.*, ma.type, ma.url, ma.thumbnail_url, ma.original_name,
           ma.width, ma.height, ma.duration_seconds, ma.mime_type
    FROM media_playlist_items mpi
    JOIN media_assets ma ON ma.id = mpi.media_id
    WHERE mpi.playlist_id = ?
    ORDER BY mpi.sort_order ASC, mpi.id ASC
  `, [req.params.id]);
  res.json({ success: true, items });
}));

/** POST /api/media-playlists/:id/items */
router.post('/:id/items', asyncHandler(async (req, res) => {
  const { media_id, image_duration_seconds, play_video_full } = req.body;
  if (!media_id) return res.status(400).json({ success: false, error: 'media_id is required' });
  const db = getDatabase();

  // Get max sort_order
  const [[{ maxOrder }]] = await db.query(
    'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM media_playlist_items WHERE playlist_id = ?',
    [req.params.id]
  );

  const [r] = await db.query(
    `INSERT INTO media_playlist_items (playlist_id, media_id, sort_order, image_duration_seconds, play_video_full)
     VALUES (?, ?, ?, ?, ?)`,
    [req.params.id, media_id, maxOrder + 1,
     image_duration_seconds || 8,
     play_video_full !== false ? 1 : 0]
  );

  const [rows] = await db.query(`
    SELECT mpi.*, ma.type, ma.url, ma.thumbnail_url, ma.original_name
    FROM media_playlist_items mpi
    JOIN media_assets ma ON ma.id = mpi.media_id
    WHERE mpi.id = ?
  `, [r.insertId]);
  res.status(201).json({ success: true, item: rows[0] });
}));

/** PUT /api/media-playlists/:id/items/:itemId */
router.put('/:id/items/:itemId', asyncHandler(async (req, res) => {
  const { image_duration_seconds, play_video_full, sort_order } = req.body;
  const db = getDatabase();
  const updates = [];
  const params  = [];
  if (image_duration_seconds !== undefined) { updates.push('image_duration_seconds = ?'); params.push(image_duration_seconds); }
  if (play_video_full        !== undefined) { updates.push('play_video_full = ?');        params.push(play_video_full ? 1 : 0); }
  if (sort_order             !== undefined) { updates.push('sort_order = ?');             params.push(sort_order); }
  if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
  params.push(req.params.itemId);
  await db.query(`UPDATE media_playlist_items SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ success: true, message: 'Item updated' });
}));

/** DELETE /api/media-playlists/:id/items/:itemId */
router.delete('/:id/items/:itemId', asyncHandler(async (req, res) => {
  const db = getDatabase();
  await db.query('DELETE FROM media_playlist_items WHERE id = ? AND playlist_id = ?', [req.params.itemId, req.params.id]);
  res.json({ success: true, message: 'Item removed' });
}));

/** POST /api/media-playlists/:id/items/reorder — body: { order: [{ id, sort_order }] } */
router.post('/:id/items/reorder', asyncHandler(async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ success: false, error: 'order array required' });
  const db = getDatabase();
  for (const { id, sort_order } of order) {
    await db.query('UPDATE media_playlist_items SET sort_order = ? WHERE id = ? AND playlist_id = ?',
      [sort_order, id, req.params.id]);
  }
  res.json({ success: true, message: 'Order saved' });
}));

module.exports = router;
