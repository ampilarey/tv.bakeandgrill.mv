/**
 * Error Tracking Utility
 * Track and log app errors for debugging
 */

// Store errors in localStorage for persistence
const ERROR_STORAGE_KEY = 'app_errors';
const MAX_STORED_ERRORS = 50;

/**
 * Log an error to console and storage
 */
export function logError(error, context = {}) {
  const errorEntry = {
    timestamp: new Date().toISOString(),
    message: error?.message || 'Unknown error',
    stack: error?.stack || '',
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Log to console
  console.error('❌ App Error:', errorEntry);

  // Store in localStorage
  try {
    const storedErrors = JSON.parse(localStorage.getItem(ERROR_STORAGE_KEY) || '[]');
    storedErrors.unshift(errorEntry);
    
    // Keep only last MAX_STORED_ERRORS
    if (storedErrors.length > MAX_STORED_ERRORS) {
      storedErrors.splice(MAX_STORED_ERRORS);
    }
    
    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(storedErrors));
  } catch (e) {
    console.error('Failed to store error:', e);
  }

  return errorEntry;
}

/**
 * Get stored errors
 */
export function getStoredErrors() {
  try {
    return JSON.parse(localStorage.getItem(ERROR_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Clear stored errors
 */
export function clearStoredErrors() {
  try {
    localStorage.removeItem(ERROR_STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Safe API call wrapper
 */
export async function safeApiCall(apiCall, fallbackValue = null, context = '') {
  try {
    return await apiCall();
  } catch (error) {
    logError(error, { context, type: 'API_CALL' });
    return fallbackValue;
  }
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, { type: 'UNHANDLED_REJECTION' });
    event.preventDefault(); // Prevent console error
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    logError(event.error || new Error(event.message), {
      type: 'GLOBAL_ERROR',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  console.log('✅ Global error handlers installed');
}

