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
  
  // Default to production behaviour when NODE_ENV is not explicitly 'development'
  const isDev = process.env.NODE_ENV === 'development';

  if (isDatabaseError && !isDev) {
    message = 'A database error occurred. Please try again later.';
    code = 'DATABASE_ERROR';
  }
  
  if (status === 500 && !isDev && !err.userFacing) {
    message = 'An internal error occurred. Please try again later.';
    code = 'INTERNAL_ERROR';
  }
  
  res.status(status).json({
    success: false,
    error: message,
    code: code,
    ...(isDev && { 
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

