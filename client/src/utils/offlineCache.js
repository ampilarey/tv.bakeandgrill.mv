/**
 * Offline Cache Utility
 * Service worker caching for offline support
 * Phase 8: Offline & Polish
 */
const CACHE_NAME = 'bake-grill-tv-v1';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Assets to cache
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/index.css',
  '/assets/index.js'
];

/**
 * Initialize service worker
 */
export function initializeServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('✅ Service Worker registered:', registration.scope);
        })
        .catch(error => {
          console.error('❌ Service Worker registration failed:', error);
        });
    });
  }
}

/**
 * Cache an image
 * @param {string} url - Image URL
 */
export async function cacheImage(url) {
  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.add(url);
      return true;
    } catch (error) {
      console.error('Error caching image:', error);
      return false;
    }
  }
  return false;
}

/**
 * Get cached image
 * @param {string} url - Image URL
 */
export async function getCachedImage(url) {
  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      return response ? response.blob() : null;
    } catch (error) {
      console.error('Error getting cached image:', error);
      return null;
    }
  }
  return null;
}

/**
 * Clear old cache entries
 */
export async function clearOldCache() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => name !== CACHE_NAME);
      
      await Promise.all(
        oldCaches.map(name => caches.delete(name))
      );
      
      console.log('✅ Old cache cleared');
      return true;
    } catch (error) {
      console.error('Error clearing old cache:', error);
      return false;
    }
  }
  return false;
}

/**
 * Get cache size estimate
 */
export async function getCacheSize() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
        usageDetails: estimate.usageDetails
      };
    } catch (error) {
      console.error('Error getting cache size:', error);
      return null;
    }
  }
  return null;
}

