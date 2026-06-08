import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext.jsx';
import App from './App.jsx';
import './index.css';
import { APP_VERSION } from './utils/version.js';
import { clearChunkReloadFlag } from './utils/lazyWithRetry.js';
import { redirectLegacyHashRoutes } from './utils/legacyHashRedirect.js';
import { isTvKioskPath } from './utils/tvRoutes.js';

redirectLegacyHashRoutes();
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
      const onTv = isTvKioskPath();

      // TVs: no service worker — SW update reloads were disrupting 24/7 playback.
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (onTv) {
          for (const registration of registrations) {
            await registration.unregister();
          }
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              await caches.delete(cacheName);
            }
          }
        } else {
          const storedVersion = localStorage.getItem('tv_app_version');
          const versionChanged = storedVersion && storedVersion !== APP_VERSION;

          if (versionChanged) {
            for (const registration of registrations) {
              await registration.unregister();
            }
            if ('caches' in window) {
              const cacheNames = await caches.keys();
              for (const cacheName of cacheNames) {
                await caches.delete(cacheName);
              }
            }
            localStorage.setItem('tv_app_version', APP_VERSION);
          } else if (!storedVersion) {
            localStorage.setItem('tv_app_version', APP_VERSION);
          }

          if (!navigator.serviceWorker.controller) {
            try {
              const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none',
              });
              // Check for updates periodically — never force reload (admin can hard-refresh).
              setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000);
              window.swRegistration = registration;
            } catch { /* SW not supported — continue without */ }
          }
        }
      }

      localStorage.setItem('tv_app_version', APP_VERSION);
    } catch { /* version/cache management failed — continue */ }

    clearChunkReloadFlag();
    sessionStorage.removeItem('asset_recovery_once');

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
