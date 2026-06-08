const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');

/**
 * Verify JWT token from Authorization header
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        code: 'AUTH_NO_TOKEN'
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'bakeandgrill-tv',
      audience: 'bakeandgrill-tv-client',
    });

    try {
      const db = getDatabase();
      const [users] = await db.query(
        'SELECT token_version FROM users WHERE id = ?',
        [decoded.id]
      );
      if (users.length > 0 && (users[0].token_version || 0) !== (decoded.tv || 0)) {
        return res.status(401).json({
          success: false,
          error: 'Session invalidated — please log in again',
          code: 'AUTH_TOKEN_REVOKED',
        });
      }
    } catch (dbErr) {
      console.error('[AUTH] token_version check failed:', dbErr.message);
      return res.status(503).json({
        success: false,
        error: 'Authentication verification unavailable',
        code: 'AUTH_VERIFICATION_UNAVAILABLE',
      });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tokenVersion: decoded.tv || 0,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'AUTH_INVALID_TOKEN'
    });
  }
}

/**
 * Require specific role(s)
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'AUTH_INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
}

const requireAdmin = requireRole('admin');

/**
 * Verify display token from request body
 */
function verifyDisplayToken(req, res, next) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Display token required',
        code: 'DISPLAY_TOKEN_REQUIRED'
      });
    }

    req.displayToken = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid display token',
      code: 'DISPLAY_INVALID_TOKEN'
    });
  }
}

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin,
  verifyDisplayToken
};
