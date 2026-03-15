const express = require('express');
const { getDatabase } = require('../database/init');
const { verifyToken } = require('../middleware/auth');
const { validatePlaylistCreate, isValidM3UUrl } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkPermission, checkResourceLimit, getAssignedPlaylists } = require('../middleware/permissions');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/playlists
 * List all playlists (including assigned playlists for non-admins)
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { is_active } = req.query;
  
  let playlists = [];
  
  // Admin sees all playlists
  if (req.user.role === 'admin') {
    let query = 'SELECT * FROM playlists';
    let params = [];
    
    if (is_active !== undefined) {
      query += ' WHERE is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [allPlaylists] = await db.query(query, params);
    playlists = allPlaylists;
  } else {
    // Non-admin: Get assigned playlists
    const assignedPlaylists = await getAssignedPlaylists(req.user.id);
    playlists = assignedPlaylists.map(ap => ({
      id: ap.playlist_id,
      name: ap.playlist_name,
      m3u_url: ap.m3u_url,
      is_assigned: true,
      can_edit: ap.can_edit,
      can_delete: ap.can_delete
    }));
  }
  
  res.json({
    success: true,
    playlists
  });
}));

/**
 * POST /api/playlists
 * Create new playlist (requires permission)
 */
router.post('/', 
  checkPermission('can_add_playlists'),
  checkResourceLimit('playlists', 'user_assigned_playlists', {
    countQuery: 'SELECT COUNT(*) as count FROM user_assigned_playlists WHERE user_id = ? AND assigned_by = ?',
    countParamsBuilder: (req) => [req.user.id, req.user.id]
  }),
  validatePlaylistCreate, 
  asyncHandler(async (req, res) => {
  const { name, m3u_url, description } = req.body;
  const db = getDatabase();
  
  // Check max playlists limit per user (optional)
  const [settings] = await db.query('SELECT setting_value FROM app_settings WHERE setting_key = ?', ['max_playlists_per_user']);
  const maxPlaylists = settings[0] ? parseInt(settings[0].setting_value) : 10;
  
  const [countResult] = await db.query(
    'SELECT COUNT(*) as count FROM user_assigned_playlists WHERE user_id = ?',
    [req.user.id]
  );
  
  if (countResult[0].count >= maxPlaylists && req.user.role !== 'admin') {
    return res.status(400).json({
      success: false,
      error: `Maximum of ${maxPlaylists} playlists allowed`,
      code: 'PLAYLIST_LIMIT_EXCEEDED'
    });
  }
  
  // Insert playlist
  let playlistId;
  try {
    const [result] = await db.query(
      'INSERT INTO playlists (name, m3u_url, description, created_by) VALUES (?, ?, ?, ?)',
      [name, m3u_url, description, req.user.id]
    );
    playlistId = result.insertId;
  } catch (error) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      // Fallback for legacy schemas without created_by column
      const [result] = await db.query(
        'INSERT INTO playlists (name, m3u_url, description) VALUES (?, ?, ?)',
        [name, m3u_url, description]
      );
      playlistId = result.insertId;
    } else {
      throw error;
    }
  }
  
  // Get created playlist
  
  // Ensure non-admin creators have access to their playlist
  if (req.user.role !== 'admin') {
    try {
      await db.query(
        `INSERT INTO user_assigned_playlists 
         (user_id, playlist_id, assigned_by, can_edit, can_delete)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE can_edit = VALUES(can_edit), can_delete = VALUES(can_delete)`,
        [req.user.id, playlistId, req.user.id, true, true]
      );
    } catch (error) {
      console.error('Failed to assign playlist to creator:', error.code || error.message);
    }
  }
  
  const [playlists] = await db.query('SELECT * FROM playlists WHERE id = ?', [playlistId]);
  
  res.status(201).json({
    success: true,
    playlist: playlists[0]
  });
}));

/**
 * GET /api/playlists/:id
 * Get single playlist (admin sees all; non-admin must have assignment)
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

  // Non-admin users must be assigned to this playlist
  if (req.user.role !== 'admin') {
    const [access] = await db.query(
      'SELECT 1 FROM user_assigned_playlists WHERE user_id = ? AND playlist_id = ?',
      [req.user.id, id]
    );
    if (access.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this playlist',
        code: 'PLAYLIST_ACCESS_DENIED'
      });
    }
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
router.put('/:id', 
  checkPermission('can_edit_own_playlists'),
  asyncHandler(async (req, res) => {
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
 * Delete playlist (requires permission)
 */
router.delete('/:id', 
  checkPermission('can_delete_own_playlists'),
  asyncHandler(async (req, res) => {
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
