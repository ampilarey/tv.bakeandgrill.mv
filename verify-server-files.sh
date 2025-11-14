#!/bin/bash
# Script to verify server files match the latest commit

echo "🔍 Verifying server files..."
echo ""

SERVER_DIR="$HOME/tv.bakeandgrill.mv/client/dist"

if [ ! -d "$SERVER_DIR" ]; then
    echo "❌ Directory not found: $SERVER_DIR"
    exit 1
fi

echo "📁 Checking files in: $SERVER_DIR"
echo ""

# Check workbox file
echo "1. Checking workbox file:"
if [ -f "$SERVER_DIR/workbox-cd226df9.js" ]; then
    echo "   ✅ workbox-cd226df9.js exists (NEW)"
else
    if [ -f "$SERVER_DIR/workbox-02ef3aa3.js" ]; then
        echo "   ❌ workbox-02ef3aa3.js exists (OLD)"
    else
        echo "   ❌ No workbox file found!"
    fi
fi

# Check service worker
echo "2. Checking service worker:"
if grep -q "workbox-cd226df9" "$SERVER_DIR/sw.js" 2>/dev/null; then
    echo "   ✅ sw.js references workbox-cd226df9.js (NEW)"
else
    if grep -q "workbox-02ef3aa3" "$SERVER_DIR/sw.js" 2>/dev/null; then
        echo "   ❌ sw.js references workbox-02ef3aa3.js (OLD)"
    else
        echo "   ⚠️  Could not check sw.js"
    fi
fi

# Check index.html
echo "3. Checking index.html references:"
if grep -q "index-0UrAJhdh.js" "$SERVER_DIR/index.html" 2>/dev/null; then
    echo "   ✅ index.html references index-0UrAJhdh.js (CORRECT)"
else
    echo "   ❌ index.html references wrong JS file"
fi

if grep -q "react-vendor-DY6H39Bc.js" "$SERVER_DIR/index.html" 2>/dev/null; then
    echo "   ✅ index.html references react-vendor-DY6H39Bc.js (CORRECT)"
else
    echo "   ❌ index.html references wrong vendor file"
fi

# Check asset files exist
echo "4. Checking asset files:"
ASSETS="$SERVER_DIR/assets"
if [ -f "$ASSETS/index-0UrAJhdh.js" ]; then
    echo "   ✅ assets/index-0UrAJhdh.js exists"
else
    echo "   ❌ assets/index-0UrAJhdh.js missing"
fi

if [ -f "$ASSETS/react-vendor-DY6H39Bc.js" ]; then
    echo "   ✅ assets/react-vendor-DY6H39Bc.js exists"
else
    echo "   ❌ assets/react-vendor-DY6H39Bc.js missing"
fi

if [ -f "$ASSETS/hls-vendor-swFHWmXm.js" ]; then
    echo "   ✅ assets/hls-vendor-swFHWmXm.js exists"
else
    echo "   ❌ assets/hls-vendor-swFHWmXm.js missing"
fi

echo ""
echo "📊 File modification times:"
ls -lh "$SERVER_DIR/workbox"*.js 2>/dev/null | awk '{print "   "$9" - "$6" "$7" "$8}'
ls -lh "$SERVER_DIR/index.html" "$SERVER_DIR/sw.js" 2>/dev/null | awk '{print "   "$9" - "$6" "$7" "$8}'

echo ""
echo "✅ Verification complete!"

