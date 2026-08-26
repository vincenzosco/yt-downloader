#!/usr/bin/env bash
# Avvia (o riavvia) l'engine yt-downloader come server Node persistente e,
# se presente, il tunnel pubblico cloudflared.
#
# Uso:  bash server/start.sh
# Log:  <dir>/server.log  e  <dir>/server.log.cloudflared
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8787}"
LOG="$DIR/server.log"

# screen (Entware su Synology: /opt/sbin/screen): l'engine gira in una
# sessione screen staccata, sopravvive a SSH e riavvii del terminale.
SCREEN="$(command -v screen 2>/dev/null || true)"
if [ -z "$SCREEN" ]; then SCREEN="/opt/sbin/screen"; fi
SCREENDIR="$DIR/.screen"
mkdir -p "$SCREENDIR" 2>/dev/null && chmod 700 "$SCREENDIR" 2>/dev/null || true
screen_in() { SCREENDIR="$SCREENDIR" "$SCREEN" -ls 2>/dev/null | grep -q "$1"; }

# Config opzionale (secret della registrazione NAS, worker di riferimento):
#   server/.env  con  NAS_REGISTER_KEY=...  e  REGISTER_WORKER=https://...
ENVF="$DIR/server/.env"
if [ -f "$ENVF" ]; then
  set -a; . "$ENVF"; set +a
fi

# pgrep non è sempre disponibile (es. Synology): usa ps | grep
is_running() {
  ps -ef 2>/dev/null | grep -v grep | grep -q "$1"
}

# Trova il binario di node (su Synology non è in PATH):
NODE="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE" ]; then
  NODE="$(ls -d /var/packages/Node.js_v*/target/usr/local/bin/node 2>/dev/null | head -1)"
fi
if [ -z "$NODE" ]; then
  echo "node non trovato: installa il pacchetto Node.js dal Centro Pacchetti" >&2
  exit 1
fi

# 0) watchdog: se engine o tunnel muoiono a runtime, li riavvia da solo
if ! screen_in "\.watchdog\b"; then
  SCREENDIR="$SCREENDIR" "$SCREEN" -dmS watchdog -L -Logfile "$LOG.watchdog.screen" \
    sh "$DIR/server/watchdog.sh"
  echo "watchdog avviato (screen watchdog)"
fi

# 1) engine node in sessione screen staccata (sopravvive alla SSH)
if ! screen_in "\.ytd\b"; then
  cd "$DIR"
  SCREENDIR="$SCREENDIR" "$SCREEN" -dmS ytd -L -Logfile "$LOG.screen" \
    env REGISTER_WORKER="${REGISTER_WORKER:-}" NAS_REGISTER_KEY="${NAS_REGISTER_KEY:-}" GITHUB_TOKEN="${GITHUB_TOKEN:-}" "$NODE" server/index.js
  echo "engine avviato su porta $PORT (screen ytd) — log: $LOG.screen"
else
  echo "engine già attivo (screen ytd)"
fi

# 2) tunnel pubblico cloudflared (senza account, senza port forwarding)
CF="$DIR/cloudflared"
if [ ! -x "$CF" ]; then
  echo "cloudflared non trovato: installalo con  bash server/install-cloudflared.sh"
  exit 0
fi
if screen_in "\.cloudflared\b"; then
  echo "tunnel già attivo (screen cloudflared)"
elif is_running "cloudflared tunnel --url"; then
  echo "tunnel già attivo"
else
  cd "$DIR"
  SCREENDIR="$SCREENDIR" "$SCREEN" -dmS cloudflared -L -Logfile "$LOG.cloudflared.screen" \
    "$CF" tunnel --url "http://localhost:$PORT" --no-autoupdate
  echo "tunnel in avvio (screen cloudflared)… attendi 5-10s poi guarda $LOG.cloudflared.screen"
  echo "  tail -f \"$LOG.cloudflared.screen\"   # l'URL è https://….trycloudflare.com"
fi
