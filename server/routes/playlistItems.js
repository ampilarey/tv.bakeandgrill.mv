/**
 * Playlist Items API Routes
 * Multi-type content management (images, videos, YouTube, etc.)
 * Phase 1: Stub implementation
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { getDatabase } = require('../database/init');

async function assertPlaylistModifyAccess(req, playlistId, action = 'edit') {
  if (req.user.role === 'admin') return true;
  const db = getDatabase();
  const [rows] = await db.query('SELECT created_by FROM playlists WHERE id = ?', [playlistId]);
  if (!rows.length) return false;
  if (rows[0].created_by === req.user.id) return true;
  const col = action === 'delete' ? 'can_delete' : 'can_edit';
  const [access] = await db.query(
    `SELECT 1 FROM user_assigned_playlists WHERE user_id = ? AND playlist_id = ? AND ${col} = 1`,
    [req.user.id, playlistId]
  );
  return access.length > 0;
}

/**
 * GET /api/playlist-items/:playlistId
 * Get all items for a playlist (Phase 7: with upsell logic)
 */
router.get('/:playlistId', verifyToken, async (req, res) => {
  try {
    const db = getDatabase();
    const { upsellFrequency, kidsMode } = req.query;
    
    // Check if upsell logic should be applied
    if (upsellFrequency && parseInt(upsellFrequency) > 0) {
      const { getPlaylistWithUpsells } = require('../utils/upsellLogic');
      const items = await getPlaylistWithUpsells(
        req.params.playlistId,
        parseInt(upsellFrequency),
        kidsMode === 'true'
      );
      
      return res.json({
        success: true,
        items,
        upsellLogic: true,
        frequency: parseInt(upsellFrequency)
      });
    }
    
    // Regular query without upsell logic
    let query = `SELECT * FROM playlist_items WHERE playlist_id = ?`;
    const params = [req.params.playlistId];
    
    // Filter for kids-friendly if kids mode
    if (kidsMode === 'true') {
      query += ' AND is_kids_friendly = TRUE';
    }
    
    query += ' ORDER BY sort_order ASC, created_at ASC';
    
    const [items] = await db.query(query, params);

    res.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Error fetching playlist items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch playlist items'
    });
  }
});

/**
 * POST /api/playlist-items
 * Create a new playlist item
 */
router.post('/', verifyToken, checkPermission('can_edit_own_playlists'), async (req, res) => {
  try {
    const {
      playlist_id,
      type,
      title,
      title_dv,
      description,
      description_dv,
      url,
      embed_url,
      thumbnail_url,
      duration_seconds,
      sound_enabled,
      qr_target_url,
      is_upsell,
      is_kids_friendly,
      is_staff_training,
      sort_order,
      group_name
    } = req.body;

    // Validation
    if (!playlist_id || !title || !url) {
      return res.status(400).json({
        success: false,
        message: 'playlist_id, title, and url are required'
      });
    }

    if (!(await assertPlaylistModifyAccess(req, playlist_id, 'edit'))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this playlist'
      });
    }

    const db = getDatabase();
    const [result] = await db.query(
      `INSERT INTO playlist_items (
        playlist_id, type, title, title_dv, description, description_dv,
        url, embed_url, thumbnail_url, duration_seconds, sound_enabled,
        qr_target_url, is_upsell, is_kids_friendly, is_staff_training,
        sort_order, group_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        playlist_id, type || 'image', title, title_dv, description, description_dv,
        url, embed_url, thumbnail_url, duration_seconds || 10, sound_enabled !== false,
        qr_target_url, is_upsell || false, is_kids_friendly !== false, is_staff_training || false,
        sort_order || 0, group_name
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Playlist item created',
      itemId: result.insertId
    });
  } catch (error) {
    console.error('Error creating playlist item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create playlist item'
    });
  }
});

/**
 * PUT /api/playlist-items/:id
 * Update a playlist item
 */
router.put('/:id', verifyToken, checkPermission('can_edit_own_playlists'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;

    const db = getDatabase();

    const [existing] = await db.query('SELECT playlist_id FROM playlist_items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Playlist item not found'
      });
    }

    if (!(await assertPlaylistModifyAccess(req, existing[0].playlist_id, 'edit'))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this playlist'
      });
    }

    if (updates.playlist_id !== undefined && updates.playlist_id !== existing[0].playlist_id) {
      if (!(await assertPlaylistModifyAccess(req, updates.playlist_id, 'edit'))) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this playlist'
        });
      }
    }
    const [result] = await db.query(
      'UPDATE playlist_items SET ?, updated_at = NOW() WHERE id = ?',
      [updates, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Playlist item not found'
      });
    }

    res.json({
      success: true,
      message: 'Playlist item updated'
    });
  } catch (error) {
    console.error('Error updating playlist item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update playlist item'
    });
  }
});

/**
 * DELETE /api/playlist-items/:id
 * Delete a playlist item
 */
router.delete('/:id', verifyToken, checkPermission('can_delete_own_playlists'), async (req, res) => {
  try {
    const db = getDatabase();

    const [existing] = await db.query('SELECT playlist_id FROM playlist_items WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Playlist item not found'
      });
    }

    if (!(await assertPlaylistModifyAccess(req, existing[0].playlist_id, 'delete'))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this playlist'
      });
    }

    const [result] = await db.query(
      'DELETE FROM playlist_items WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Playlist item not found'
      });
    }

    res.json({
      success: true,
      message: 'Playlist item deleted'
    });
  } catch (error) {
    console.error('Error deleting playlist item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete playlist item'
    });
  }
});

module.exports = router;

