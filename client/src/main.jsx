import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './context/ThemeContext.jsx';
import App from './App.jsx';
import './index.css';

// 🚨 CRITICAL: Force service worker update and cache clear
// Version: 2025-01-15-ios-native-hls-fix
const APP_VERSION = '2025-01-15-ios-native-hls-fix';

// Unregister all old service workers and clear cache
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Unregister all service workers first
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log('✅ Unregistered old service worker');
      }
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('🗑️ Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
        console.log('✅ All caches cleared');
      }
      
      // Wait a bit before registering new service worker
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Register new service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ New service worker registered:', registration);
      
      // Force immediate update
      registration.update();
      
      // If there's an update, skip waiting and claim clients
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, skip waiting
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          });
        }
      });
      
      // Listen for controller change (new service worker activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('✅ Service worker controller changed - reloading...');
        window.location.reload();
      });
      
    } catch (error) {
      console.error('❌ Service worker registration error:', error);
    }
  });
  
  // Store version for debugging
  if (typeof window !== 'undefined') {
    window.APP_VERSION = APP_VERSION;
    console.log('📱 App Version:', APP_VERSION);
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);

