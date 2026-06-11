#!/usr/bin/env bash
# Run on cPanel after pushing from Mac. Handles untracked docroot files from old `cp client/dist` deploys.
set -euo pipefail

cd ~/tv.bakeandgrill.mv || exit 1

export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes}"

echo "📥  Fetching latest main..."
git fetch origin main

# Old manual deploys left untracked copies at docroot — remove so git can track them from the repo.
DOCROOT_MARKERS=(.htaccess index.html manifest.webmanifest offline.html pwa-192x192.png sw.js version.json)
DOCROOT_DIRS=(assets icons)
if ! git ls-files --error-unmatch index.html >/dev/null 2>&1; then
  echo "ℹ️  index.html not in git yet on this checkout — skipping docroot cleanup"
else
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
  # workbox chunk name changes each build
  rm -f workbox-*.js 2>/dev/null || true
fi

echo "📥  Pulling..."
git pull origin main

mkdir -p server/tmp
touch server/tmp/restart.txt

echo ""
echo "✅  Deploy complete. Verify:"
echo "   curl -s https://tv.bakeandgrill.mv/version.json"
echo "   curl -s https://tv.bakeandgrill.mv/ | grep index-"
echo ""
echo "Then restart Node.js in cPanel → Setup Node.js App → RESTART"
