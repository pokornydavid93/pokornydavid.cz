#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="deploy@pokornydavid.cz"
REMOTE_DIR="/srv/pokornydavid.cz"
ART="app.new.tgz"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🏗️ Building SSR web (Next.js standalone)..."

# install deps deterministically
pnpm install --frozen-lockfile

# production build
pnpm run build

# ---- Detect standalone output ----
# Next standalone standard layout:
# .next/standalone/server.js
# .next/standalone/.next (server chunks)
# .next/static (client assets)
# public/ (optional)
STANDALONE_DIR=".next/standalone"

if [ ! -d "$STANDALONE_DIR" ]; then
  echo "❌ Missing $STANDALONE_DIR"
  echo "   Ensure next.config has: output: \"standalone\""
  exit 1
fi

if [ ! -f "$STANDALONE_DIR/server.js" ]; then
  echo "❌ Missing $STANDALONE_DIR/server.js"
  exit 1
fi

if [ ! -d ".next/static" ]; then
  echo "❌ Missing .next/static"
  exit 1
fi

# ---- Prepare temp package directory ----
TMP="$(mktemp -d)"
cleanup(){ rm -rf "$TMP" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "🧩 Assembling standalone package..."
mkdir -p "$TMP"

# 1) server.js + node_modules subset is already inside standalone dir
cp -a "$STANDALONE_DIR/." "$TMP/"

# 2) ensure .next/static is available at runtime
# standalone expects ".next/static"
mkdir -p "$TMP/.next"
cp -a ".next/static" "$TMP/.next/static"

# 3) public folder (optional)
if [ -d "public" ]; then
  cp -a "public" "$TMP/public"
fi

# 4) package.json (optional but good for sanity)
if [ -f "package.json" ]; then
  cp -a "package.json" "$TMP/package.json"
fi

# ---- Hard sanity checks ----
if [ ! -f "$TMP/server.js" ]; then
  echo "❌ Package invalid: missing server.js"
  exit 1
fi
if [ ! -d "$TMP/.next/static" ]; then
  echo "❌ Package invalid: missing .next/static"
  exit 1
fi

echo "📦 Packing -> $ART"
rm -f "$ART"
tar -czf "$ART" -C "$TMP" .

# ---- Upload ----
echo "🚚 Uploading artifact -> $SSH_HOST:$REMOTE_DIR/$ART.tmp"
scp -q "$ART" "$SSH_HOST:$REMOTE_DIR/$ART.tmp"

echo "🔁 Atomic move on server..."
ssh -q "$SSH_HOST" "mv -f $REMOTE_DIR/$ART.tmp $REMOTE_DIR/$ART"

echo "✅ Uploaded: $ART"
echo "👀 Watcher on server should deploy automatically."
echo "   Check logs:"
echo "   sudo journalctl -u pokornydavid-ssr-deploy-watcher.service -f --no-pager"
