const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `pwa-icon-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024 // Default 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPG images are allowed'));
    }
  }
});

// All routes require authentication and admin role
router.use(verifyToken, requireAdmin);

/**
 * GET /api/settings
 * Get all settings
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  const [settings] = await db.query('SELECT * FROM app_settings');
  
  // Convert to key-value object
  const settingsObj = {};
  settings.forEach(setting => {
    settingsObj[setting.setting_key] = setting.setting_value;
  });
  
  res.json({
    success: true,
    settings: settingsObj
  });
}));

/**
 * GET /api/settings/:key
 * Get single setting
 */
router.get('/:key', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { key } = req.params;
  
  const [settings] = await db.query('SELECT * FROM app_settings WHERE setting_key = ?', [key]);
  
  if (settings.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Setting not found',
      code: 'SETTING_NOT_FOUND'
    });
  }
  
  res.json({
    success: true,
    setting: settings[0]
  });
}));

/**
 * PATCH /api/settings/:key
 * Update setting value
 */
router.patch('/:key', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { key } = req.params;
  const { value } = req.body;
  
  if (value === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Value is required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  // Check if setting exists
  const [existing] = await db.query('SELECT setting_key FROM app_settings WHERE setting_key = ?', [key]);
  
  if (existing.length === 0) {
    // Create new setting
    await db.query(
      'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)',
      [key, value]
    );
  } else {
    // Update existing setting
    await db.query(
      'UPDATE app_settings SET setting_value = ? WHERE setting_key = ?',
      [value, key]
    );
  }
  
  // Get updated setting
  const [settings] = await db.query('SELECT * FROM app_settings WHERE setting_key = ?', [key]);
  
  res.json({
    success: true,
    setting: settings[0]
  });
}));

/**
 * POST /api/settings/pwa-icon
 * Upload PWA icon
 */
router.post('/pwa-icon', upload.single('icon'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded',
      code: 'FILE_REQUIRED'
    });
  }
  
  const db = getDatabase();
  const iconPath = `/uploads/${req.file.filename}`;
  
  // Update setting
  await db.query(
    'UPDATE app_settings SET setting_value = ? WHERE setting_key = ?',
    [iconPath, 'pwa_icon_path']
  );
  
  res.json({
    success: true,
    iconPath,
    message: 'PWA icon uploaded successfully'
  });
}));

/**
 * GET /api/settings/pwa-icon/current
 * Get current PWA icon path
 */
router.get('/pwa-icon/current', asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  const [settings] = await db.query('SELECT setting_value FROM app_settings WHERE setting_key = ?', ['pwa_icon_path']);
  
  res.json({
    success: true,
    iconPath: settings.length > 0 ? settings[0].setting_value : '/pwa-512x512.png'
  });
}));

module.exports = router;
