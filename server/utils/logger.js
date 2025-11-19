/**
 * Logger utility for Bake & Grill TV Server
 * Controls logging output based on environment
 */

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Log informational messages (development only)
 * In production, these are suppressed to reduce log noise
 */
const log = (...args) => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Log debug messages (development only)
 * Use for detailed debugging information
 */
const debug = (...args) => {
  if (isDev) {
    console.log('[DEBUG]', ...args);
  }
};

/**
 * Log warnings (always logged)
 * Use for recoverable issues that should be investigated
 */
const warn = (...args) => {
  console.warn(...args);
};

/**
 * Log errors (always logged)
 * Use for errors that need attention
 */
const error = (...args) => {
  console.error(...args);
};

/**
 * Log important information (always logged)
 * Use for startup messages, configuration, etc.
 */
const info = (...args) => {
  console.log(...args);
};

/**
 * Log security-related events (always logged)
 * Use for authentication, authorization, suspicious activity
 */
const security = (...args) => {
  console.log('🔒 [SECURITY]', ...args);
};

/**
 * Log performance metrics (development only)
 * Use for performance monitoring and optimization
 */
const perf = (label, data) => {
  if (isDev) {
    console.log(`⚡ [PERF] ${label}:`, data);
  }
};

module.exports = {
  log,       // Dev-only general logs
  debug,     // Dev-only debug logs
  warn,      // Always: warnings
  error,     // Always: errors
  info,      // Always: important info
  security,  // Always: security events
  perf,      // Dev-only: performance metrics
  isDev      // Export for conditional logic
};

