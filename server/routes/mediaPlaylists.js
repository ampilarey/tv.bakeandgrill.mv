/**
 * Media Playlists — photo/video slideshow playlists for café displays.
 */
const express = require('express');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { assertDisplayCanAccessPlaylist } = require('../utils/mediaPlaylistAccess');

const router = express.Router();

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** GET /api/media-playlists/for-display/items?token=&playlist_id= */
router.get('/for-display/items', asyncHandler(async (req, res) => {
  const { token, playlist_id: playlistId } = req.query;
  if (!token || !playlistId) {
    return res.status(400).json({ success: false, error: 'token and playlist_id required' });
  }

  const db = getDatabase();
  const [displays] = await db.query(
    'SELECT * FROM displays WHERE token = ? AND is_active = TRUE',
    [token]
  );
  if (!displays.length) {
    return res.status(401).json({ success: false, error: 'Invalid display token' });
  }

  const display = displays[0];
  try {
    await assertDisplayCanAccessPlaylist(db, display, playlistId);
  } catch (err) {
    return res.status(err.status || 403).json({
      success: false,
      error: err.message,
      code: err.code || 'PLAYLIST_ACCESS_DENIED',
    });
  }

  const [items] = await db.query(`
    SELECT mpi.*, ma.type, ma.url, ma.thumbnail_url, ma.original_name,
           ma.width, ma.height, ma.duration_seconds, ma.mime_type
    FROM media_playlist_items mpi
    JOIN media_assets ma ON ma.id = mpi.media_id
    WHERE mpi.playlist_id = ?
    ORDER BY mpi.sort_order ASC, mpi.id ASC
  `, [playlistId]);

  const [plRows] = await db.query('SELECT shuffle FROM media_playlists WHERE id = ?', [playlistId]);
  let out = items;
  if (plRows[0]?.shuffle === 1 && items.length > 1) {
    out = shuffleArray(items);
  }

  res.json({ success: true, items: out });
}));

router.use(verifyToken);

router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [playlists] = await db.query(`
    SELECT mp.*, COUNT(mpi.id) AS item_count
    FROM media_playlists mp
    LEFT JOIN media_playlist_items mpi ON mpi.playlist_id = mp.id
    GROUP BY mp.id
    ORDER BY mp.name
  `);
  res.json({ success: true, playlists });
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
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

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [rows] = await db.query('SELECT * FROM media_playlists WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Playlist not found' });

  const [items] = await db.query(`
    SELECT mpi.*, ma.type, ma.url, ma.thumbnail_url, ma.original_name,
           ma.width, ma.height, ma.duration_seconds, ma.mime_type, ma.size_bytes
    FROM media_playlist_items mpi
    LEFT JOIN media_assets ma ON ma.id = mpi.media_id
    WHERE mpi.playlist_id = ?
    ORDER BY mpi.sort_order ASC, mpi.id ASC
  `, [req.params.id]);

  res.json({ success: true, playlist: rows[0], items });
}));

router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { name, description, shuffle } = req.body;
  const db = getDatabase();
  const [existing] = await db.query('SELECT id FROM media_playlists WHERE id = ?', [req.params.id]);
  if (!existing.length) return res.status(404).json({ success: false, error: 'Playlist not found' });

  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (shuffle !== undefined) { updates.push('shuffle = ?'); params.push(shuffle ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
  params.push(req.params.id);
  await db.query(`UPDATE media_playlists SET ${updates.join(', ')} WHERE id = ?`, params);
  const [rows] = await db.query('SELECT * FROM media_playlists WHERE id = ?', [req.params.id]);
  res.json({ success: true, playlist: rows[0] });
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [existing] = await db.query('SELECT id FROM media_playlists WHERE id = ?', [req.params.id]);
  if (!existing.length) return res.status(404).json({ success: false, error: 'Playlist not found' });
  await db.query('DELETE FROM media_playlist_items WHERE playlist_id = ?', [req.params.id]);
  await db.query('DELETE FROM media_playlists WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Playlist deleted' });
}));

/** POST /api/media-playlists/:id/duplicate */
router.post('/:id/duplicate', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const sourceId = parseInt(req.params.id, 10);
  const [rows] = await db.query('SELECT * FROM media_playlists WHERE id = ?', [sourceId]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Playlist not found' });
  const src = rows[0];

  const [r] = await db.query(
    'INSERT INTO media_playlists (name, description, shuffle, created_by) VALUES (?, ?, ?, ?)',
    [`${src.name} (copy)`, src.description, src.shuffle, req.user.id]
  );
  const newId = r.insertId;

  const [items] = await db.query(
    'SELECT media_id, sort_order, image_duration_seconds, play_video_full FROM media_playlist_items WHERE playlist_id = ? ORDER BY sort_order',
    [sourceId]
  );
  for (const item of items) {
    await db.query(
      `INSERT INTO media_playlist_items (playlist_id, media_id, sort_order, image_duration_seconds, play_video_full)
       VALUES (?, ?, ?, ?, ?)`,
      [newId, item.media_id, item.sort_order, item.image_duration_seconds, item.play_video_full]
    );
  }

  const [newPl] = await db.query('SELECT * FROM media_playlists WHERE id = ?', [newId]);
  res.status(201).json({ success: true, playlist: newPl[0] });
}));

router.get('/:id/items', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [pl] = await db.query('SELECT id FROM media_playlists WHERE id = ?', [req.params.id]);
  if (!pl.length) return res.status(404).json({ success: false, error: 'Playlist not found' });

  const [items] = await db.query(`
    SELECT mpi.*, ma.type, ma.url, ma.thumbnail_url, ma.original_name,
           ma.width, ma.height, ma.duration_seconds, ma.mime_type
    FROM media_playlist_items mpi
    LEFT JOIN media_assets ma ON ma.id = mpi.media_id
    WHERE mpi.playlist_id = ?
    ORDER BY mpi.sort_order ASC, mpi.id ASC
  `, [req.params.id]);
  res.json({ success: true, items });
}));

router.post('/:id/items', requireAdmin, asyncHandler(async (req, res) => {
  const { media_id, image_duration_seconds, play_video_full } = req.body;
  if (!media_id) return res.status(400).json({ success: false, error: 'media_id is required' });
  const db = getDatabase();
  const playlistId = parseInt(req.params.id, 10);

  const [pl] = await db.query('SELECT id FROM media_playlists WHERE id = ?', [playlistId]);
  if (!pl.length) return res.status(404).json({ success: false, error: 'Playlist not found' });

  const [assets] = await db.query('SELECT id FROM media_assets WHERE id = ?', [media_id]);
  if (!assets.length) return res.status(404).json({ success: false, error: 'Media asset not found' });

  const [dup] = await db.query(
    'SELECT id FROM media_playlist_items WHERE playlist_id = ? AND media_id = ?',
    [playlistId, media_id]
  );
  if (dup.length) {
    return res.status(409).json({ success: false, error: 'Media already in this playlist', code: 'DUPLICATE_ITEM' });
  }

  const [[{ maxOrder }]] = await db.query(
    'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM media_playlist_items WHERE playlist_id = ?',
    [playlistId]
  );

  const [r] = await db.query(
    `INSERT INTO media_playlist_items (playlist_id, media_id, sort_order, image_duration_seconds, play_video_full)
     VALUES (?, ?, ?, ?, ?)`,
    [playlistId, media_id, maxOrder + 1, image_duration_seconds || 8, play_video_full !== false ? 1 : 0]
  );

  const [rows] = await db.query(`
    SELECT mpi.*, ma.type, ma.url, ma.thumbnail_url, ma.original_name, ma.duration_seconds
    FROM media_playlist_items mpi
    JOIN media_assets ma ON ma.id = mpi.media_id
    WHERE mpi.id = ?
  `, [r.insertId]);
  res.status(201).json({ success: true, item: rows[0] });
}));

router.put('/:id/items/:itemId', requireAdmin, asyncHandler(async (req, res) => {
  const { image_duration_seconds, play_video_full, sort_order } = req.body;
  const db = getDatabase();
  const playlistId = parseInt(req.params.id, 10);
  const updates = [];
  const params = [];
  if (image_duration_seconds !== undefined) { updates.push('image_duration_seconds = ?'); params.push(image_duration_seconds); }
  if (play_video_full !== undefined) { updates.push('play_video_full = ?'); params.push(play_video_full ? 1 : 0); }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
  if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
  params.push(req.params.itemId, playlistId);
  const [result] = await db.query(
    `UPDATE media_playlist_items SET ${updates.join(', ')} WHERE id = ? AND playlist_id = ?`,
    params
  );
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, error: 'Item not found in this playlist' });
  }
  res.json({ success: true, message: 'Item updated' });
}));

router.delete('/:id/items/:itemId', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  await db.query('DELETE FROM media_playlist_items WHERE id = ? AND playlist_id = ?', [req.params.itemId, req.params.id]);
  res.json({ success: true, message: 'Item removed' });
}));

router.post('/:id/items/reorder', requireAdmin, asyncHandler(async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ success: false, error: 'order array required' });
  const db = getDatabase();
  const playlistId = parseInt(req.params.id, 10);

  const [pl] = await db.query('SELECT id FROM media_playlists WHERE id = ?', [playlistId]);
  if (!pl.length) return res.status(404).json({ success: false, error: 'Playlist not found' });

  const ids = order.map((o) => parseInt(o.id, 10)).filter((id) => id > 0);
  if (!ids.length) return res.status(400).json({ success: false, error: 'No valid item ids in order' });

  const [existing] = await db.query(
    `SELECT id FROM media_playlist_items WHERE playlist_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
    [playlistId, ...ids]
  );
  if (existing.length !== ids.length) {
    return res.status(400).json({ success: false, error: 'One or more items do not belong to this playlist' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const { id, sort_order } of order) {
      const [r] = await conn.query(
        'UPDATE media_playlist_items SET sort_order = ? WHERE id = ? AND playlist_id = ?',
        [sort_order, id, playlistId]
      );
      if (r.affectedRows === 0) throw new Error('Reorder failed');
    }
    await conn.commit();
    res.json({ success: true, message: 'Order saved' });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, error: err.message || 'Reorder failed' });
  } finally {
    conn.release();
  }
}));

module.exports = router;
