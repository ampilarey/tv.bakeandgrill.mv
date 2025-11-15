// Quick check: What version is running?
console.log('📱 Checking app version...');
if (window.APP_VERSION) {
  console.log('✅ App Version:', window.APP_VERSION);
} else {
  console.warn('⚠️ APP_VERSION not found - old code may be running');
}

// Check what JS files are loaded
const scripts = Array.from(document.scripts);
scripts.forEach(script => {
  if (script.src && script.src.includes('index-')) {
    console.log('📜 JS file loaded:', script.src);
  }
});

