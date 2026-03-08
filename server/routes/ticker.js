/**
 * Ticker Messages API Routes
 * Scrolling info ticker system
 * Phase 1: Stub implementation
 */
const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { getDatabase } = require('../database/init');

/**
 * GET /api/ticker
 * Get all active ticker messages (optionally filtered by display)
 */
router.get('/', async (req, res) => {
  try {
    const { displayId } = req.query;
    const db = getDatabase();
    
    let query = `
      SELECT * FROM ticker_messages 
      WHERE is_active = TRUE 
      AND (start_date IS NULL OR start_date <= CURDATE())
      AND (end_date IS NULL OR end_date >= CURDATE())
    `;
    const params = [];

    if (displayId) {
      query += ' AND (display_id IS NULL OR display_id = ?)';
      params.push(displayId);
    } else {
      query += ' AND display_id IS NULL';
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const [messages] = await db.query(query, params);

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error fetching ticker messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticker messages'
    });
  }
});

/**
 * POST /api/ticker
 * Create a new ticker message (admin only)
 */
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      text,
      text_dv,
      display_id,
      priority,
      start_date,
      end_date
    } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'text is required'
      });
    }

    const db = getDatabase();
    const [result] = await db.query(
      `INSERT INTO ticker_messages (
        text, text_dv, display_id, priority, start_date, end_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [text, text_dv, display_id, priority || 0, start_date, end_date, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Ticker message created',
      messageId: result.insertId
    });
  } catch (error) {
    console.error('Error creating ticker message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticker message'
    });
  }
});

/**
 * PUT /api/ticker/:id
 * Update a ticker message (admin only)
 */
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    delete updates.id;
    delete updates.created_at;
    delete updates.created_by;

    // Whitelist allowed columns to prevent SQL injection
    const allowed = ['text', 'text_dv', 'display_id', 'is_active', 'priority', 'start_date', 'end_date'];
    const setClauses = [];
    const params = [];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        params.push(updates[key]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    setClauses.push('updated_at = NOW()');
    params.push(id);

    const db = getDatabase();
    const [result] = await db.query(
      `UPDATE ticker_messages SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticker message not found'
      });
    }

    res.json({
      success: true,
      message: 'Ticker message updated'
    });
  } catch (error) {
    console.error('Error updating ticker message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticker message'
    });
  }
});

/**
 * DELETE /api/ticker/:id
 * Delete a ticker message (admin only)
 */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();
    const [result] = await db.query(
      'DELETE FROM ticker_messages WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticker message not found'
      });
    }

    res.json({
      success: true,
      message: 'Ticker message deleted'
    });
  } catch (error) {
    console.error('Error deleting ticker message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete ticker message'
    });
  }
});

module.exports = router;

