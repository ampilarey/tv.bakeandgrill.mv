/**
 * Feature Flags API Routes
 * Manages feature toggles for gradual rollout
 */
const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { getDatabase } = require('../database/init');

/**
 * GET /api/features
 * Get all feature flags (public endpoint for display/frontend)
 */
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const [flags] = await db.query(
      'SELECT flag_name, is_enabled, description FROM feature_flags ORDER BY flag_name'
    );

    // Convert to object for easier frontend consumption
    const flagsObject = {};
    flags.forEach(flag => {
      flagsObject[flag.flag_name] = flag.is_enabled;
    });

    res.json({
      success: true,
      flags: flagsObject,
      details: flags // Include full details for admin UI
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feature flags'
    });
  }
});

/**
 * GET /api/features/check/:flagName
 * Check if a specific feature is enabled
 */
router.get('/check/:flagName', async (req, res) => {
  try {
    const db = getDatabase();
    const [flags] = await db.query(
      'SELECT is_enabled FROM feature_flags WHERE flag_name = ?',
      [req.params.flagName]
    );

    if (flags.length === 0) {
      return res.json({
        success: true,
        enabled: false,
        exists: false
      });
    }

    res.json({
      success: true,
      enabled: Boolean(flags[0].is_enabled),
      exists: true
    });
  } catch (error) {
    console.error('Error checking feature flag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check feature flag'
    });
  }
});

/**
 * PUT /api/features/:flagName
 * Toggle a feature flag (admin only)
 */
router.put('/:flagName', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { flagName } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enabled must be a boolean value'
      });
    }

    const db = getDatabase();
    const [result] = await db.query(
      'UPDATE feature_flags SET is_enabled = ?, updated_at = NOW() WHERE flag_name = ?',
      [enabled, flagName]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feature flag not found'
      });
    }

    res.json({
      success: true,
      message: `Feature '${flagName}' ${enabled ? 'enabled' : 'disabled'}`,
      flag: {
        name: flagName,
        enabled
      }
    });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feature flag'
    });
  }
});

/**
 * POST /api/features
 * Create a new feature flag (admin only)
 */
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { flagName, description, enabled = false } = req.body;

    if (!flagName) {
      return res.status(400).json({
        success: false,
        message: 'flagName is required'
      });
    }

    const db = getDatabase();
    await db.query(
      'INSERT INTO feature_flags (flag_name, is_enabled, description) VALUES (?, ?, ?)',
      [flagName, enabled, description || null]
    );

    res.status(201).json({
      success: true,
      message: 'Feature flag created',
      flag: {
        name: flagName,
        enabled,
        description
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Feature flag already exists'
      });
    }
    console.error('Error creating feature flag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create feature flag'
    });
  }
});

/**
 * DELETE /api/features/:flagName
 * Delete a feature flag (admin only)
 */
router.delete('/:flagName', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { flagName } = req.params;
    const db = getDatabase();
    
    const [result] = await db.query(
      'DELETE FROM feature_flags WHERE flag_name = ?',
      [flagName]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feature flag not found'
      });
    }

    res.json({
      success: true,
      message: 'Feature flag deleted'
    });
  } catch (error) {
    console.error('Error deleting feature flag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete feature flag'
    });
  }
});

module.exports = router;

