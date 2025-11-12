// Version check - only reload on actual version change
// Update this manually when deploying major changes
const APP_VERSION = '1.0.5'; // Semantic versioning

export function checkVersion() {
  const storedVersion = localStorage.getItem('app_version');
  
  // Only reload if stored version exists AND is different
  if (storedVersion && storedVersion !== APP_VERSION) {
    console.log(`New version detected: ${storedVersion} → ${APP_VERSION}`);
    
    // Clear caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      }).then(() => {
        // Update version BEFORE reload to prevent loop
        localStorage.setItem('app_version', APP_VERSION);
        // Small delay to ensure localStorage is saved
        setTimeout(() => {
          window.location.reload(true);
        }, 100);
      });
    } else {
      // No cache API, just update and reload
      localStorage.setItem('app_version', APP_VERSION);
      setTimeout(() => {
        window.location.reload(true);
      }, 100);
    }
    return false;
  }
  
  // First visit or same version - no reload
  localStorage.setItem('app_version', APP_VERSION);
  return true;
}

