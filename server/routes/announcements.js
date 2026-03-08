/**
 * Announcements API Routes
 * Quick full-screen announcements for displays
 * Phase 1: Stub implementation
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getDatabase } = require('../database/init');

/**
 * GET /api/announcements/:displayId
 * Get active announcements for a display
 */
router.get('/:displayId', async (req, res) => {
  try {
    const db = getDatabase();
    const [announcements] = await db.query(
      `SELECT * FROM announcements 
       WHERE display_id = ? 
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.params.displayId]
    );

    res.json({
      success: true,
      announcement: announcements.length > 0 ? announcements[0] : null
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements'
    });
  }
});

/**
 * POST /api/announcements
 * Create a new announcement (authenticated users only)
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      display_id,
      text,
      text_dv,
      duration_seconds,
      background_color,
      text_color,
      expires_at
    } = req.body;

    if (!display_id || !text) {
      return res.status(400).json({
        success: false,
        message: 'display_id and text are required'
      });
    }

    // Verify user has access to this display
    const db = getDatabase();
    const [displays] = await db.query(
      'SELECT id FROM displays WHERE id = ? AND (created_by = ? OR user_id = ?)',
      [display_id, req.user.id, req.user.id]
    );

    if (displays.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to create announcements for this display'
      });
    }

    // Calculate expiry if not provided (default: 1 hour)
    const expiresAt = expires_at || new Date(Date.now() + 60 * 60 * 1000);

    const [result] = await db.query(
      `INSERT INTO announcements (
        display_id, text, text_dv, duration_seconds,
        background_color, text_color, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        display_id,
        text,
        text_dv,
        duration_seconds || 10,
        background_color || '#1e293b',
        text_color || '#ffffff',
        expiresAt
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Announcement created',
      announcementId: result.insertId
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement'
    });
  }
});

/**
 * DELETE /api/announcements/:id
 * Delete an announcement
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const db = getDatabase();
    
    // Verify user has access to this announcement's display
    const [announcements] = await db.query(
      `SELECT a.id FROM announcements a
       INNER JOIN displays d ON a.display_id = d.id
       WHERE a.id = ? AND (d.created_by = ? OR d.user_id = ?)`,
      [req.params.id, req.user.id, req.user.id]
    );

    if (announcements.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found or unauthorized'
      });
    }

    await db.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Announcement deleted'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement'
    });
  }
});

/**
 * DELETE /api/announcements/display/:displayId/clear
 * Clear all announcements for a display
 */
router.delete('/display/:displayId/clear', verifyToken, async (req, res) => {
  try {
    const db = getDatabase();
    
    // Verify user has access to this display
    const [displays] = await db.query(
      'SELECT id FROM displays WHERE id = ? AND (created_by = ? OR user_id = ?)',
      [req.params.displayId, req.user.id, req.user.id]
    );

    if (displays.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    await db.query('DELETE FROM announcements WHERE display_id = ?', [req.params.displayId]);

    res.json({
      success: true,
      message: 'All announcements cleared'
    });
  } catch (error) {
    console.error('Error clearing announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear announcements'
    });
  }
});

module.exports = router;

