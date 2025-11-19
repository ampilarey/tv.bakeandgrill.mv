/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Log full error details (for server logs only)
  console.error('Error:', err);
  
  // Determine status code
  const status = err.status || err.statusCode || 500;
  
  // Sanitize error message and code to avoid leaking sensitive info
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';
  
  // Sanitize database errors (never send SQL details to client)
  const databaseErrorCodes = [
    'ER_', 'ECONNREFUSED', 'PROTOCOL_', 'ER_DUP_ENTRY', 
    'ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE', 'ER_ACCESS_DENIED_ERROR'
  ];
  
  const isDatabaseError = databaseErrorCodes.some(dbCode => 
    (typeof code === 'string' && code.startsWith(dbCode)) ||
    (typeof message === 'string' && message.includes('mysql'))
  );
  
  if (isDatabaseError && process.env.NODE_ENV === 'production') {
    message = 'A database error occurred. Please try again later.';
    code = 'DATABASE_ERROR';
  }
  
  // Sanitize any error that might expose system internals
  if (status === 500 && process.env.NODE_ENV === 'production') {
    // Only send generic message in production for 500 errors
    // unless it's an explicitly set user-facing message
    if (!err.userFacing) {
      message = 'An internal error occurred. Please try again later.';
      code = 'INTERNAL_ERROR';
    }
  }
  
  res.status(status).json({
    success: false,
    error: message,
    code: code,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: err.message 
    })
  });
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl
  });
}

/**
 * Async route wrapper to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};

