const express = require('express');
const { getDatabase } = require('../database/init');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/favorites
 * Get user's favorites
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { playlistId } = req.query;
  
  let query = 'SELECT * FROM favorites WHERE user_id = ?';
  let params = [req.user.id];
  
  if (playlistId) {
    query += ' AND playlist_id = ?';
    params.push(playlistId);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const [favorites] = await db.query(query, params);
  
  res.json({
    success: true,
    favorites
  });
}));

/**
 * POST /api/favorites
 * Add favorite
 */
router.post('/', asyncHandler(async (req, res) => {
  const { playlist_id, channel_id, channel_name } = req.body;
  const db = getDatabase();
  
  if (!playlist_id || !channel_id) {
    return res.status(400).json({
      success: false,
      error: 'Playlist ID and channel ID are required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  // Check if already favorited
  const [existing] = await db.query(
    'SELECT id FROM favorites WHERE user_id = ? AND playlist_id = ? AND channel_id = ?',
    [req.user.id, playlist_id, channel_id]
  );
  
  if (existing.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Channel already in favorites',
      code: 'FAVORITE_ALREADY_EXISTS'
    });
  }
  
  // Insert favorite
  const [result] = await db.query(
    'INSERT INTO favorites (user_id, playlist_id, channel_id, channel_name) VALUES (?, ?, ?, ?)',
    [req.user.id, playlist_id, channel_id, channel_name]
  );
  
  // Get created favorite
  const [favorites] = await db.query('SELECT * FROM favorites WHERE id = ?', [result.insertId]);
  
  res.status(201).json({
    success: true,
    favorite: favorites[0]
  });
}));

/**
 * DELETE /api/favorites/:id
 * Remove favorite
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  // Check ownership
  const [favorites] = await db.query('SELECT id FROM favorites WHERE id = ? AND user_id = ?', [id, req.user.id]);
  
  if (favorites.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Favorite not found',
      code: 'FAVORITE_NOT_FOUND'
    });
  }
  
  await db.query('DELETE FROM favorites WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: 'Favorite removed'
  });
}));

/**
 * GET /api/favorites/by-playlist/:playlistId
 * Get favorites for specific playlist
 */
router.get('/by-playlist/:playlistId', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { playlistId } = req.params;
  
  const [favorites] = await db.query(
    'SELECT * FROM favorites WHERE user_id = ? AND playlist_id = ? ORDER BY created_at DESC',
    [req.user.id, playlistId]
  );
  
  res.json({
    success: true,
    favorites
  });
}));

/**
 * GET /api/favorites/export
 * Export favorites as JSON
 */
router.get('/export', asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  const [favorites] = await db.query(
    'SELECT playlist_id, channel_id, channel_name, created_at FROM favorites WHERE user_id = ?',
    [req.user.id]
  );
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    user: req.user.email,
    favorites
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="favorites-${Date.now()}.json"`);
  res.json(exportData);
}));

/**
 * POST /api/favorites/import
 * Import favorites from JSON
 */
router.post('/import', asyncHandler(async (req, res) => {
  const { favorites } = req.body;
  const db = getDatabase();
  
  if (!Array.isArray(favorites)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid import format',
      code: 'VALIDATION_ERROR'
    });
  }
  
  let imported = 0;
  let skipped = 0;
  
  for (const fav of favorites) {
    if (fav.playlist_id && fav.channel_id) {
      try {
        await db.query(
          'INSERT IGNORE INTO favorites (user_id, playlist_id, channel_id, channel_name) VALUES (?, ?, ?, ?)',
          [req.user.id, fav.playlist_id, fav.channel_id, fav.channel_name]
        );
        imported++;
      } catch (error) {
        skipped++;
      }
    }
  }
  
  res.json({
    success: true,
    imported,
    skipped,
    message: `Imported ${imported} favorites, skipped ${skipped} duplicates`
  });
}));

module.exports = router;
