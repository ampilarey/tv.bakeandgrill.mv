const { getDatabase } = require('../database/init');

/**
 * Check if user has a specific permission
 * @param {string} permission - Permission name (e.g., 'can_add_playlists')
 */
function checkPermission(permission) {
  return async (req, res, next) => {
    try {
      // Admin always has all permissions
      if (req.user.role === 'admin') {
        return next();
      }
      
      const db = getDatabase();
      
      // Get user permissions
      const [permissions] = await db.query(
        'SELECT * FROM user_permissions WHERE user_id = ?',
        [req.user.id]
      );
      
      if (permissions.length === 0) {
        // No permissions set - deny by default
        return res.status(403).json({
          success: false,
          error: 'No permissions configured for this user',
          code: 'PERMISSION_NOT_CONFIGURED'
        });
      }
      
      const userPermissions = permissions[0];
      
      // Check if user has the required permission
      if (!userPermissions[permission]) {
        return res.status(403).json({
          success: false,
          error: `You don't have permission: ${permission}`,
          code: 'PERMISSION_DENIED',
          required: permission
        });
      }
      
      // Attach permissions to request for later use
      req.permissions = userPermissions;
      next();
      
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check permissions',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

/**
 * Check resource limit (e.g., max playlists)
 * @param {string} resource - Resource type ('playlists' or 'displays')
 * @param {string} table - Database table name
 * @param {string} userIdColumn - Column name for user ID
 */
function checkResourceLimit(resource, table, options = {}) {
  return async (req, res, next) => {
    try {
      // Admin has unlimited resources
      if (req.user.role === 'admin') {
        return next();
      }
      
      const db = getDatabase();
      const {
        userIdColumn = 'user_id',
        countQuery = null,
        countParamsBuilder = null
      } = options;
      
      // Get user permissions
      const [permissions] = await db.query(
        'SELECT * FROM user_permissions WHERE user_id = ?',
        [req.user.id]
      );
      
      if (permissions.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'No permissions configured',
          code: 'PERMISSION_NOT_CONFIGURED'
        });
      }
      
      const userPermissions = permissions[0];
      const limitField = `max_${resource}`;
      const maxAllowed = userPermissions[limitField];
      
      // -1 = none allowed, 0 = unlimited, N = specific number
      if (maxAllowed === -1) {
        return res.status(403).json({
          success: false,
          error: `You don't have permission to create ${resource}`,
          code: 'RESOURCE_NOT_ALLOWED'
        });
      }
      
      if (maxAllowed === 0) {
        // Unlimited
        return next();
      }
      
      // Check current count
      let currentCount = 0;
      try {
        let query = countQuery;
        let params;
        
        if (query) {
          params = typeof countParamsBuilder === 'function'
            ? countParamsBuilder(req)
            : [req.user.id];
        } else {
          query = `SELECT COUNT(*) as count FROM ${table} WHERE ${userIdColumn} = ?`;
          params = [req.user.id];
        }
        
        const [count] = await db.query(query, params);
        currentCount = Array.isArray(count) && count.length > 0 && count[0].count !== undefined
          ? count[0].count
          : 0;
      } catch (error) {
        // If the resource tracking column/table doesn't exist yet, log and skip the limit.
        console.error('Resource limit count failed:', error.code || error.message);
        return next();
      }
      
      if (currentCount >= maxAllowed) {
        return res.status(403).json({
          success: false,
          error: `You've reached your limit of ${maxAllowed} ${resource}`,
          code: 'RESOURCE_LIMIT_REACHED',
          current: currentCount,
          max: maxAllowed
        });
      }
      
      req.resourceLimit = {
        current: currentCount,
        max: maxAllowed,
        remaining: maxAllowed - currentCount
      };
      
      next();
      
    } catch (error) {
      console.error('Resource limit check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check resource limit',
        code: 'LIMIT_CHECK_ERROR'
      });
    }
  };
}

/**
 * Get user's complete permissions (for frontend)
 */
async function getUserPermissions(userId) {
  try {
    const db = getDatabase();
    
    const [permissions] = await db.query(
      'SELECT * FROM user_permissions WHERE user_id = ?',
      [userId]
    );
    
    if (permissions.length === 0) {
      return null;
    }
    
    return permissions[0];
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
}

/**
 * Get user's assigned playlists
 */
async function getAssignedPlaylists(userId) {
  try {
    const db = getDatabase();
    
    const [assigned] = await db.query(
      `SELECT ap.*, p.name as playlist_name, p.m3u_url
       FROM user_assigned_playlists ap
       JOIN playlists p ON ap.playlist_id = p.id
       WHERE ap.user_id = ?`,
      [userId]
    );
    
    return assigned;
  } catch (error) {
    console.error('Error getting assigned playlists:', error);
    return [];
  }
}

module.exports = {
  checkPermission,
  checkResourceLimit,
  getUserPermissions,
  getAssignedPlaylists
};

