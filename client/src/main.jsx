import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext.jsx';
import App from './App.jsx';
import './index.css';
import { APP_VERSION } from './utils/version.js';
import { initSentry, setupGlobalErrorHandlers } from './utils/errorTracking.js';

// Init Sentry before anything else (no-op when VITE_SENTRY_DSN is not set)
initSentry();

// TanStack Query client with sensible defaults for a TV dashboard
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30 s before background refetch
      gcTime: 5 * 60_000,       // 5 min cache retention
      retry: 2,
      refetchOnWindowFocus: false, // avoid surprise refetches on TV displays
    },
  },
});

// Setup global error tracking
setupGlobalErrorHandlers();

// Store version for debugging
if (typeof window !== 'undefined') {
  window.APP_VERSION = APP_VERSION;

  // Version-based cache clearing + service worker registration.
  // ReactDOM.render is deferred until after the async setup so that the app
  // never boots on a stale cache if a version change was detected.
  (async () => {
    try {
      const storedVersion = localStorage.getItem('tv_app_version');
      const versionChanged = storedVersion && storedVersion !== APP_VERSION;

      if (versionChanged) {
        // 1. Unregister ALL service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }

        // 2. Delete ALL caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
          }
        }

        // Update stored version BEFORE render to prevent a loop
        localStorage.setItem('tv_app_version', APP_VERSION);
      } else if (!storedVersion) {
        localStorage.setItem('tv_app_version', APP_VERSION);
      }

      // Register service worker (always, regardless of version)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
          });

          const checkForUpdates = async () => {
            try { await registration.update(); } catch { /* silent */ }
          };

          await checkForUpdates();

          const updateInterval = setInterval(checkForUpdates, 5 * 60 * 1000);

          // Track handlers so they can be removed when the controller changes
          const onVisibilityChange = () => { if (!document.hidden) checkForUpdates(); };
          const onFocus = () => checkForUpdates();

          document.addEventListener('visibilitychange', onVisibilityChange);
          window.addEventListener('focus', onFocus);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                localStorage.setItem('tv_app_version', APP_VERSION);
              }
            });
          });

          // Clean up listeners when the controller changes (SW activated)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            clearInterval(updateInterval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('focus', onFocus);
            localStorage.setItem('tv_app_version', APP_VERSION);
          }, { once: true });

          window.swRegistration = registration;
        } catch { /* SW not supported or blocked — continue without */ }
      }
    } catch { /* version/cache management failed — continue */ }

    // Mount the React tree only after all async setup above completes so the
    // app never races with in-flight cache deletion.
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </QueryClientProvider>
      </React.StrictMode>,
    );
  })();
}
