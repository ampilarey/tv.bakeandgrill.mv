const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { createDisplaySystemUser } = require('../utils/displayUser');

const router = express.Router();

// 5 PIN requests per IP per minute — prevents brute-force pairing requests
const pinRequestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many pairing requests from this IP, please wait a minute',
  standardHeaders: true,
  legacyHeaders: false
});

// 30 PIN checks per IP per minute — display polls every 5 s (12 req/min) with headroom.
const pinCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many PIN check attempts from this IP, please wait a minute',
  standardHeaders: true,
  legacyHeaders: false
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Columns safe to return to a display device — never include token, location_pin, etc.
const DISPLAY_SAFE_COLUMNS = 'id, name, location, playlist_id, is_active, last_seen, pairing_enabled_until, user_id';

async function createSession(db, type, token, displayId = null, ttlMs = 5 * 60 * 1000) {
  const expiresAt = new Date(Date.now() + ttlMs);
  await db.query(
    `INSERT INTO pairing_sessions (type, token, display_id, expires_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE display_id = VALUES(display_id), expires_at = VALUES(expires_at)`,
    [type, token, displayId, expiresAt]
  );
}

async function getSession(db, token) {
  const [rows] = await db.query(
    `SELECT * FROM pairing_sessions WHERE token = ? AND expires_at > NOW()`,
    [token]
  );
  return rows[0] || null;
}

async function deleteSession(db, token) {
  await db.query('DELETE FROM pairing_sessions WHERE token = ?', [token]);
}

// Purge expired sessions (called lazily on each request — cheap at small scale)
async function purgeExpired(db) {
  await db.query('DELETE FROM pairing_sessions WHERE expires_at <= NOW()').catch(() => {});
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /api/pairing/request-pin
 * Display requests to generate a PIN for pairing
 */
router.post('/request-pin', pinRequestLimiter, asyncHandler(async (req, res) => {
  logger.debug('🔢 PIN request received');

  const db = getDatabase();
  await purgeExpired(db);

  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  await createSession(db, 'pin', pin, null, 5 * 60 * 1000);

  logger.debug('✅ Generated PIN (stored in DB)');

  res.json({
    success: true,
    pin,
    expiresIn: 300
  });
}));

/**
 * POST /api/pairing/check-pin
 * Display checks if PIN has been paired by admin
 */
router.post('/check-pin', pinCheckLimiter, asyncHandler(async (req, res) => {
  const { pin } = req.body;
  const db = getDatabase();

  const session = await getSession(db, pin);

  if (!session) {
    return res.json({
      success: false,
      paired: false,
      message: 'PIN expired or invalid'
    });
  }

  if (session.display_id) {
    const [displays] = await db.query(
      `SELECT ${DISPLAY_SAFE_COLUMNS}, token FROM displays WHERE id = ?`,
      [session.display_id]
    );

    if (displays.length > 0) {
      await deleteSession(db, pin);

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
 * Admin or user with permissions pairs a display using PIN
 */
router.post('/admin-pair-pin', verifyToken, checkPermission('can_manage_displays'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { pin, name, location, playlist_id } = req.body;

  if (!pin || !name || !playlist_id) {
    return res.status(400).json({
      success: false,
      error: 'PIN, display name, and playlist are required',
    });
  }

  const session = await getSession(db, pin);

  if (!session) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired PIN'
    });
  }

  const connection = await db.getConnection();
  let displayId;

  try {
    await connection.beginTransaction();

    logger.debug('🔧 Creating display user with role "display"...');
    const displayUserId = await createDisplaySystemUser(connection, { name, location });

    const token = crypto.randomBytes(32).toString('hex');
    const locationPin = Math.floor(1000 + Math.random() * 9000).toString();

    let insertResult;
    try {
      [insertResult] = await connection.query(
        `INSERT INTO displays (name, location, token, playlist_id, location_pin, created_by, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, location || null, token, playlist_id, locationPin, req.user.id, displayUserId]
      );
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        [insertResult] = await connection.query(
          `INSERT INTO displays (name, location, token, playlist_id, location_pin, created_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [name, location || null, token, playlist_id, locationPin, req.user.id]
        );
      } else {
        throw error;
      }
    }

    displayId = insertResult.insertId;

    await connection.query(
      'UPDATE pairing_sessions SET display_id = ? WHERE token = ?',
      [displayId, pin]
    );

    await connection.commit();
    logger.debug('✅ Display paired successfully, id=%s', displayId);
  } catch (error) {
    await connection.rollback();
    logger.error('❌ admin-pair-pin failed:', error.message);
    throw error;
  } finally {
    connection.release();
  }

  const [displays] = await db.query(
    `SELECT ${DISPLAY_SAFE_COLUMNS}, token FROM displays WHERE id = ?`,
    [displayId]
  );

  res.json({
    success: true,
    display: displays[0],
    message: 'Display paired successfully'
  });
}));

/**
 * POST /api/pairing/generate-qr
 * Admin or user with permissions generates QR code for display pairing
 */
router.post('/generate-qr', verifyToken, checkPermission('can_manage_displays'), asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { name, location, playlist_id } = req.body;

  const token = crypto.randomBytes(32).toString('hex');
  const qrToken = crypto.randomBytes(16).toString('hex');
  const locationPin = Math.floor(1000 + Math.random() * 9000).toString();

  const [result] = await db.query(
    `INSERT INTO displays (name, location, token, playlist_id, location_pin, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, location || null, token, playlist_id, locationPin, req.user.id]
  );

  await createSession(db, 'qr', qrToken, result.insertId, 10 * 60 * 1000);

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
  const db = getDatabase();

  const session = await getSession(db, qr_token);

  if (!session) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired QR code'
    });
  }

  const [displays] = await db.query(
    `SELECT ${DISPLAY_SAFE_COLUMNS}, token FROM displays WHERE id = ?`,
    [session.display_id]
  );

  if (displays.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Display not found'
    });
  }

  await deleteSession(db, qr_token);

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
    'SELECT id, name, location FROM displays WHERE is_active = 1 ORDER BY name'
  );

  res.json({
    success: true,
    locations: displays
  });
}));

/**
 * POST /api/pairing/pair-with-location
 * Display pairs using location ID and PIN
 * Requires admin to have opened a pairing window via POST /api/displays/:id/enable-pairing
 */
router.post('/pair-with-location', pinRequestLimiter, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { location_id, pin } = req.body;

  const [displays] = await db.query(
    `SELECT ${DISPLAY_SAFE_COLUMNS}, token, location_pin FROM displays WHERE id = ? AND is_active = 1`,
    [location_id]
  );

  if (displays.length === 0 || displays[0].location_pin !== pin) {
    return res.status(401).json({ success: false, error: 'Invalid location or PIN' });
  }

  const display = displays[0];
  // Remove location_pin before sending to client
  delete display.location_pin;

  // Check pairing window — must be enabled by admin within last 10 min
  if (!display.pairing_enabled_until || new Date(display.pairing_enabled_until) < new Date()) {
    return res.status(403).json({
      success: false,
      error: 'Pairing is not currently enabled for this display. Ask an admin to enable the pairing window.'
    });
  }

  // Consume the window immediately (one-shot)
  await db.query('UPDATE displays SET pairing_enabled_until = NULL WHERE id = ?', [display.id]);

  res.json({ success: true, display });
}));

/**
 * POST /api/pairing/auto-pair  — DISABLED
 * Auto-pairing by IP was removed: any device on the same network could claim a
 * display's token without any authentication.  Use PIN, QR, or location pairing.
 */
router.post('/auto-pair', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Auto-pairing by IP is disabled. Use PIN, QR, or location-based pairing.'
  });
});

module.exports = router;
