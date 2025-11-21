#!/bin/bash
# Production Deployment - Pairing Link Fix
# Run this on your production server

echo "🚀 Deploying Pairing Link Fix (v1.0.8)"
echo "======================================="
echo ""

# 1. Pull latest code
echo "📥 Step 1: Pulling latest code from GitHub..."
cd ~/tv.bakeandgrill.mv
git pull origin main
echo ""

# 2. Copy built files
echo "📦 Step 2: Copying built files to public directory..."
cp -r ~/tv.bakeandgrill.mv/client/dist/* ~/public_html/tv.bakeandgrill.mv/
echo ""

# 3. Verify
echo "✅ Step 3: Verifying deployment..."
if grep -q "tv.bakeandgrill.mv/pair" ~/public_html/tv.bakeandgrill.mv/assets/*.js; then
    echo "✅ Pairing link fix is deployed!"
else
    echo "⚠️ Warning: Could not verify fix in built files"
fi
echo ""

# 4. Check version
echo "📱 Step 4: Checking app version..."
grep -h "APP_VERSION.*1.0.8" ~/public_html/tv.bakeandgrill.mv/assets/*.js | head -1
echo ""

echo "======================================="
echo "✅ Deployment complete!"
echo ""
echo "🌐 Test: https://tv.bakeandgrill.mv"
echo "🔄 Users will auto-reload with v1.0.8"
echo ""
echo "Next steps:"
echo "1. Open https://tv.bakeandgrill.mv in incognito"
echo "2. Click 'Pair Display Now' button"
echo "3. Should navigate to /pair (no #)"

