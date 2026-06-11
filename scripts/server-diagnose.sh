#!/usr/bin/env bash
# Quick 503 diagnostics — run on cPanel SSH.
set -u

echo "=== Frontend ==="
curl -sS -o /dev/null -w "version.json HTTP %{http_code}\n" https://tv.bakeandgrill.mv/version.json 2>/dev/null || echo "version.json failed"
curl -sS https://tv.bakeandgrill.mv/version.json 2>/dev/null || true
echo ""

echo "=== Backend (local) ==="
if curl -sS -m 5 http://127.0.0.1:4000/api/health 2>/dev/null; then
  echo ""
else
  echo "❌  Nothing on port 4000 — Node app is not running"
fi
echo ""

echo "=== Processes ==="
ps aux | grep "[n]ode.*server.js" || echo "No node server.js process"
echo ""

echo "=== Recent log (if present) ==="
for log in ~/tv-server.log ~/tv.bakeandgrill.mv/server.log ~/logs/passenger.log; do
  if [[ -f "$log" ]]; then
    echo "--- $log ---"
    tail -20 "$log"
  fi
done
