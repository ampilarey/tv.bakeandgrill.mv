/**
 * Scenes API Routes
 * One-click display configurations
 * Phase 1: Stub implementation
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getDatabase } = require('../database/init');

/**
 * GET /api/scenes
 * Get all scenes for the current user
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const db = getDatabase();
    const [scenes] = await db.query(
      `SELECT s.*, p.name as playlist_name 
       FROM scenes s
       LEFT JOIN playlists p ON s.playlist_id = p.id
       WHERE s.created_by = ?
       ORDER BY s.created_at DESC`,
      [req.user.userId]
    );

    res.json({
      success: true,
      scenes
    });
  } catch (error) {
    console.error('Error fetching scenes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scenes'
    });
  }
});

/**
 * POST /api/scenes
 * Create a new scene
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      name,
      name_dv,
      description,
      playlist_id,
      ticker_enabled,
      upsell_frequency,
      audio_enabled,
      theme,
      settings
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'name is required'
      });
    }

    const db = getDatabase();
    const [result] = await db.query(
      `INSERT INTO scenes (
        name, name_dv, description, playlist_id, ticker_enabled,
        upsell_frequency, audio_enabled, theme, settings, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, name_dv, description, playlist_id, ticker_enabled !== false,
        upsell_frequency || 5, audio_enabled !== false, theme || 'default',
        settings ? JSON.stringify(settings) : null, req.user.userId
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Scene created',
      sceneId: result.insertId
    });
  } catch (error) {
    console.error('Error creating scene:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scene'
    });
  }
});

/**
 * PUT /api/scenes/:id
 * Update a scene
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Convert settings to JSON if provided
    if (updates.settings && typeof updates.settings === 'object') {
      updates.settings = JSON.stringify(updates.settings);
    }
    
    delete updates.id;
    delete updates.created_at;
    delete updates.created_by;

    const db = getDatabase();
    const [result] = await db.query(
      'UPDATE scenes SET ?, updated_at = NOW() WHERE id = ? AND created_by = ?',
      [updates, id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scene not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Scene updated'
    });
  } catch (error) {
    console.error('Error updating scene:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scene'
    });
  }
});

/**
 * DELETE /api/scenes/:id
 * Delete a scene
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const db = getDatabase();
    const [result] = await db.query(
      'DELETE FROM scenes WHERE id = ? AND created_by = ?',
      [req.params.id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scene not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Scene deleted'
    });
  } catch (error) {
    console.error('Error deleting scene:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete scene'
    });
  }
});

/**
 * POST /api/scenes/:id/activate
 * Activate a scene on a display
 */
router.post('/:id/activate', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { displayId } = req.body;

    if (!displayId) {
      return res.status(400).json({
        success: false,
        message: 'displayId is required'
      });
    }

    const db = getDatabase();
    
    // Get scene configuration
    const [scenes] = await db.query(
      'SELECT * FROM scenes WHERE id = ? AND created_by = ?',
      [id, req.user.userId]
    );

    if (scenes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scene not found'
      });
    }

    const scene = scenes[0];

    // Apply scene configuration to display
    // This would send commands to the display to change its configuration
    // For now, just update the display's playlist
    if (scene.playlist_id) {
      await db.query(
        'UPDATE displays SET playlist_id = ? WHERE id = ?',
        [scene.playlist_id, displayId]
      );
    }

    res.json({
      success: true,
      message: 'Scene activated',
      scene: {
        id: scene.id,
        name: scene.name,
        playlist_id: scene.playlist_id
      }
    });
  } catch (error) {
    console.error('Error activating scene:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate scene'
    });
  }
});

module.exports = router;

