// Version check - only reload on actual version change
// Update this manually when deploying major changes
export const APP_VERSION = '1.0.6'; // Semantic versioning - updated for Android/iOS/PWA fixes

export function checkVersion() {
  try {
    // Check if we just reloaded (prevent reload loop)
    const lastReload = sessionStorage.getItem('last_version_reload');
    const now = Date.now();
    
    // If we reloaded less than 5 seconds ago, don't reload again
    if (lastReload && (now - parseInt(lastReload)) < 5000) {
      console.log('Recent reload detected, skipping version check');
      localStorage.setItem('app_version', APP_VERSION);
      return true;
    }
    
    const storedVersion = localStorage.getItem('app_version');
    
    // Only reload if stored version exists AND is different
    if (storedVersion && storedVersion !== APP_VERSION) {
      console.log(`New version detected: ${storedVersion} → ${APP_VERSION}`);
      
      // Update version BEFORE reload to prevent loop
      localStorage.setItem('app_version', APP_VERSION);
      sessionStorage.setItem('last_version_reload', String(now));
      
      // Clear caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        }).then(() => {
          window.location.reload(true);
        }).catch(err => {
          console.error('Cache clear error:', err);
          window.location.reload(true);
        });
      } else {
        window.location.reload(true);
      }
      return false;
    }
    
    // First visit or same version - no reload
    localStorage.setItem('app_version', APP_VERSION);
    return true;
  } catch (error) {
    console.error('Version check error:', error);
    // On error, just continue without reload
    return true;
  }
}

