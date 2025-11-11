const express = require('express');
const { getDatabase } = require('../database/init');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getUserPermissions, getAssignedPlaylists } = require('../middleware/permissions');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/permissions/me
 * Get current user's permissions
 */
router.get('/me', asyncHandler(async (req, res) => {
  const permissions = await getUserPermissions(req.user.id);
  const assignedPlaylists = await getAssignedPlaylists(req.user.id);
  
  res.json({
    success: true,
    permissions: permissions || {},
    assignedPlaylists
  });
}));

// Admin-only routes below
router.use(requireAdmin);

/**
 * GET /api/permissions/:userId
 * Get specific user's permissions (Admin only)
 */
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const permissions = await getUserPermissions(userId);
  const assignedPlaylists = await getAssignedPlaylists(userId);
  
  res.json({
    success: true,
    permissions: permissions || {},
    assignedPlaylists
  });
}));

/**
 * PUT /api/permissions/:userId
 * Update user permissions (Admin only)
 */
router.put('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const {
    can_add_playlists,
    can_edit_own_playlists,
    can_delete_own_playlists,
    can_manage_displays,
    can_control_displays,
    can_create_users,
    can_view_analytics,
    can_manage_schedules,
    max_playlists,
    max_displays
  } = req.body;
  
  const db = getDatabase();
  
  // Check if user exists
  const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [userId]);
  
  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
  
  // Don't allow modifying admin permissions (they have everything)
  if (users[0].role === 'admin') {
    return res.status(400).json({
      success: false,
      error: 'Cannot modify admin permissions',
      code: 'ADMIN_PERMISSIONS_LOCKED'
    });
  }
  
  // Check if permissions exist
  const [existing] = await db.query(
    'SELECT id FROM user_permissions WHERE user_id = ?',
    [userId]
  );
  
  if (existing.length === 0) {
    // Create new permissions
    await db.query(
      `INSERT INTO user_permissions 
      (user_id, can_add_playlists, can_edit_own_playlists, can_delete_own_playlists,
       can_manage_displays, can_control_displays, can_create_users,
       can_view_analytics, can_manage_schedules, max_playlists, max_displays)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        can_add_playlists || false,
        can_edit_own_playlists || false,
        can_delete_own_playlists || false,
        can_manage_displays || false,
        can_control_displays || false,
        can_create_users || false,
        can_view_analytics || false,
        can_manage_schedules || false,
        max_playlists !== undefined ? max_playlists : -1,
        max_displays !== undefined ? max_displays : -1
      ]
    );
  } else {
    // Update existing permissions
    await db.query(
      `UPDATE user_permissions SET
       can_add_playlists = ?,
       can_edit_own_playlists = ?,
       can_delete_own_playlists = ?,
       can_manage_displays = ?,
       can_control_displays = ?,
       can_create_users = ?,
       can_view_analytics = ?,
       can_manage_schedules = ?,
       max_playlists = ?,
       max_displays = ?
       WHERE user_id = ?`,
      [
        can_add_playlists || false,
        can_edit_own_playlists || false,
        can_delete_own_playlists || false,
        can_manage_displays || false,
        can_control_displays || false,
        can_create_users || false,
        can_view_analytics || false,
        can_manage_schedules || false,
        max_playlists !== undefined ? max_playlists : -1,
        max_displays !== undefined ? max_displays : -1,
        userId
      ]
    );
  }
  
  // Get updated permissions
  const updatedPermissions = await getUserPermissions(userId);
  
  res.json({
    success: true,
    permissions: updatedPermissions,
    message: 'Permissions updated successfully'
  });
}));

/**
 * POST /api/permissions/:userId/assign-playlist
 * Assign admin's playlist to a user (Admin only)
 */
router.post('/:userId/assign-playlist', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { playlistId, canEdit, canDelete } = req.body;
  
  if (!playlistId) {
    return res.status(400).json({
      success: false,
      error: 'Playlist ID is required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  const db = getDatabase();
  
  // Verify playlist exists
  const [playlists] = await db.query('SELECT id FROM playlists WHERE id = ?', [playlistId]);
  
  if (playlists.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Playlist not found',
      code: 'PLAYLIST_NOT_FOUND'
    });
  }
  
  // Verify user exists
  const [users] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
  
  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
  
  // Check if already assigned
  const [existing] = await db.query(
    'SELECT id FROM user_assigned_playlists WHERE user_id = ? AND playlist_id = ?',
    [userId, playlistId]
  );
  
  if (existing.length > 0) {
    // Update existing assignment
    await db.query(
      `UPDATE user_assigned_playlists 
       SET can_edit = ?, can_delete = ?
       WHERE user_id = ? AND playlist_id = ?`,
      [canEdit || false, canDelete || false, userId, playlistId]
    );
  } else {
    // Create new assignment
    await db.query(
      `INSERT INTO user_assigned_playlists 
       (user_id, playlist_id, assigned_by, can_edit, can_delete)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, playlistId, req.user.id, canEdit || false, canDelete || false]
    );
  }
  
  res.json({
    success: true,
    message: 'Playlist assigned successfully'
  });
}));

/**
 * DELETE /api/permissions/:userId/assign-playlist/:playlistId
 * Remove playlist assignment (Admin only)
 */
router.delete('/:userId/assign-playlist/:playlistId', asyncHandler(async (req, res) => {
  const { userId, playlistId } = req.params;
  const db = getDatabase();
  
  await db.query(
    'DELETE FROM user_assigned_playlists WHERE user_id = ? AND playlist_id = ?',
    [userId, playlistId]
  );
  
  res.json({
    success: true,
    message: 'Playlist assignment removed'
  });
}));

/**
 * POST /api/permissions/:userId/reset
 * Reset permissions to role defaults (Admin only)
 */
router.post('/:userId/reset', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const db = getDatabase();
  
  // Get user role
  const [users] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
  
  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
  
  const role = users[0].role;
  
  // Set default permissions based on role
  let defaults = {};
  
  if (role === 'staff') {
    defaults = {
      can_add_playlists: true,
      can_edit_own_playlists: true,
      can_delete_own_playlists: true,
      max_playlists: 10
    };
  } else {
    // user role
    defaults = {
      can_add_playlists: false,
      can_edit_own_playlists: false,
      can_delete_own_playlists: false,
      max_playlists: -1
    };
  }
  
  // Delete and recreate
  await db.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
  
  await db.query(
    `INSERT INTO user_permissions 
     (user_id, can_add_playlists, can_edit_own_playlists, can_delete_own_playlists, max_playlists)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, defaults.can_add_playlists, defaults.can_edit_own_playlists, 
     defaults.can_delete_own_playlists, defaults.max_playlists]
  );
  
  const updatedPermissions = await getUserPermissions(userId);
  
  res.json({
    success: true,
    permissions: updatedPermissions,
    message: 'Permissions reset to role defaults'
  });
}));

module.exports = router;

