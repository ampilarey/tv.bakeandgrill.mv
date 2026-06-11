#!/usr/bin/env bash
# Run on cPanel after pushing from Mac.
# Frontend-only pulls do NOT restart Node (that was causing repeated 503/login failures).
set -euo pipefail

cd ~/tv.bakeandgrill.mv || exit 1

export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes}"

BEFORE_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "")

echo "📥  Fetching latest main..."
git fetch origin main

# Old manual deploys left untracked copies at docroot — remove so git pull can write tracked files.
DOCROOT_MARKERS=(.htaccess index.html manifest.webmanifest offline.html pwa-192x192.png sw.js version.json)
DOCROOT_DIRS=(assets icons)

for f in "${DOCROOT_MARKERS[@]}"; do
  if [[ -f "$f" ]] && ! git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    echo "🗑   Removing untracked $f (blocks git pull)"
    rm -f "$f"
  fi
done
for d in "${DOCROOT_DIRS[@]}"; do
  if [[ -d "$d" ]] && ! git ls-files --error-unmatch "$d" >/dev/null 2>&1; then
    echo "🗑   Removing untracked $d/ (blocks git pull)"
    rm -rf "$d"
  fi
done
rm -f workbox-*.js 2>/dev/null || true

echo "📥  Pulling..."
git pull origin main

SERVER_CHANGED=0
if [[ -n "$BEFORE_HEAD" ]]; then
  if git diff --name-only "$BEFORE_HEAD" HEAD -- server/ | grep -q .; then
    SERVER_CHANGED=1
  fi
else
  SERVER_CHANGED=1
fi

if [[ "$SERVER_CHANGED" -eq 1 ]]; then
  echo "🔧  Server code changed — syntax check..."
  if [[ -f ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate ]]; then
    # shellcheck disable=SC1090
    source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate
  fi
  node -c server/server.js
  echo "⚠️  Server files updated — run: bash scripts/server-ensure-running.sh"
  echo "    (or cPanel → Setup Node.js App → RESTART only when server/ changed)"
else
  echo "📦  Frontend-only update — skipping Node restart (do NOT click RESTART in cPanel)"
fi

echo ""
echo "Verify frontend:"
echo "   curl -s https://tv.bakeandgrill.mv/version.json"
echo ""
echo "Verify API (if 503, run: bash ~/tv.bakeandgrill.mv/scripts/server-ensure-running.sh):"
echo "   curl -s http://127.0.0.1:4000/api/health"
