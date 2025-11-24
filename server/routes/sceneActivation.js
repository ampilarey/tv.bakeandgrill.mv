/**
 * Scene Activation Routes
 * Activate scenes on displays
 * Phase 6: Scenes & Modes
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getDatabase } = require('../database/init');

/**
 * POST /api/displays/:displayId/activate-scene/:sceneId
 * Activate a scene on a display
 */
router.post('/displays/:displayId/activate-scene/:sceneId', verifyToken, async (req, res) => {
  try {
    const { displayId, sceneId } = req.params;
    const db = getDatabase();

    // Verify user has access to display
    const [displays] = await db.query(
      'SELECT id FROM displays WHERE id = ? AND (created_by = ? OR user_id = ?)',
      [displayId, req.user.userId, req.user.userId]
    );

    if (displays.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to activate scene on this display'
      });
    }

    // Get scene configuration
    const [scenes] = await db.query(
      'SELECT * FROM scenes WHERE id = ?',
      [sceneId]
    );

    if (scenes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scene not found'
      });
    }

    const scene = scenes[0];

    // Apply scene configuration to display
    if (scene.playlist_id) {
      await db.query(
        'UPDATE displays SET playlist_id = ? WHERE id = ?',
        [scene.playlist_id, displayId]
      );
    }

    // Send command to display to apply scene
    await db.query(
      `INSERT INTO display_commands (display_id, command_type, command_data) 
       VALUES (?, 'apply_scene', ?)`,
      [displayId, JSON.stringify({ scene_id: sceneId, scene: scene })]
    );

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

/**
 * POST /api/displays/:displayId/set-mode
 * Set display mode (normal, kids, training)
 * Phase 6: Scenes & Modes
 */
router.post('/displays/:displayId/set-mode', verifyToken, async (req, res) => {
  try {
    const { displayId } = req.params;
    const { mode } = req.body; // 'normal', 'kids', 'training'

    if (!['normal', 'kids', 'training'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mode. Must be normal, kids, or training'
      });
    }

    const db = getDatabase();

    // Verify user has access
    const [displays] = await db.query(
      'SELECT id FROM displays WHERE id = ? AND (created_by = ? OR user_id = ?)',
      [displayId, req.user.userId, req.user.userId]
    );

    if (displays.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Update or create screen profile
    await db.query(
      `INSERT INTO screen_profiles (display_id, default_mode, updated_at) 
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE default_mode = ?, updated_at = NOW()`,
      [displayId, mode, mode]
    );

    // Send command to display
    await db.query(
      `INSERT INTO display_commands (display_id, command_type, command_data) 
       VALUES (?, 'set_mode', ?)`,
      [displayId, JSON.stringify({ mode })]
    );

    res.json({
      success: true,
      message: `Mode set to ${mode}`,
      mode
    });
  } catch (error) {
    console.error('Error setting mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set mode'
    });
  }
});

module.exports = router;

