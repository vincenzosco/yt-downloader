#!/bin/sh
# S99ytd.sh — avvio automatico al boot (Synology rc.d) dell'engine
# yt-downloader + tunnel pubblico cloudflared.
#
# Installazione:
#   sudo cp server/S99ytd.sh /usr/local/etc/rc.d/S99ytd.sh
#   sudo chmod +x /usr/local/etc/rc.d/S99ytd.sh
#
# Gli script in /usr/local/etc/rc.d/ vengono eseguiti al boot con
# "start" e allo spegnimento con "stop".

APP_DIR="/volume1/Download/yt-downloader"
SCREEN="/opt/sbin/screen"
SCREENDIR="$APP_DIR/.screen"

is_up() {
  SCREENDIR="$SCREENDIR" "$SCREEN" -ls 2>/dev/null | grep -q "$1"
}

# al boot la rete potrebbe non essere ancora pronta: cloudflared può morire
# subito. Riprova lo start fino a 4 volte con attese (max ~90s totali).
start_with_retry() {
  local i
  for i in 1 2 3 4; do
    if [ -x "$APP_DIR/server/start.sh" ]; then
      sh "$APP_DIR/server/start.sh" >/dev/null 2>&1 || true
    fi
    if is_up "\.ytd\b" && is_up "\.cloudflared\b"; then
      return 0
    fi
    sleep 15
  done
  return 0
}

case "$1" in
  start)
    # aspetta che il volume sia montato (al boot può non esserlo ancora)
    if [ ! -d "$APP_DIR" ]; then
      sleep 10
    fi
    if [ -d "$APP_DIR" ]; then
      start_with_retry
    else
      echo "$APP_DIR non disponibile"
    fi
    ;;
  stop)
    # ferma le sessioni screen (il processo dentro muore con loro)
    SCREENDIR="$SCREENDIR" "$SCREEN" -S watchdog -X quit 2>/dev/null || true
    SCREENDIR="$SCREENDIR" "$SCREEN" -S ytd -X quit 2>/dev/null || true
    SCREENDIR="$SCREENDIR" "$SCREEN" -S cloudflared -X quit 2>/dev/null || true
    sleep 1
    # eventuali residui senza screen (backward compat)
    ps -ef 2>/dev/null | grep -v grep | grep "server/index[.]js" | awk '{print $2}' | xargs -r kill 2>/dev/null || true
    ps -ef 2>/dev/null | grep -v grep | grep "cloudflared tunnel --url" | awk '{print $2}' | xargs -r kill 2>/dev/null || true
    ps -ef 2>/dev/null | grep -v grep | grep "server/watchdog[.]sh" | awk '{print $2}' | xargs -r kill 2>/dev/null || true
    ;;
  *)
    echo "uso: $0 {start|stop}"
    ;;
esac
exit 0
