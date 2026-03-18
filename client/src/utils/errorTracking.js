/**
 * Error Tracking Utility
 * Wraps Sentry for production monitoring; falls back to localStorage logging
 * when VITE_SENTRY_DSN is not set (local / staging environments).
 */
import * as Sentry from '@sentry/react';

// Store errors in localStorage for persistence
const ERROR_STORAGE_KEY = 'app_errors';
const MAX_STORED_ERRORS = 50;

let _sentryEnabled = false;

/**
 * Call once, early in main.jsx, before ReactDOM.render.
 * DSN is read from the VITE_SENTRY_DSN env variable.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return; // skip in dev / when not configured

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Only send traces in production to keep quota low
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    // Replay 10 % of sessions; 100 % of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Don't send noisy network / script errors that aren't actionable
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network request failed',
      'Failed to fetch',
      /Loading chunk \d+ failed/,
    ],
  });

  _sentryEnabled = true;
  console.log('[Sentry] Initialized for environment:', import.meta.env.MODE);
}

/**
 * Log an error to Sentry (when enabled) and to localStorage.
 */
export function logError(error, context = {}) {
  const errorEntry = {
    timestamp: new Date().toISOString(),
    message: error?.message || 'Unknown error',
    stack: error?.stack || '',
    context,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  console.error('❌ App Error:', errorEntry);

  if (_sentryEnabled) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    });
  }

  try {
    const storedErrors = JSON.parse(localStorage.getItem(ERROR_STORAGE_KEY) || '[]');
    storedErrors.unshift(errorEntry);
    if (storedErrors.length > MAX_STORED_ERRORS) storedErrors.splice(MAX_STORED_ERRORS);
    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(storedErrors));
  } catch (e) {
    console.error('Failed to store error:', e);
  }

  return errorEntry;
}

/** Get stored errors from localStorage */
export function getStoredErrors() {
  try {
    return JSON.parse(localStorage.getItem(ERROR_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

/** Clear stored errors */
export function clearStoredErrors() {
  try {
    localStorage.removeItem(ERROR_STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Safe API call wrapper — logs errors without throwing.
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
 * Setup global error handlers.
 * Call once after initSentry().
 */
export function setupGlobalErrorHandlers() {
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, { type: 'UNHANDLED_REJECTION' });
    // Do NOT call event.preventDefault() — that silences browser devtools reporting.
  });

  window.addEventListener('error', (event) => {
    logError(event.error || new Error(event.message), {
      type: 'GLOBAL_ERROR',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  console.log('✅ Global error handlers installed');
}

/**
 * Sentry-aware ErrorBoundary — re-exported for convenience.
 * Usage: import { SentryErrorBoundary } from '../utils/errorTracking';
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;
