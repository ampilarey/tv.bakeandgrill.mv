const jwt = require('jsonwebtoken');

/**
 * Verify JWT token from Authorization header
 */
function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        code: 'AUTH_NO_TOKEN'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
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
 * @param {string|Array} roles - Required role(s)
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

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

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
    
    // Token verification happens in route (check against database)
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

