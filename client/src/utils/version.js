// Auto-reload on new version
const APP_VERSION = Date.now(); // Changes on every build

export function checkVersion() {
  const storedVersion = localStorage.getItem('app_version');
  
  if (storedVersion && storedVersion !== String(APP_VERSION)) {
    // New version detected, clear caches and reload
    console.log('New version detected, updating...');
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
    
    // Clear caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Update version and reload
    localStorage.setItem('app_version', String(APP_VERSION));
    window.location.reload(true);
    return false;
  }
  
  localStorage.setItem('app_version', String(APP_VERSION));
  return true;
}

