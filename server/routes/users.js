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
  const { first_name, last_name, email, phone_number } = req.body;
  const userId = req.user.id;

  // Phone number is mandatory and must be 7 digits
  if (!phone_number || !/^\d{7}$/.test(phone_number)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Phone number is required (7 digits)' 
    });
  }

  // Validate email format if provided
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  // Get current user data
  const [currentUser] = await db.query('SELECT email, phone_number FROM users WHERE id = ?', [userId]);
  if (currentUser.length === 0) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Check if phone number is already taken by another user
  if (phone_number !== currentUser[0].phone_number) {
    const [existingPhone] = await db.query('SELECT id FROM users WHERE phone_number = ? AND id != ?', [phone_number, userId]);
    if (existingPhone.length > 0) {
      return res.status(400).json({ success: false, error: 'Phone number already in use' });
    }
  }

  // Check if email is already taken by another user
  if (email && email !== currentUser[0].email) {
    const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }
  }

  // Update user profile
  await db.query(
    'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone_number = ? WHERE id = ?',
    [first_name, last_name, email || null, phone_number, userId]
  );

  // Fetch updated user
  const [users] = await db.query(
    'SELECT id, email, phone_number, role, first_name, last_name, is_active, created_at FROM users WHERE id = ?',
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
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
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

  const newPasswordHash = await bcrypt.hash(new_password, 10);

  // Bump token_version to invalidate all existing JWTs for this user
  await db.query(
    'UPDATE users SET password_hash = ?, token_version = token_version + 1, last_password_change_at = NOW() WHERE id = ?',
    [newPasswordHash, userId]
  );

  res.json({ success: true, message: 'Password changed successfully' });
}));

/**
 * PUT /api/users/:id/first-time-setup
 * Complete first-time setup (no current password required)
 */
router.put('/:id/first-time-setup', verifyToken, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { phone_number, email, first_name, last_name, new_password } = req.body;
  
  // Only the user themselves can complete their own setup
  if (String(req.user.id) !== String(id)) {
    return res.status(403).json({
      success: false,
      error: 'Can only update your own profile',
      code: 'AUTH_INSUFFICIENT_PERMISSIONS'
    });
  }
  
  // Verify user has force_password_change flag (security check)
  const [users] = await db.query('SELECT force_password_change FROM users WHERE id = ?', [id]);
  if (users.length === 0) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  
  if (!users[0].force_password_change) {
    return res.status(400).json({ 
      success: false, 
      error: 'First-time setup already completed. Use regular profile update instead.' 
    });
  }
  
  // Validate phone number (mandatory, 7 digits)
  if (!phone_number || !/^\d{7}$/.test(phone_number)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Phone number is required (7 digits)' 
    });
  }
  
  // Validate email if provided
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }
  
  // Validate first name is required
  if (!first_name || !first_name.trim()) {
    return res.status(400).json({ success: false, error: 'First name is required' });
  }
  
  // Validate new password
  if (!new_password || !isValidPassword(new_password)) {
    return res.status(400).json({ 
      success: false, 
      error: 'New password is required (minimum 8 characters)' 
    });
  }
  
  // Check if phone number is already taken by another user
  const [existingPhone] = await db.query('SELECT id FROM users WHERE phone_number = ? AND id != ?', [phone_number, id]);
  if (existingPhone.length > 0) {
    return res.status(400).json({ success: false, error: 'Phone number already in use' });
  }
  
  // Check if email is already taken (if provided)
  if (email) {
    const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }
  }
  
  // Hash new password
  const newPasswordHash = await bcrypt.hash(new_password, 10);
  
  // Update everything in one go
  await db.query(
    `UPDATE users 
     SET phone_number = ?, email = ?, first_name = ?, last_name = ?, 
         password_hash = ?, force_password_change = FALSE 
     WHERE id = ?`,
    [phone_number, email || null, first_name, last_name || null, newPasswordHash, id]
  );
  
  // Get updated user
  const [updatedUser] = await db.query(
    'SELECT id, email, phone_number, role, first_name, last_name, is_active FROM users WHERE id = ?',
    [id]
  );
  
  res.json({
    success: true,
    message: 'Setup completed successfully',
    user: updatedUser[0]
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
  
  // Validate role parameter
  if (role && !['admin', 'staff', 'user', 'display'].includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role filter. Must be: admin, staff, user, or display',
      code: 'VALIDATION_ERROR'
    });
  }
  
  // Validate and sanitize limit and offset
  const safeLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 500); // Max 500
  const safeOffset = Math.max(parseInt(offset) || 0, 0);
  
  let query = 'SELECT id, email, phone_number, role, first_name, last_name, is_active, force_password_change, created_at, last_login FROM users';
  let params = [];
  
  if (role) {
    query += ' WHERE role = ?';
    params.push(role);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(safeLimit, safeOffset);
  
  const [users] = await db.query(query, params);
  
  const countQuery = role ? 'SELECT COUNT(*) as count FROM users WHERE role = ?' : 'SELECT COUNT(*) as count FROM users';
  const [totalCount] = await db.query(countQuery, role ? [role] : []);
  
  res.json({
    success: true,
    users,
    total: totalCount[0].count,
    limit: safeLimit,
    offset: safeOffset
  });
}));

/**
 * POST /api/users
 * Create new user
 */
router.post('/', validateUserCreate, asyncHandler(async (req, res) => {
  const { email, phone_number, password, role = 'staff', first_name, last_name, force_password_change = true } = req.body;
  const db = getDatabase();
  
  // Phone number is mandatory (7 digits)
  if (!phone_number || phone_number.length !== 7 || !/^\d{7}$/.test(phone_number)) {
    return res.status(400).json({
      success: false,
      error: 'Phone number is required (7 digits)',
      code: 'VALIDATION_ERROR'
    });
  }
  
  // Check if phone number already exists
  const [existingPhone] = await db.query('SELECT id FROM users WHERE phone_number = ?', [phone_number]);
  if (existingPhone.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Phone number already exists',
      code: 'USER_PHONE_EXISTS'
    });
  }
  
  // Check if email already exists (if provided)
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
  const { email, phone_number, role, first_name, last_name, is_active, force_password_change } = req.body;
  
  // Check if user exists
  const [existing] = await db.query('SELECT id, phone_number, email FROM users WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
  
  // Prevent admin from deactivating themselves
  if (String(id) === String(req.user.id) && is_active === 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot deactivate your own account',
      code: 'USER_CANNOT_DEACTIVATE_SELF'
    });
  }
  
  // Build update query
  const updates = [];
  const params = [];
  
  if (phone_number !== undefined) {
    if (!/^\d{7}$/.test(phone_number)) {
      return res.status(400).json({
        success: false,
        error: 'Phone number must be 7 digits',
        code: 'VALIDATION_ERROR'
      });
    }
    // Check if phone number is already taken by another user
    if (phone_number !== existing[0].phone_number) {
      const [existingPhone] = await db.query('SELECT id FROM users WHERE phone_number = ? AND id != ?', [phone_number, id]);
      if (existingPhone.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Phone number already in use',
          code: 'USER_PHONE_EXISTS'
        });
      }
    }
    updates.push('phone_number = ?');
    params.push(phone_number);
  }
  
  if (email !== undefined) {
    // Email can be null (optional), but if provided must be valid format
    if (email !== null && email !== '' && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'VALIDATION_ERROR'
      });
    }
    // Check if email is already taken by another user (only if email is provided and different)
    if (email && email !== existing[0].email) {
      const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (existingEmail.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use',
          code: 'USER_EMAIL_EXISTS'
        });
      }
    }
    updates.push('email = ?');
    params.push(email || null);
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
  
  if (force_password_change !== undefined) {
    updates.push('force_password_change = ?');
    params.push(force_password_change ? 1 : 0);
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
  const [users] = await db.query('SELECT id, email, phone_number, role, first_name, last_name, is_active, force_password_change, updated_at FROM users WHERE id = ?', [id]);
  
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
  if (String(req.user.id) !== String(id) && req.user.role !== 'admin') {
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
  if (String(req.user.id) === String(id)) {
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
  
  const password_hash = await bcrypt.hash(new_password, 10);
  await db.query(
    'UPDATE users SET password_hash = ?, token_version = token_version + 1, last_password_change_at = NOW() WHERE id = ?',
    [password_hash, id]
  );
  res.json({ success: true, message: 'Password updated successfully' });
}));

/**
 * DELETE /api/users/:id
 * Delete user (soft delete by default, permanent with ?permanent=true)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { permanent } = req.query;
  
  // Prevent admin from deleting themselves
  if (String(id) === String(req.user.id)) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete your own account',
      code: 'USER_CANNOT_DELETE_SELF'
    });
  }
  
  const [existing] = await db.query('SELECT id, is_active, role FROM users WHERE id = ?', [id]);
  
  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
  
  // Permanent delete (only for inactive users)
  if (permanent === 'true') {
    // Only allow permanent deletion of inactive users
    if (existing[0].is_active === 1) {
      return res.status(400).json({
        success: false,
        error: 'User must be deactivated before permanent deletion',
        code: 'USER_STILL_ACTIVE'
      });
    }
    
    // Prevent permanent deletion of admin users
    if (existing[0].role === 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Cannot permanently delete admin users',
        code: 'ADMIN_DELETE_FORBIDDEN'
      });
    }
    
    // Permanent delete - this will CASCADE to related tables
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    
    return res.json({
      success: true,
      message: 'User permanently deleted'
    });
  }
  
  // Soft delete
  await db.query('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: 'User deactivated successfully'
  });
}));

module.exports = router;
