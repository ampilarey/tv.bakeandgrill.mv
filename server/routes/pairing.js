const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Store active PINs in memory (with expiration)
const activePins = new Map(); // pin -> { displayId, expiresAt }
const activeQRs = new Map(); // qrToken -> { displayData, expiresAt }

// Clean up expired PINs every minute
setInterval(() => {
  const now = Date.now();
  for (const [pin, data] of activePins.entries()) {
    if (data.expiresAt < now) {
      activePins.delete(pin);
    }
  }
  for (const [qr, data] of activeQRs.entries()) {
    if (data.expiresAt < now) {
      activeQRs.delete(qr);
    }
  }
}, 60000);

/**
 * POST /api/pairing/request-pin
 * Display requests to generate a PIN for pairing
 */
router.post('/request-pin', asyncHandler(async (req, res) => {
  // Generate 6-digit PIN
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

  activePins.set(pin, {
    displayId: null,
    requestedAt: Date.now(),
    expiresAt
  });

  res.json({
    success: true,
    pin,
    expiresIn: 300 // seconds
  });
}));

/**
 * POST /api/pairing/check-pin
 * Display checks if PIN has been paired by admin
 */
router.post('/check-pin', asyncHandler(async (req, res) => {
  const { pin } = req.body;

  const pinData = activePins.get(pin);
  
  if (!pinData) {
    return res.json({
      success: false,
      paired: false,
      message: 'PIN expired or invalid'
    });
  }

  if (pinData.displayId) {
    // PIN has been paired!
    const db = getDatabase();
    const [displays] = await db.query(
      'SELECT * FROM displays WHERE id = ?',
      [pinData.displayId]
    );

    if (displays.length > 0) {
      // Remove PIN from active list
      activePins.delete(pin);

      return res.json({
        success: true,
        paired: true,
        display: displays[0]
      });
    }
  }

  res.json({
    success: true,
    paired: false,
    message: 'Waiting for admin to complete pairing...'
  });
}));

/**
 * POST /api/pairing/admin-pair-pin
 * Admin pairs a display using PIN
 */
router.post('/admin-pair-pin', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { pin, name, location, playlist_id } = req.body;

  // Validate PIN exists and not expired
  const pinData = activePins.get(pin);
  
  if (!pinData) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired PIN'
    });
  }

  // Create display
  const token = crypto.randomBytes(32).toString('hex');
  const locationPin = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit

  const [result] = await db.query(
    `INSERT INTO displays (name, location, token, playlist_id, location_pin, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, location || null, token, playlist_id, locationPin, req.user.id]
  );

  // Update PIN data with display ID
  pinData.displayId = result.insertId;

  const [displays] = await db.query('SELECT * FROM displays WHERE id = ?', [result.insertId]);

  res.json({
    success: true,
    display: displays[0],
    message: 'Display paired successfully'
  });
}));

/**
 * POST /api/pairing/generate-qr
 * Admin generates QR code for display pairing
 */
router.post('/generate-qr', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { name, location, playlist_id } = req.body;

  // Create display first
  const token = crypto.randomBytes(32).toString('hex');
  const qrToken = crypto.randomBytes(16).toString('hex');
  const locationPin = Math.floor(1000 + Math.random() * 9000).toString();

  const [result] = await db.query(
    `INSERT INTO displays (name, location, token, playlist_id, location_pin, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, location || null, token, playlist_id, locationPin, req.user.id]
  );

  // Store QR token
  activeQRs.set(qrToken, {
    displayId: result.insertId,
    token,
    expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
  });

  const baseUrl = process.env.CLIENT_URL || 'http://localhost:4173';
  const qrUrl = `${baseUrl}/pair?qr=${qrToken}`;

  res.json({
    success: true,
    qr_url: qrUrl,
    qr_token: qrToken,
    display_id: result.insertId
  });
}));

/**
 * POST /api/pairing/pair-with-qr
 * Display pairs using QR token
 */
router.post('/pair-with-qr', asyncHandler(async (req, res) => {
  const { qr_token } = req.body;

  const qrData = activeQRs.get(qr_token);
  
  if (!qrData) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired QR code'
    });
  }

  const db = getDatabase();
  const [displays] = await db.query(
    'SELECT * FROM displays WHERE id = ?',
    [qrData.displayId]
  );

  if (displays.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found'
    });
  }

  // Remove QR from active list
  activeQRs.delete(qr_token);

  res.json({
    success: true,
    display: displays[0]
  });
}));

/**
 * GET /api/pairing/locations
 * Get available display locations
 */
router.get('/locations', asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  const [displays] = await db.query(
    'SELECT id, name, location, location_pin FROM displays WHERE is_active = 1 ORDER BY name'
  );

  res.json({
    success: true,
    locations: displays
  });
}));

/**
 * POST /api/pairing/pair-with-location
 * Display pairs using location ID and PIN
 */
router.post('/pair-with-location', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { location_id, pin } = req.body;

  const [displays] = await db.query(
    'SELECT * FROM displays WHERE id = ? AND location_pin = ? AND is_active = 1',
    [location_id, pin]
  );

  if (displays.length === 0) {
    return res.status(401).json({
      success: false,
      error: 'Invalid location or PIN'
    });
  }

  res.json({
    success: true,
    display: displays[0]
  });
}));

/**
 * POST /api/pairing/auto-pair
 * Attempt to auto-pair display based on network/IP
 */
router.post('/auto-pair', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const clientIp = req.ip || req.connection.remoteAddress;

  // Try to find display by IP or last seen IP
  const [displays] = await db.query(
    'SELECT * FROM displays WHERE last_ip = ? AND is_active = 1 LIMIT 1',
    [clientIp]
  );

  if (displays.length > 0) {
    return res.json({
      success: true,
      display: displays[0],
      method: 'auto-ip'
    });
  }

  res.status(404).json({
    success: false,
    error: 'No display found for auto-pairing'
  });
}));

module.exports = router;

