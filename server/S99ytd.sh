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

case "$1" in
  start)
    if [ -x "$APP_DIR/server/start.sh" ]; then
      # start.sh lancia in background (setsid nohup) e ritorna subito
      sh "$APP_DIR/server/start.sh" >/dev/null 2>&1 || true
    fi
    ;;
  stop)
    ps -ef 2>/dev/null | grep -v grep | grep "server/index.js" | awk '{print $2}' | xargs -r kill 2>/dev/null || true
    ps -ef 2>/dev/null | grep -v grep | grep "cloudflared tunnel --url" | awk '{print $2}' | xargs -r kill 2>/dev/null || true
    ;;
  *)
    echo "uso: $0 {start|stop}"
    ;;
esac
exit 0
