const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');
const { validateLogin } = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const db = getDatabase();
  
  // Find user by email
  const [users] = await db.query('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [email]);
  const user = users[0];
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      code: 'AUTH_INVALID_CREDENTIALS'
    });
  }
  
  // Verify password
  const validPassword = await bcrypt.compare(password, user.password_hash);
  
  if (!validPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      code: 'AUTH_INVALID_CREDENTIALS'
    });
  }
  
  // Update last_login
  await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
  
  // Generate JWT token
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: `${process.env.SESSION_TIMEOUT_DAYS || 7}d`
  });
  
  // Return user info (without password) and token
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    }
  });
}));

/**
 * GET /api/auth/verify
 * Verify token validity
 */
router.get('/verify', verifyToken, asyncHandler(async (req, res) => {
  const db = getDatabase();
  
  // Get fresh user data
  const [users] = await db.query('SELECT * FROM users WHERE id = ? AND is_active = TRUE', [req.user.id]);
  const user = users[0];
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'User not found or inactive',
      code: 'AUTH_USER_NOT_FOUND'
    });
  }
  
  res.json({
    success: true,
    valid: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    }
  });
}));

/**
 * POST /api/auth/logout
 * Logout (client-side token removal, but we can log it)
 */
router.post('/logout', verifyToken, asyncHandler(async (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // We just confirm the request
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

module.exports = router;
