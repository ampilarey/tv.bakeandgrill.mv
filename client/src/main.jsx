import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './context/ThemeContext.jsx';
import App from './App.jsx';
import './index.css';

// 🚨 CRITICAL: Force service worker update and cache clear - RUN IMMEDIATELY
// Version: 2025-11-15-cache-bust-v2 (changed to force service worker update)
const APP_VERSION = '2025-11-15-cache-bust-v2';

// Store version for debugging IMMEDIATELY
if (typeof window !== 'undefined') {
  window.APP_VERSION = APP_VERSION;
  console.log('📱 App Version:', APP_VERSION);
  
  // CRITICAL: Clear caches IMMEDIATELY before anything else loads
  (async () => {
    try {
      // 1. Unregister ALL service workers FIRST
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
      
      // 3. Force reload if old version detected
      const currentScript = document.currentScript || Array.from(document.scripts).pop();
      if (currentScript) {
        const scriptSrc = currentScript.src;
        console.log('📜 Current script:', scriptSrc);
        
        // If we're loading the old cached script, force reload
        if (scriptSrc.includes('CM0JPdys') || scriptSrc.includes('BrB98PUB') || scriptSrc.includes('C3OLTmHE')) {
          console.warn('⚠️ OLD CACHED SCRIPT DETECTED - FORCING RELOAD');
          // Clear all storage
          if (typeof Storage !== 'undefined') {
            try {
              localStorage.clear();
              sessionStorage.clear();
            } catch (e) {}
          }
          // Force reload with cache bypass
          window.location.reload(true);
          return;
        }
      }
      
      // 4. Re-register service worker AFTER cache clear
      if ('serviceWorker' in navigator) {
        // Wait a moment before re-registering
        setTimeout(async () => {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/',
              updateViaCache: 'none' // Don't cache the service worker itself
            });
            
            console.log('✅ Service worker registered:', registration);
            
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
                    setTimeout(() => window.location.reload(), 100);
                  }
                });
              }
            });
            
          } catch (error) {
            console.error('❌ Service worker registration error:', error);
          }
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Cache clearing error:', error);
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

