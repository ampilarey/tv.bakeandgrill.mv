const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

function safeDisplayFields(display, appName, brandColor) {
  return {
    id: display.id,
    name: display.name,
    location: display.location,
    displayType: display.display_type || 'stream',
    playlist_id: display.playlist_id,
    appName,
    brandColor,
  };
}

/**
 * POST /api/reconnect/request
 * Display requests reconnection approval
 */
router.post('/request', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { token } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;

  const [displays] = await db.query('SELECT * FROM displays WHERE token = ? AND is_active = 1', [token]);

  if (displays.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found or inactive'
    });
  }

  const display = displays[0];

  const [existing] = await db.query(
    `SELECT id, check_secret FROM reconnection_requests
     WHERE display_id = ? AND status = 'pending' AND expires_at > NOW()`,
    [display.id]
  );

  if (existing.length > 0) {
    return res.json({
      success: true,
      requestId: existing[0].id,
      checkSecret: existing[0].check_secret,
      message: 'Reconnection request already pending'
    });
  }

  const checkSecret = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const [result] = await db.query(
    `INSERT INTO reconnection_requests (display_id, display_token, request_ip, expires_at, check_secret)
     VALUES (?, ?, ?, ?, ?)`,
    [display.id, token, clientIp, expiresAt, checkSecret]
  );

  console.log('Reconnection request created:', result.insertId);

  res.json({
    success: true,
    requestId: result.insertId,
    checkSecret,
    display: {
      id: display.id,
      name: display.name,
      location: display.location
    },
    message: 'Waiting for admin approval'
  });
}));

/**
 * POST /api/reconnect/check/:requestId
 * Display checks if reconnection was approved
 */
router.post('/check/:requestId', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { requestId } = req.params;
  const { checkSecret } = req.body;

  if (!checkSecret) {
    return res.status(401).json({ success: false, error: 'checkSecret required' });
  }

  const [requests] = await db.query(
    `SELECT * FROM reconnection_requests WHERE id = ?`,
    [requestId]
  );

  if (requests.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Request not found'
    });
  }

  const request = requests[0];

  if (request.check_secret !== checkSecret) {
    return res.status(401).json({ success: false, error: 'Invalid check secret' });
  }

  if (new Date(request.expires_at) < new Date()) {
    return res.json({
      success: false,
      status: 'expired',
      message: 'Request expired'
    });
  }

  if (request.status === 'approved') {
    const [displays] = await db.query('SELECT * FROM displays WHERE id = ?', [request.display_id]);
    const display = displays[0];

    let appName = process.env.APP_NAME || 'Bake & Grill TV';
    let brandColor = '#B03A48';
    try {
      const [settings] = await db.query(
        "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('app_name', 'brand_color')"
      );
      settings.forEach((s) => {
        if (s.setting_key === 'app_name') appName = s.setting_value;
        if (s.setting_key === 'brand_color') brandColor = s.setting_value;
      });
    } catch { /* non-fatal */ }

    return res.json({
      success: true,
      status: 'approved',
      display: safeDisplayFields(display, appName, brandColor),
    });
  }

  if (request.status === 'denied') {
    return res.json({
      success: false,
      status: 'denied',
      message: 'Reconnection denied by admin'
    });
  }

  res.json({
    success: false,
    status: 'pending',
    message: 'Waiting for approval'
  });
}));

/**
 * GET /api/reconnect/pending
 * Get all pending reconnection requests (Admin only)
 */
router.get('/pending', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();

  const [requests] = await db.query(
    `SELECT rr.id, rr.display_id, rr.request_ip, rr.status, rr.requested_at, rr.expires_at,
            d.name AS display_name, d.location AS display_location
     FROM reconnection_requests rr
     JOIN displays d ON d.id = rr.display_id
     WHERE rr.status = 'pending' AND rr.expires_at > NOW()
     ORDER BY rr.requested_at ASC`
  );

  res.json({ success: true, requests });
}));

/**
 * POST /api/reconnect/approve/:requestId
 */
router.post('/approve/:requestId', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { requestId } = req.params;
  const adminId = req.user.id;

  const [requests] = await db.query(
    'SELECT * FROM reconnection_requests WHERE id = ? AND status = \'pending\'',
    [requestId]
  );

  if (requests.length === 0) {
    return res.status(404).json({ success: false, error: 'Pending request not found' });
  }

  await db.query(
    `UPDATE reconnection_requests
     SET status = 'approved', approved_by = ?, approved_at = NOW()
     WHERE id = ?`,
    [adminId, requestId]
  );

  res.json({ success: true, message: 'Reconnection approved' });
}));

/**
 * POST /api/reconnect/deny/:requestId
 */
router.post('/deny/:requestId', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { requestId } = req.params;
  const adminId = req.user.id;

  await db.query(
    `UPDATE reconnection_requests
     SET status = 'denied', approved_by = ?, approved_at = NOW()
     WHERE id = ? AND status = 'pending'`,
    [adminId, requestId]
  );

  res.json({ success: true, message: 'Reconnection denied' });
}));

module.exports = router;
