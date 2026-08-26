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

# 1) engine node (processo persistente: sopravvive alla chiusura della SSH)
#    [.] evita che is_running matchi la riga di comando di start.sh stessa
if ! is_running "server/index[.]js"; then
  cd "$DIR"
  setsid nohup env REGISTER_WORKER="${REGISTER_WORKER:-}" NAS_REGISTER_KEY="${NAS_REGISTER_KEY:-}" "$NODE" server/index.js >> "$LOG" 2>&1 &
  echo "engine avviato su porta $PORT — log: $LOG"
else
  echo "engine già attivo"
fi

# 2) tunnel pubblico cloudflared (senza account, senza port forwarding)
CF="$DIR/cloudflared"
if [ ! -x "$CF" ]; then
  echo "cloudflared non trovato: installalo con  bash server/install-cloudflared.sh"
  exit 0
fi
if is_running "cloudflared tunnel --url"; then
  echo "tunnel già attivo"
else
  setsid nohup "$CF" tunnel --url "http://localhost:$PORT" --no-autoupdate >> "$LOG.cloudflared" 2>&1 &
  echo "tunnel in avvio… attendi 5-10s poi guarda $LOG.cloudflared"
  echo "  tail -f \"$LOG.cloudflared\"   # l'URL è https://….trycloudflare.com"
fi
