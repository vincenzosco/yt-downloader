#!/usr/bin/env bash
# Aggiorna la versione della pagina prima di ogni commit.
#
# Scrive lo SHA corrente in version.txt e sostituisce i placeholder
# "bootstrap" (e le versioni precedenti) in index.html: sia il valore
# di window.YTD_VERSION sia i "?v=" di style.css e app.js.
#
# La pagina (app.js) confronta window.YTD_VERSION con il contenuto di
# version.txt: quando il repo viene aggiornato, si ricarica da sola.
#
# Uso:  bash tools/bump.sh   (poi committa normalmente)
set -e
cd "$(dirname "$0")/.."

V=$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)
[ -n "$V" ] || V=$(date +%Y%m%d%H%M%S)

echo "$V" > version.txt

# sostituisci placeholder/versioni in index.html (macOS: sed -E, backup)
sed -i.bak -E \
  -e 's/window\.YTD_VERSION = "[^"]*"/window.YTD_VERSION = "'"$V"'"/' \
  -e 's/style\.css\?v=[^"]*/style.css?v='"$V"'/' \
  -e 's/app\.js\?v=[^"]*/app.js?v='"$V"'/' \
  index.html
rm -f index.html.bak

echo "versione: $V  (version.txt + index.html aggiornati)"
