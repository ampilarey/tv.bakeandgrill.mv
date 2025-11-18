const express = require('express');
const bcrypt = require('bcrypt');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateUserCreate, isValidPassword, isValidEmail } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Profile routes (any authenticated user)
router.put('/profile', verifyToken, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { first_name, last_name, email } = req.body;
  const userId = req.user.id;

  // Validate email format
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  // Check if email is already taken by another user
  if (email && email !== req.user.email) {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }
  }

  // Update user profile
  await db.query(
    'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
    [first_name, last_name, email, userId]
  );

  // Fetch updated user
  const [users] = await db.query(
    'SELECT id, email, role, first_name, last_name, is_active, created_at FROM users WHERE id = ?',
    [userId]
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: users[0]
  });
}));

router.put('/password', verifyToken, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  // Validate inputs
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, error: 'Current and new password required' });
  }

  if (!isValidPassword(new_password)) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
  }

  // Get current password hash
  const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Verify current password
  const isValid = await bcrypt.compare(current_password, users[0].password_hash);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Current password is incorrect' });
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(new_password, 10);

  // Update password
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// All routes below require authentication and admin role
router.use(verifyToken, requireAdmin);

/**
 * GET /api/users
 * List all users
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { role, limit = 100, offset = 0 } = req.query;
  
  let query = 'SELECT id, email, role, first_name, last_name, is_active, created_at, last_login FROM users';
  let params = [];
  
  if (role) {
    query += ' WHERE role = ?';
    params.push(role);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  const [users] = await db.query(query, params);
  
  const countQuery = role ? 'SELECT COUNT(*) as count FROM users WHERE role = ?' : 'SELECT COUNT(*) as count FROM users';
  const [totalCount] = await db.query(countQuery, role ? [role] : []);
  
  res.json({
    success: true,
    users,
    total: totalCount[0].count,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
}));

/**
 * POST /api/users
 * Create new user
 */
router.post('/', validateUserCreate, asyncHandler(async (req, res) => {
  const { email, phone_number, password, role = 'staff', first_name, last_name, force_password_change = true } = req.body;
  const db = getDatabase();
  
  // Check if email already exists
  if (email) {
    const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists',
        code: 'USER_EMAIL_EXISTS'
      });
    }
  }
  
  // Check if phone number already exists
  if (phone_number) {
    const [existingPhone] = await db.query('SELECT id FROM users WHERE phone_number = ?', [phone_number]);
    if (existingPhone.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Phone number already exists',
        code: 'USER_PHONE_EXISTS'
      });
    }
  }
  
  // At least email or phone required
  if (!email && !phone_number) {
    return res.status(400).json({
      success: false,
      error: 'Either email or phone number is required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  // Hash password
  const password_hash = await bcrypt.hash(password, 10);
  
  // Insert user
  const [result] = await db.query(
    `INSERT INTO users (email, phone_number, password_hash, role, first_name, last_name, force_password_change) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [email || null, phone_number || null, password_hash, role, first_name, last_name, force_password_change]
  );
  
  // Get created user
  const [users] = await db.query(
    'SELECT id, email, phone_number, role, first_name, last_name, force_password_change, created_at FROM users WHERE id = ?', 
    [result.insertId]
  );
  
  res.status(201).json({
    success: true,
    user: users[0]
  });
}));

/**
 * GET /api/users/:id
 * Get user details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const [users] = await db.query('SELECT id, email, role, first_name, last_name, is_active, created_at, last_login FROM users WHERE id = ?', [id]);
  
  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
  
  res.json({
    success: true,
    user: users[0]
  });
}));

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { email, role, first_name, last_name, is_active } = req.body;
  
  // Check if user exists
  const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
  
  // Prevent admin from deactivating themselves
  if (id == req.user.id && is_active === 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot deactivate your own account',
      code: 'USER_CANNOT_DEACTIVATE_SELF'
    });
  }
  
  // Build update query
  const updates = [];
  const params = [];
  
  if (email !== undefined) {
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'VALIDATION_ERROR'
      });
    }
    updates.push('email = ?');
    params.push(email);
  }
  
  if (role !== undefined) {
    if (!['admin', 'staff', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        code: 'VALIDATION_ERROR'
      });
    }
    updates.push('role = ?');
    params.push(role);
  }
  
  if (first_name !== undefined) {
    updates.push('first_name = ?');
    params.push(first_name);
  }
  
  if (last_name !== undefined) {
    updates.push('last_name = ?');
    params.push(last_name);
  }
  
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No fields to update',
      code: 'VALIDATION_ERROR'
    });
  }
  
  params.push(id);
  
  await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  
  // Get updated user
  const [users] = await db.query('SELECT id, email, role, first_name, last_name, is_active, updated_at FROM users WHERE id = ?', [id]);
  
  res.json({
    success: true,
    user: users[0]
  });
}));

/**
 * PATCH /api/users/:id/password
 * Change user password
 */
router.patch('/:id/password', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { current_password, new_password } = req.body;
  
  // Only user themselves or admin can change password
  if (req.user.id != id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Cannot change another user\'s password',
      code: 'AUTH_INSUFFICIENT_PERMISSIONS'
    });
  }
  
  if (!new_password || !isValidPassword(new_password)) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters',
      code: 'VALIDATION_ERROR'
    });
  }
  
  // Get user
  const [users] = await db.query('SELECT id, password_hash FROM users WHERE id = ?', [id]);
  
  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
  
  const user = users[0];
  
  // If user is changing their own password, verify current password
  if (req.user.id == id) {
    if (!current_password) {
      return res.status(400).json({
        success: false,
        error: 'Current password required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    const validPassword = await bcrypt.compare(current_password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        code: 'AUTH_INVALID_PASSWORD'
      });
    }
  }
  
  // Hash new password
  const password_hash = await bcrypt.hash(new_password, 10);
  
  // Update password
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);
  
  res.json({
    success: true,
    message: 'Password updated successfully'
  });
}));

/**
 * DELETE /api/users/:id
 * Delete user (soft delete)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  // Prevent admin from deleting themselves
  if (id == req.user.id) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete your own account',
      code: 'USER_CANNOT_DELETE_SELF'
    });
  }
  
  const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
  
  // Soft delete
  await db.query('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

module.exports = router;
