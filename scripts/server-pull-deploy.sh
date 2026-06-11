#!/usr/bin/env bash
# Run on cPanel after pushing from Mac. Handles untracked docroot files from old `cp client/dist` deploys.
set -euo pipefail

cd ~/tv.bakeandgrill.mv || exit 1

export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes}"

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

echo "🔍  Syntax-checking server..."
node -c server/server.js

mkdir -p server/tmp
touch server/tmp/restart.txt

echo ""
echo "✅  Files updated."
echo ""
echo "⚠️  REQUIRED: cPanel → Setup Node.js App → tv.bakeandgrill.mv → RESTART"
echo "    (touching tmp/restart.txt alone is not always enough)"
echo ""
echo "Verify frontend:"
echo "   curl -s https://tv.bakeandgrill.mv/version.json"
echo ""
echo "Verify backend (must return JSON, not HTML 503):"
echo "   curl -s http://127.0.0.1:4000/api/health"
echo ""
echo "If still 503 after RESTART, check startup error:"
echo "   cd ~/tv.bakeandgrill.mv/server"
echo "   source ~/nodevenv/tv.bakeandgrill.mv/server/18/bin/activate"
echo "   node server.js"
echo "   (Ctrl+C after you see the error — then fix .env / DB / JWT_SECRET)"
