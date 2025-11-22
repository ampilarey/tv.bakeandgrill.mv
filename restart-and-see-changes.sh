#!/bin/bash

# Quick script to restart dev servers and see changes
# Usage: ./restart-and-see-changes.sh

echo "🚀 Restarting servers to see new features..."
echo ""

# Check if servers are running
echo "📊 Checking current status..."
echo ""

# Server check
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Server is running on port 4000"
else
    echo "⚠️  Server is NOT running on port 4000"
fi

# Client check  
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Client is running on port 5173"
elif lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Client is running on port 3000"
else
    echo "⚠️  Client is NOT running"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 TO SEE NEW FEATURES, DO THIS:"
echo ""
echo "1️⃣  RESTART SERVER (Terminal 1):"
echo "   cd /Users/vigani/Website/tv/server"
echo "   npm run dev"
echo ""
echo "2️⃣  RESTART CLIENT (Terminal 2):"
echo "   cd /Users/vigani/Website/tv/client"
echo "   npm run dev"
echo ""
echo "3️⃣  HARD REFRESH BROWSER:"
echo "   Mac: Cmd + Shift + R"
echo "   Windows: Ctrl + Shift + R"
echo ""
echo "4️⃣  GO TO ADMIN DASHBOARD:"
echo "   http://localhost:5173/admin/dashboard"
echo ""
echo "5️⃣  LOOK FOR 3 NEW BUTTONS:"
echo "   📢 Ticker Messages"
echo "   📅 Schedules"
echo "   🎬 Scenes & Modes"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 VERIFY FEATURES:"
echo ""
echo "✅ Check feature flags:"
echo "   curl http://localhost:4000/api/features | python3 -m json.tool"
echo ""
echo "✅ Direct URLs to test:"
echo "   http://localhost:5173/admin/ticker"
echo "   http://localhost:5173/admin/schedules"
echo "   http://localhost:5173/admin/scenes"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Read: QUICK-START-LOCAL.md for detailed instructions"
echo ""
echo "✨ All files are in place - just restart and refresh! ✨"

