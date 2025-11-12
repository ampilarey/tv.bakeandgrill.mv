#!/bin/bash
# Deployment script for cPanel
# Run this on your cPanel server after git pull

echo "🚀 Starting deployment..."

# Navigate to project directory (git repo)
cd ~/tv.bakeandgrill.mv || exit 1

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Define web root path
WEB_ROOT=~/public_html/tv.bakeandgrill.mv

# Copy built files to web root
echo "📦 Deploying frontend files to $WEB_ROOT..."

# Ensure web root and assets directory exist
mkdir -p "$WEB_ROOT/assets"

# Copy assets (JS, CSS, etc.)
if [ -d "client/dist/assets" ]; then
  cp -v client/dist/assets/* "$WEB_ROOT/assets/" 2>/dev/null || echo "⚠️  No assets found in client/dist/assets/"
else
  echo "❌ ERROR: client/dist/assets directory not found!"
  echo "   Run 'npm run build' in the client directory first."
  exit 1
fi

# Copy HTML files
if [ -f "client/dist/index.html" ]; then
  cp -v client/dist/*.html "$WEB_ROOT/"
else
  echo "❌ ERROR: index.html not found in client/dist/"
  exit 1
fi

# Copy other files (JS, webmanifest, SW)
cp -v client/dist/*.js "$WEB_ROOT/" 2>/dev/null || true
cp -v client/dist/*.webmanifest "$WEB_ROOT/" 2>/dev/null || true

# Update .htaccess with correct rules
echo "⚙️  Updating .htaccess..."
cat > "$WEB_ROOT/.htaccess" << 'HTACCESS_EOF'
# Never cache HTML files
<FilesMatch "\.(html|htm)$">
  Header set Cache-Control "no-cache, no-store, must-revalidate, max-age=0"
  Header set Pragma "no-cache"
  Header set Expires "0"
</FilesMatch>

# Cache assets forever (they have hash in name)
<FilesMatch "\.(js|css|png|jpg|jpeg|svg|woff|woff2|webmanifest)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

# Force correct MIME types
AddType application/javascript .js
AddType text/css .css
AddType application/json .webmanifest

# Enable rewrite engine
RewriteEngine On

# API proxy - proxy /api requests to Node.js backend
RewriteCond %{REQUEST_URI} ^/api
RewriteRule ^(.*)$ http://127.0.0.1:4000/$1 [P,L]

# Exclude assets folder from rewriting (CRITICAL - must be before file check!)
RewriteCond %{REQUEST_URI} ^/assets/ [OR]
RewriteCond %{REQUEST_URI} \.(js|css|png|jpg|jpeg|svg|woff|woff2|webmanifest)$ [OR]
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Redirect all other requests to index.html (SPA routing)
RewriteRule ^ index.html [L]
HTACCESS_EOF

echo "✅ Frontend deployed successfully!"
echo ""
echo "📊 Deployed files:"
ls -lh "$WEB_ROOT/index.html" "$WEB_ROOT/assets/"*.js 2>/dev/null | tail -5

echo ""
echo "🔄 Next: Restart Node.js app in cPanel"
echo "   Go to: Setup Node.js App > Application URL: tv.bakeandgrill.mv > Click RESTART"

