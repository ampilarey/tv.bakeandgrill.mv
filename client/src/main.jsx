import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './context/ThemeContext.jsx';
import App from './App.jsx';
import './index.css';
import { APP_VERSION, checkVersion } from './utils/version.js';

// Store version for debugging
if (typeof window !== 'undefined') {
  window.APP_VERSION = APP_VERSION;
  console.log('📱 App Version:', APP_VERSION);
  
  // Version-based cache clearing - only clear on version change
  (async () => {
    try {
      const storedVersion = localStorage.getItem('tv_app_version');
      const versionChanged = storedVersion && storedVersion !== APP_VERSION;
      
      if (versionChanged) {
        console.log(`🔄 Version changed: ${storedVersion} → ${APP_VERSION} - Clearing caches`);
        
        // 1. Unregister ALL service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            await registration.unregister();
            console.log('✅ Unregistered service worker:', registration.scope);
          }
        }
        
        // 2. Delete ALL caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log('🗑️ Deleted cache:', cacheName);
          }
          console.log('✅ All caches cleared');
        }
        
        // Update stored version BEFORE reload to prevent loop
        localStorage.setItem('tv_app_version', APP_VERSION);
        
        // Optional: Reload once after clearing (commented out - let user continue)
        // window.location.reload();
      } else if (!storedVersion) {
        // First visit - just store version
        localStorage.setItem('tv_app_version', APP_VERSION);
        console.log('📝 First visit - stored version');
      } else {
        // Same version - no cache clearing needed
        console.log('✅ Same version - no cache clear needed');
      }
      
      // Register service worker (always, regardless of version)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none' // Don't cache the service worker itself
          });
          
          console.log('✅ Service worker registered:', registration.scope);
          
          // Check for updates immediately
          await registration.update();
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New service worker installed - reloading...');
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  // Give user a moment, then reload
                  setTimeout(() => {
                    localStorage.setItem('tv_app_version', APP_VERSION);
                    window.location.reload();
                  }, 500);
                }
              });
            }
          });
          
          // Also listen for controller change (service worker activated)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('🔄 Service worker controller changed - reloading...');
            localStorage.setItem('tv_app_version', APP_VERSION);
            window.location.reload();
          });
          
        } catch (error) {
          console.error('❌ Service worker registration error:', error);
        }
      }
      
    } catch (error) {
      console.error('❌ Version/cache management error:', error);
    }
  })();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);

