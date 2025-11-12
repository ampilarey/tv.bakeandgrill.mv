#!/bin/bash
# Deployment script for cPanel
# Run this on your cPanel server after git pull

echo "🚀 Starting deployment..."

# Navigate to project directory
cd ~/tv.bakeandgrill.mv || exit 1

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Copy built files to web root
echo "📦 Deploying frontend files..."
rm -rf assets/*.js assets/*.css 2>/dev/null
cp -r client/dist/assets/* assets/ 2>/dev/null || mkdir -p assets && cp -r client/dist/assets/* assets/
cp client/dist/*.html .
cp client/dist/*.js . 2>/dev/null
cp client/dist/*.webmanifest . 2>/dev/null

# Update .htaccess with correct rules
echo "⚙️  Updating .htaccess..."
cat > .htaccess << 'HTACCESS_EOF'
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

# Don't rewrite if file exists (important for assets!)
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Redirect all other requests to index.html (SPA routing)
RewriteRule ^ index.html [L]
HTACCESS_EOF

echo "✅ Frontend deployed successfully!"
echo ""
echo "📊 Deployed files:"
ls -lh index.html assets/*.js 2>/dev/null | tail -5

echo ""
echo "🔄 Next: Restart Node.js app in cPanel"
echo "   Go to: Setup Node.js App > Application URL: tv.bakeandgrill.mv > Click RESTART"

