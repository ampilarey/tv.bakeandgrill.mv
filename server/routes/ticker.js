/**
 * Ticker API — legacy alias for overlay_messages (bottom bar ticker on TVs).
 */
const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { getDatabase } = require('../database/init');
const { asyncHandler } = require('../middleware/errorHandler');

function mapOverlayRow(row) {
  return {
    id: row.id,
    text: row.text,
    text_dv: null,
    display_id: row.target_type === 'display' ? row.target_id : null,
    is_active: !!row.enabled,
    priority: row.priority || 0,
    start_date: row.start_at ? String(row.start_at).slice(0, 10) : null,
    end_date: row.end_at ? String(row.end_at).slice(0, 10) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function overlayTarget(displayId) {
  if (displayId) return { target_type: 'display', target_id: parseInt(displayId, 10) };
  return { target_type: 'all', target_id: null };
}

/**
 * GET /api/ticker — list overlay messages (legacy ticker UI compatibility)
 */
router.get('/', asyncHandler(async (req, res) => {
  const { displayId } = req.query;
  const db = getDatabase();
  const { target_type, target_id } = overlayTarget(displayId);

  let query = `
    SELECT * FROM overlay_messages
    WHERE enabled = 1
      AND (start_at IS NULL OR start_at <= NOW())
      AND (end_at IS NULL OR end_at >= NOW())
  `;
  const params = [];

  if (displayId) {
    query += ` AND ((target_type = 'all') OR (target_type = 'display' AND target_id = ?))`;
    params.push(target_id);
  } else {
    query += ` AND target_type = 'all'`;
  }

  query += ' ORDER BY priority DESC, id DESC';

  const [rows] = await db.query(query, params);
  res.json({ success: true, messages: rows.map(mapOverlayRow) });
}));

/**
 * POST /api/ticker — create overlay message (admin)
 */
router.post('/', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { text, display_id, priority, start_date, end_date } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ success: false, message: 'text is required' });
  }

  const db = getDatabase();
  const { target_type, target_id } = overlayTarget(display_id);
  const startAt = start_date ? `${start_date} 00:00:00` : null;
  const endAt = end_date ? `${end_date} 23:59:59` : null;

  const [result] = await db.query(
    `INSERT INTO overlay_messages
       (text, enabled, priority, rotation_seconds, target_type, target_id, start_at, end_at)
     VALUES (?, 1, ?, 8, ?, ?, ?, ?)`,
    [text.trim(), priority || 0, target_type, target_id, startAt, endAt]
  );

  res.status(201).json({
    success: true,
    message: 'Ticker message created (Smart Overlays)',
    messageId: result.insertId,
  });
}));

/**
 * PUT /api/ticker/:id
 */
router.put('/:id', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = getDatabase();

  const fieldMap = {
    text: 'text',
    is_active: 'enabled',
    priority: 'priority',
    display_id: null,
    start_date: 'start_at',
    end_date: 'end_at',
  };

  const setClauses = [];
  const params = [];

  if (updates.text !== undefined) {
    setClauses.push('text = ?');
    params.push(updates.text);
  }
  if (updates.is_active !== undefined) {
    setClauses.push('enabled = ?');
    params.push(updates.is_active ? 1 : 0);
  }
  if (updates.priority !== undefined) {
    setClauses.push('priority = ?');
    params.push(updates.priority);
  }
  if (updates.start_date !== undefined) {
    setClauses.push('start_at = ?');
    params.push(updates.start_date ? `${updates.start_date} 00:00:00` : null);
  }
  if (updates.end_date !== undefined) {
    setClauses.push('end_at = ?');
    params.push(updates.end_date ? `${updates.end_date} 23:59:59` : null);
  }
  if (updates.display_id !== undefined) {
    const { target_type, target_id } = overlayTarget(updates.display_id);
    setClauses.push('target_type = ?', 'target_id = ?');
    params.push(target_type, target_id);
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid fields to update' });
  }

  params.push(id);
  const [result] = await db.query(
    `UPDATE overlay_messages SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Ticker message not found' });
  }

  res.json({ success: true, message: 'Ticker message updated' });
}));

/**
 * DELETE /api/ticker/:id
 */
router.delete('/:id', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [result] = await db.query('DELETE FROM overlay_messages WHERE id = ?', [req.params.id]);

  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Ticker message not found' });
  }

  res.json({ success: true, message: 'Ticker message deleted' });
}));

module.exports = router;
