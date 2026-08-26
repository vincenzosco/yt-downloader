#!/bin/sh
# server/watchdog.sh — watchdog persistente per engine + tunnel.
#
# Ogni 60 secondi richiama server/start.sh, che è idempotente: se l'engine
# o il tunnel non sono attivi li avvia, altrimenti non fa nulla. In questo
# modo un crash a runtime (engine o cloudflared) viene riparato da solo,
# senza aspettare il riavvio del NAS.
#
# Viene avviato da server/start.sh in una sessione screen "watchdog".
DIR="$(cd "$(dirname "$0")/.." && pwd)"

while true; do
  sh "$DIR/server/start.sh" >/dev/null 2>&1 || true
  sleep 60
done
