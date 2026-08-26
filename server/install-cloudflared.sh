#!/usr/bin/env bash
# Scarica cloudflared (tunnel gratuito, senza account) nella cartella dell'app.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)  BIN="cloudflared-linux-amd64" ;;
  aarch64|arm64) BIN="cloudflared-linux-arm64" ;;
  *) echo "architettura non supportata: $ARCH"; exit 1 ;;
esac
echo "Scarico $BIN…"
curl -sL "https://github.com/cloudflare/cloudflared/releases/latest/download/$BIN" -o "$DIR/cloudflared"
chmod +x "$DIR/cloudflared"
"$DIR/cloudflared" --version
echo "OK: $DIR/cloudflared"
