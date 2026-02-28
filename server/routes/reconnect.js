const express = require('express');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * POST /api/reconnect/request
 * Display requests reconnection approval
 */
router.post('/request', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { token } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;
  
  console.log('🔄 Reconnection request received');
  
  // Verify display exists and token is valid
  const [displays] = await db.query('SELECT * FROM displays WHERE token = ? AND is_active = 1', [token]);
  
  if (displays.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found or inactive'
    });
  }
  
  const display = displays[0];
  
  // Check if there's already a pending request
  const [existing] = await db.query(
    `SELECT id FROM reconnection_requests 
     WHERE display_id = ? AND status = 'pending' AND expires_at > NOW()`,
    [display.id]
  );
  
  if (existing.length > 0) {
    // Return existing request
    return res.json({
      success: true,
      requestId: existing[0].id,
      message: 'Reconnection request already pending'
    });
  }
  
  // Create new reconnection request (expires in 5 minutes)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
  const [result] = await db.query(
    `INSERT INTO reconnection_requests (display_id, display_token, request_ip, expires_at)
     VALUES (?, ?, ?, ?)`,
    [display.id, token, clientIp, expiresAt]
  );
  
  console.log('✅ Reconnection request created:', result.insertId);
  
  res.json({
    success: true,
    requestId: result.insertId,
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
  
  // Check if expired
  if (new Date(request.expires_at) < new Date()) {
    return res.json({
      success: false,
      status: 'expired',
      message: 'Request expired'
    });
  }
  
  if (request.status === 'approved') {
    // Get display details
    const [displays] = await db.query('SELECT * FROM displays WHERE id = ?', [request.display_id]);
    
    return res.json({
      success: true,
      status: 'approved',
      display: displays[0]
    });
  }
  
  if (request.status === 'denied') {
    return res.json({
      success: false,
      status: 'denied',
      message: 'Reconnection denied by admin'
    });
  }
  
  // Still pending
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
    `SELECT 
      rr.*,
      d.name as display_name,
      d.location as display_location,
      d.last_heartbeat
     FROM reconnection_requests rr
     JOIN displays d ON rr.display_id = d.id
     WHERE rr.status = 'pending' AND rr.expires_at > NOW()
     ORDER BY rr.requested_at DESC`
  );
  
  res.json({
    success: true,
    requests
  });
}));

/**
 * POST /api/reconnect/approve/:requestId
 * Admin approves reconnection request
 */
router.post('/approve/:requestId', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { requestId } = req.params;
  
  const [requests] = await db.query(
    'SELECT * FROM reconnection_requests WHERE id = ? AND status = \'pending\'',
    [requestId]
  );
  
  if (requests.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Request not found or already processed'
    });
  }
  
  // Approve the request
  await db.query(
    `UPDATE reconnection_requests 
     SET status = 'approved', approved_by = ?, approved_at = NOW()
     WHERE id = ?`,
    [req.user.id, requestId]
  );
  
  console.log('✅ Reconnection approved by admin:', req.user.email);
  
  res.json({
    success: true,
    message: 'Reconnection approved'
  });
}));

/**
 * POST /api/reconnect/deny/:requestId
 * Admin denies reconnection request
 */
router.post('/deny/:requestId', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { requestId } = req.params;
  
  await db.query(
    `UPDATE reconnection_requests 
     SET status = 'denied', approved_by = ?, approved_at = NOW()
     WHERE id = ?`,
    [req.user.id, requestId]
  );
  
  console.log('❌ Reconnection denied by admin:', req.user.email);
  
  res.json({
    success: true,
    message: 'Reconnection denied'
  });
}));

module.exports = router;

