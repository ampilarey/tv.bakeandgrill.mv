/**
 * Slide Templates API Routes
 * Reusable slide design templates
 * Phase 1: Stub implementation
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getDatabase } = require('../database/init');

/**
 * GET /api/templates
 * Get all templates (system + user-created)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    const [templates] = await db.query(
      `SELECT * FROM slide_templates 
       WHERE is_system = TRUE OR created_by = ?
       ORDER BY is_system DESC, created_at DESC`,
      [req.user.userId]
    );

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates'
    });
  }
});

/**
 * GET /api/templates/:id
 * Get a specific template
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    const [templates] = await db.query(
      'SELECT * FROM slide_templates WHERE id = ?',
      [req.params.id]
    );

    if (templates.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      template: templates[0]
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template'
    });
  }
});

/**
 * POST /api/templates
 * Create a new template
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      template_type,
      layout_config,
      background_color,
      primary_color,
      secondary_color,
      font_family,
      preview_url
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'name is required'
      });
    }

    const db = getDatabase();
    const [result] = await db.query(
      `INSERT INTO slide_templates (
        name, template_type, layout_config, background_color,
        primary_color, secondary_color, font_family, preview_url, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        template_type || 'custom',
        layout_config ? JSON.stringify(layout_config) : null,
        background_color || '#ffffff',
        primary_color || '#1e293b',
        secondary_color || '#64748b',
        font_family || 'Inter',
        preview_url,
        req.user.userId
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Template created',
      templateId: result.insertId
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template'
    });
  }
});

/**
 * PUT /api/templates/:id
 * Update a template
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Convert layout_config to JSON if provided
    if (updates.layout_config && typeof updates.layout_config === 'object') {
      updates.layout_config = JSON.stringify(updates.layout_config);
    }
    
    delete updates.id;
    delete updates.created_at;
    delete updates.created_by;
    delete updates.is_system; // Can't change system flag

    const db = getDatabase();
    const [result] = await db.query(
      'UPDATE slide_templates SET ?, updated_at = NOW() WHERE id = ? AND created_by = ? AND is_system = FALSE',
      [updates, id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Template updated'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template'
    });
  }
});

/**
 * DELETE /api/templates/:id
 * Delete a template (user templates only)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    const [result] = await db.query(
      'DELETE FROM slide_templates WHERE id = ? AND created_by = ? AND is_system = FALSE',
      [req.params.id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template'
    });
  }
});

module.exports = router;

