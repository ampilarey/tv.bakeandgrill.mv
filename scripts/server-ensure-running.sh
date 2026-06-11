#!/usr/bin/env bash
# Start the API if port 4000 is down. Safe to run after frontend-only git pull.
set -euo pipefail

APP_ROOT=~/tv.bakeandgrill.mv
LOG=~/tv-server.log
VENV=~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate

health_ok() {
  curl -sf -m 3 http://127.0.0.1:4000/api/health >/dev/null 2>&1
}

echo "=== Bake & Grill TV API check ==="

if health_ok; then
  echo "✅  API already running on port 4000"
  curl -s http://127.0.0.1:4000/api/health
  echo ""
  exit 0
fi

echo "❌  API not responding on port 4000 — starting server..."

# Stop only our app (avoid broad pkill)
if pgrep -f "tv.bakeandgrill.mv/server/server.js" >/dev/null 2>&1; then
  pkill -f "tv.bakeandgrill.mv/server/server.js" || true
  sleep 2
fi

cd "$APP_ROOT/server"
if [[ -f "$VENV" ]]; then
  # shellcheck disable=SC1090
  source "$VENV"
fi

nohup node server.js >>"$LOG" 2>&1 &
echo "   pid $! — logging to $LOG"
sleep 5

if health_ok; then
  echo "✅  API started"
  curl -s http://127.0.0.1:4000/api/health
  echo ""
  exit 0
fi

echo "❌  API still down. Last log lines:"
tail -30 "$LOG" 2>/dev/null || echo "(no log file)"
echo ""
echo "Try foreground start to see the error:"
echo "  cd ~/tv.bakeandgrill.mv/server && source $VENV && node server.js"
exit 1
