#!/usr/bin/env bash
# Copy client/dist to the git repo root (cPanel docroot). Run after `npm run build` in client/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/client/dist"

if [[ ! -f "$DIST/index.html" ]]; then
  echo "❌  $DIST/index.html not found — run: cd client && npm run build"
  exit 1
fi

VERSION="$(grep -oE "APP_VERSION = '[^']+'" "$ROOT/client/src/utils/version.js" | head -1 | sed "s/APP_VERSION = '//;s/'//")"

echo "📦  Publishing frontend v${VERSION} → $ROOT"

# Replace docroot assets (drop stale hashed chunks from old deploys)
rm -rf "$ROOT/assets"
mkdir -p "$ROOT/assets"

cp -R "$DIST/assets/." "$ROOT/assets/"
cp "$DIST/index.html" "$ROOT/index.html"
cp "$DIST/sw.js" "$ROOT/sw.js"
cp "$DIST/workbox-"*.js "$ROOT/" 2>/dev/null || true
cp "$DIST/manifest.webmanifest" "$ROOT/manifest.webmanifest"
cp "$DIST/offline.html" "$ROOT/offline.html" 2>/dev/null || true
cp "$DIST/pwa-"*.png "$ROOT/" 2>/dev/null || true
cp -R "$DIST/icons" "$ROOT/icons" 2>/dev/null || true
cp "$DIST/.htaccess" "$ROOT/.htaccess"

cat > "$ROOT/version.json" <<EOF
{"version":"${VERSION}","publishedAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
EOF

echo "✅  Published index.html + $(find "$ROOT/assets" -name '*.js' | wc -l | tr -d ' ') JS chunks"
echo "    Verify after deploy: curl -s https://tv.bakeandgrill.mv/version.json"
