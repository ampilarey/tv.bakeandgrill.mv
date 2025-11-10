const express = require('express');
const { getDatabase } = require('../database/init');
const { verifyToken } = require('../middleware/auth');
const { validatePlaylistCreate, isValidM3UUrl } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/playlists
 * List all playlists
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { is_active } = req.query;
  
  let query = 'SELECT * FROM playlists';
  let params = [];
  
  if (is_active !== undefined) {
    query += ' WHERE is_active = ?';
    params.push(is_active === 'true' ? 1 : 0);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const [playlists] = await db.query(query, params);
  
  res.json({
    success: true,
    playlists
  });
}));

/**
 * POST /api/playlists
 * Create new playlist
 */
router.post('/', validatePlaylistCreate, asyncHandler(async (req, res) => {
  const { name, m3u_url, description } = req.body;
  const db = getDatabase();
  
  // Check max playlists limit (optional)
  const [settings] = await db.query('SELECT setting_value FROM app_settings WHERE setting_key = ?', ['max_playlists_per_user']);
  const maxPlaylists = settings[0] ? parseInt(settings[0].setting_value) : 10;
  
  const [countResult] = await db.query('SELECT COUNT(*) as count FROM playlists');
  
  if (countResult[0].count >= maxPlaylists && req.user.role !== 'admin') {
    return res.status(400).json({
      success: false,
      error: `Maximum of ${maxPlaylists} playlists allowed`,
      code: 'PLAYLIST_LIMIT_EXCEEDED'
    });
  }
  
  // Insert playlist
  const [result] = await db.query(
    'INSERT INTO playlists (name, m3u_url, description) VALUES (?, ?, ?)',
    [name, m3u_url, description]
  );
  
  // Get created playlist
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ?', [result.insertId]);
  
  res.status(201).json({
    success: true,
    playlist: playlists[0]
  });
}));

/**
 * GET /api/playlists/:id
 * Get single playlist
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ?', [id]);
  
  if (playlists.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Playlist not found',
      code: 'PLAYLIST_NOT_FOUND'
    });
  }
  
  res.json({
    success: true,
    playlist: playlists[0]
  });
}));

/**
 * PUT /api/playlists/:id
 * Update playlist
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { name, m3u_url, description, is_active } = req.body;
  
  // Check if playlist exists
  const [existing] = await db.query('SELECT id FROM playlists WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Playlist not found',
      code: 'PLAYLIST_NOT_FOUND'
    });
  }
  
  // Build update query
  const updates = [];
  const params = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  
  if (m3u_url !== undefined) {
    if (!isValidM3UUrl(m3u_url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid M3U URL format',
        code: 'VALIDATION_ERROR'
      });
    }
    updates.push('m3u_url = ?');
    params.push(m3u_url);
  }
  
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
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
  
  await db.query(`UPDATE playlists SET ${updates.join(', ')} WHERE id = ?`, params);
  
  // Get updated playlist
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ?', [id]);
  
  res.json({
    success: true,
    playlist: playlists[0]
  });
}));

/**
 * DELETE /api/playlists/:id
 * Delete playlist
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const [existing] = await db.query('SELECT id FROM playlists WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Playlist not found',
      code: 'PLAYLIST_NOT_FOUND'
    });
  }
  
  // Delete playlist (cascades to favorites)
  await db.query('DELETE FROM playlists WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: 'Playlist deleted successfully'
  });
}));

/**
 * POST /api/playlists/:id/refresh
 * Refresh playlist last_fetched timestamp
 */
router.post('/:id/refresh', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const [existing] = await db.query('SELECT id FROM playlists WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Playlist not found',
      code: 'PLAYLIST_NOT_FOUND'
    });
  }
  
  await db.query('UPDATE playlists SET last_fetched = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: 'Playlist refreshed'
  });
}));

module.exports = router;
