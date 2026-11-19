#!/bin/sh
# Baut dist/ aus src/: eine index.html plus die beiden Bibliotheken in vendor/.
set -e
cd "$(dirname "$0")"
mkdir -p dist/vendor
cp vendor/peerjs.min.js vendor/qrcode.min.js dist/vendor/
{
  echo '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#141a3d">'
  cat src/01-head.html
  echo '</head><body>'
  cat src/02-body.html
  echo '<script src="vendor/peerjs.min.js"></script><script src="vendor/qrcode.min.js"></script><script>'
  cat src/10-content.js src/20-core.js src/30-band.js src/40-net.js src/50-host.js src/55-games.js src/60-player.js src/70-boot.js
  echo '</script></body></html>'
} > dist/index.html
echo "dist/index.html: $(wc -c < dist/index.html) Bytes"
