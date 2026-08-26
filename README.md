# ytd.

YouTube downloader — minimale, su GitHub Pages. Cerca una canzone o incolla un link (video o playlist): anteprima titolo e copertina, download audio.

Pubblicato su [vincenzosco.github.io/yt-downloader](https://vincenzosco.github.io/yt-downloader).

[English version below ↓](#english)

## Funzioni

- **Cerca** — risultati con copertina, titolo, autore, durata e anteprima audio (▶).
- **Incolla link** — video o playlist: card con titolo e copertina, elenco tracce.
- **Selettore qualità** — su ogni pulsante “Scarica”: scegli formato e qualità tra
  Audio (AAC/Opus con bitrate), Video con audio (360p progressivo) e Video solo
  video (720p–1080p+). Ogni opzione mostra la dimensione stimata.
- **Playlist: “Scarica tutte”** — scarica a catena tutte le tracce, con qualità audio
  scelta (AAC consigliato / Opus migliore / leggero).
- **Selezione multipla → .zip** — spunta le canzoni con le checkbox (da una o
  più ricerche, la selezione resta mentre cerchi altro) e scarica tutto in un
  unico `ytd-AAAA-MM-GG.zip`: download in sequenza con progress, nomi file dal
  titolo con estensione giusta, le canzoni che falliscono non bloccano il lotto.
- **Lingua IT/EN** — selettore in alto a destra (ricorda la scelta).
- **Scarica sempre disponibile** — il pulsante Download compare subito, anche
  se il dettaglio video (`/info`) è temporaneamente bloccato da YouTube;
  `/info` serve solo per durata e titolo, non blocca mai il download.
- **Errori chiari** — i messaggi di errore riportano il motivo reale (es.
  anti-bot, download interrotto) invece di generici “all engines failed”.
- **Barre di progresso** — ogni download (singolo, “Scarica tutte” e batch
  .zip) mostra una barra rossa che avanza con i byte ricevuti.
- **Anti-bot** — l'engine genera via token PO e ritenta da solo se YouTube
  chiede “sign in to confirm you're not a bot” (vedi Note).

## Come funziona

GitHub Pages (statico) + engine serverless (Cloudflare Worker). YouTube blocca le chiamate con header `Origin` (il browser non può chiamare direttamente le API interne). L'engine le chiama lato server, senza `Origin`.

```
browser (pagina statica su GitHub Pages)
   │  oEmbed YouTube (CORS nativo) → anteprima titolo/copertina
   │  chiamate all'engine (CORS *)
   ▼
engine: Cloudflare Worker (gratis) o NAS self-host (IP residenziale,
   scoperto automaticamente via /nas: engine custom → NAS → worker)
   │  API Innertube lato server, senza Origin, retry su più host/client
   │  PO token (anti-bot) generato dentro l'engine
   ▼
YouTube → URL audio/video → l'engine lo streama al browser → download
```

### Endpoint dell'engine (`worker/index.js`)

| Endpoint           | Descrizione                                      |
|--------------------|--------------------------------------------------|
| `/search?q=…`      | ricerca (titolo, autore, durata, copertina)     |
| `/info?id=…`       | dettagli video + audio preferito                 |
| `/formats?id=…`    | tutti i formati (audio, progressive, video-only) |
| `/playlist?list=…` | elenco tracce di una playlist                    |
| `/stream?id=…&itag=…` | stream del file (CORS, Range), itag opzionale |
| `/proxies`             | check di salute delle 5 liste proxy pubbliche |
| `/register` (POST)     | il NAS self-host registra il suo URL pubblico (chiave) |
| `/nas`                 | la pagina scopre l'URL corrente del NAS         |

## Auto-update della pagina

La pagina mostra **subito le nuove versioni**: `app.js` confronta
`window.YTD_VERSION` (scritto in `index.html`) con `version.txt` e, quando
cambiano, si ricarica da sola (se c'è un download in corso mostra un banner
“Ricarica” invece di interromperlo). I nomi delle risorse portano `?v=…` per
bypassare la cache del browser. **Prima di ogni commit** aggiorna la versione
con:

```bash
bash tools/bump.sh
```

## Deploy

Servono solo l'account Cloudflare già in uso (unico account per tutto).

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

Test rapido:

```bash
curl "https://xxx.workers.dev/search?q=test"
curl -I "https://xxx.workers.dev/stream?id=dQw4w9WgXcQ&itag=140"
```

## Self-host: engine sul NAS (IP residenziale)

L'engine gira anche come **server Node su un NAS/VPS** con IP residenziale:
YouTube flagga molto meno gli IP di casa che quelli dei datacenter
(Cloudflare), quindi i formati audio completi (Opus/AAC) tornano disponibili
anche quando il worker è in cooldown.

Copia il progetto sul NAS (es. `/volume1/Download/yt-downloader`) e avvia:

```bash
bash server/start.sh
```

Lo script trova da solo il binario di Node (anche il pacchetto Synology
`Node.js_v20`, che non è in PATH) e avvia in background, in modo persistente,
dentro **sessioni screen** (Entware: `/opt/sbin/screen`, installabile con
`opkg install screen`):

1. l'**engine** su `http://localhost:8787` in una sessione screen `ytd`
   (log in `server.log.screen`; allegati: `screen -r ytd`);
2. il **tunnel pubblico** `cloudflared` in una sessione screen
   `cloudflared` → URL `https://….trycloudflare.com` (gratis, senza account,
   senza port forwarding; log in `server.log.cloudflared.screen`).
   Se `cloudflared` manca, installalo con
   `bash server/install-cloudflared.sh`.

Le sessioni screen sopravvivono alla chiusura della SSH (più robuste di
`setsid nohup`). Per gestirle: `screen -r ytd` (o `-r cloudflared`) per
agganciarsi, `Ctrl-a d` per staccarsi; `SCREENDIR=<dir>/.screen` serve se la
home utente non esiste (tipico di Synology).

C'è anche una terza sessione screen, **watchdog**: ogni 60 secondi richiama
`server/start.sh` (idempotente), quindi se l'engine o il tunnel muoiono a
runtime vengono **riavviati da soli** in meno di un minuto.

Per ritrovare l'URL pubblico in qualsiasi momento (cambia a ogni riavvio del
tunnel):

```bash
curl http://<IP-NAS>:8787/tunnel-url
# → {"tunnelUrl":"https://….trycloudflare.com","local":"http://…"}
```

### Avvio automatico al boot (Synology)

```bash
sudo cp server/S99ytd.sh /usr/local/etc/rc.d/S99ytd.sh
sudo chmod +x /usr/local/etc/rc.d/S99ytd.sh
# test manuale:
sudo /usr/local/etc/rc.d/S99ytd.sh start   # avvia engine + tunnel
sudo /usr/local/etc/rc.d/S99ytd.sh stop    # li ferma
```

Al riavvio del NAS l'engine, il tunnel e il watchdog ripartono da soli
(`S99` = eseguito tra gli ultimi al boot, quando la rete è pronta; con
retry automatico se il volume non è ancora montato).

### Usare il NAS come engine nella pagina (automatico)

La pagina **usa il NAS da sola**, senza incollare nulla:

1. il NAS registra ogni 60 secondi il suo URL pubblico corrente sul worker
   Cloudflare (`POST /register`, protetto da chiave) — così il worker sa
   sempre dove raggiungerlo, anche quando il tunnel cambia URL;
2. all'avvio la pagina chiede al worker `GET /nas` e, se c'è un NAS
   registrato, lo mette **in cima** agli engine (ordine: engine custom →
   NAS → worker Cloudflare), con ricontrollo ogni 5 minuti;
3. se il NAS non risponde, la pagina **ripiega automaticamente sul worker**
   (nessun errore per l'utente).

Configurazione (una tantum, sul NAS e sul worker):

```bash
# 1) sul worker: chiave condivisa (una sola volta)
cd worker && openssl rand -hex 24 | npx wrangler secret put NAS_REGISTER_KEY

# 2) sul NAS: stessa chiave + URL del worker in server/.env (non in git)
cat > server/.env <<EOF
NAS_REGISTER_KEY=<stessa chiave>
REGISTER_WORKER=https://xxx.workers.dev
EOF
```

Il footer della pagina mostra il NAS attivo (es. `…trycloudflare.com (NAS
attivo) → …`). Resta comunque possibile forzare un engine specifico con il
campo “Engine URL” (in cima, a destra).

> **Nota**: con il tunnel gratuito `trycloudflare` l'URL cambia a ogni
> riavvio del tunnel, ma il NAS lo ri-registra da solo: la pagina non se ne
> accorge. Per un URL *stabile* serve comunque un tunnel “named” (richiede
> un account Cloudflare e un dominio).

## Sviluppo

- `index.html`, `style.css`, `app.js` — pagina statica, JavaScript ES5
  volutamente senza framework né build: gira anche su browser datati.
- `worker/index.js` — logica engine (Web API standard).
- `worker/pot.js` — generazione PO token (anti-bot) con `bgutils-js`
  (dipendenza npm in `worker/package.json`). Genera il token all'avvio del
  worker, lo rigenera su richiesta se scade (TTL 8h) e, se YouTube risponde
  `LOGIN_REQUIRED`, **rigenera forzatamente il token** (il blocco è spesso
  legato al token usato, non all'IP).
- `worker/proxy-list.js` — gestore di liste proxy pubbliche: scarica da 5
  sorgenti, fa un check di salute per sorgente (HTTP + parse), deduplica
  host:porta e fa auto-refresh con TTL 15 min. Esposto da `/proxies`.
  **Nota**: sul piano gratuito del worker `fetch()` non può passare attraverso
  un proxy (servirebbe `connect()`, solo a pagamento) — la lista è usata come
  infrastruttura e check di salute, non per instradare il traffico YouTube.

### Test locale

```bash
# test del parsing worker (Node.js)
node worker/test.js

# test della generazione PO token (Node.js)
cd worker && node pot-test.mjs

# test delle 5 liste proxy (Node.js, check di salute)
cd worker && node proxy-test.mjs
```

## Note

- Solo per contenuti di cui hai i diritti.
- Gli endpoint Innertube possono cambiare: aggiorna i client in `worker/index.js`
  (`CLIENT_WEB`, `CLIENT_ANDROID`, `CLIENT_IOS`).
- **Anti-bot (PO token)**: YouTube chiede "Sign in to confirm you're not a bot"
  sugli IP dei datacenter. Il worker genera un PO token (Proof of Origin) con
  `bgutils-js` (`worker/pot.js`): all'avvio del worker esegue la VM BotGuard
  (via `new Function`, ammesso nei Workers in fase di startup) e ottiene dal
  servizio WAA un token valido (integrity o websafe-fallback). Il token viene
  iniettato nelle richieste `/info`, `/formats`, `/stream` e supera il
  bot-challenge. È un ulteriore strato sopra `visitorData` + retry.
- **Anti-bot aggressivo**: 3 giri di client con `visitorData` fresco; quando
  una richiesta risponde `LOGIN_REQUIRED`, il worker rigenera il PO token
  (non riusa quello bloccato) e riprova. La generazione ha retry con backoff
  (3 tentativi) e TTL di 8h.
- **Affidabilità (meno richieste = meno blocchi)**: il worker tiene una cache
  in memoria per `/search`, `/info`, `/formats`, `/playlist` (TTL 10–30 min)
  con single-flight (le richieste concorrenti per lo stesso video aspettano
  una sola chiamata a YouTube) e **serializza** tutte le chiamate a YouTube
  (mai più di una alla volta: le raffiche fanno scattare il flag).
- **Strategia client (allineata a yt-dlp, lug 2026)**: con la nuova
  enforcement di YouTube (PO token legati al video) la versione `ANDROID`
  21.26.364 risponde spesso con i formati **senza url**. Verificato
  empiricamente, due client continuano a restituire gli audio-only completi:
  **`ANDROID 20.14.37` + PO token** (primo tentativo) e **`VISIONOS`**
  (senza token). Poi vengono provate le versioni nuove (`ANDROID 21.26.364`,
  `IOS 21.26.4`) e infine `web_embedded` (nessun PO token, ma solo 360p
  progressivo itag 18) come ultima risorsa scaricabile. `android_vr` è
  evitato: YouTube lo ha rotto il 17/08/2026 (403 su tutti i formati).
- **Backoff anti-bot**: quando tutte le rotte falliscono con `LOGIN_REQUIRED`,
  il worker smette di martellare YouTube e per un po' (90s → 10min, raddoppia
  a ogni blocco) risponde subito `{ retryAfter }`; il frontend mostra un
  countdown e **riprova da solo** (nessuna azione richiesta): fino a 5 cicli
  completi, ognuno con attesa limitata a 90s — ogni tentativo può cadere su
  un'altra istanza del worker non bloccata (il backoff è in memoria per
  istanza). Anche il singolo engine viene ritentato fino a 6 volte con
  backoff esponenziale (1.5s → 20s) prima di passare al successivo.
- **Stream leggero**: `/stream` non rifà le chiamate pesanti a YouTube:
  riusa i formati già cachati da `/formats` (stesso IP del worker, gli URL
  googlevideo restano validi) e scarica direttamente l'URL. Se l'URL cachato
  risponde 403, fa un solo rinfresco leggero. Questo evita il crash da limite
  CPU del piano free (errore 1101) e dimezza i tempi.
- **Cache URL audio**: gli URL googlevideo non vengono cachati oltre i 20 min
  della cache `/formats` (riusarli a lungo fa scattare il throttling).
- **Proxy gratuiti (5 liste)**: il worker scarica e controlla le liste proxy
  pubbliche (ProxyScrape, GeoNode, Proxifly, iplocate, TheSpeedX) con check
  di salute e auto-refresh (`/proxies`). ⚠️ Sul piano gratuito Cloudflare il
  `fetch()` del worker non può passare *attraverso* un proxy (serve
  `connect()`, solo a pagamento), quindi le liste non instradano il traffico
  YouTube: restano disponibili come infrastruttura per un eventuale engine
  esterno. In più i proxy gratuiti sono quasi tutti IP di datacenter — la
  stessa categoria che YouTube flagga.
- **Limite reale**: un uso frequente continuato fa comunque scattare il blocco
  sull'IP del worker (il PO token non garantisce il 100%). Si azzera da solo in
  pochi minuti/ore. L'uso normale (qualche canzone) non lo innesca. Per un uso
  intenso servirebbe un provider aggiuntivo (es. Deno Deploy, che richiede un
  secondo account) oppure un IP residenziale via proxy.

- **Browser datati**: la pagina è JavaScript ES5 puro (niente `let`/arrow/fetch,
  niente build) e usa `<audio>` per l'anteprima: funziona da circa il 2015 in su
  (Chrome/Edge 49+, Firefox 44+, Safari 9+, Internet Explorer 11 con `<audio>`).
  Il selettore qualità usa `<select>`+`optgroup`, supportato da sempre.

<hr>

<a id="english"></a>
## English

# ytd.

A minimal YouTube downloader, hosted on GitHub Pages. Search a song or
paste a link (video or playlist): preview title & cover, download audio.

Published at [vincenzosco.github.io/yt-downloader](https://vincenzosco.github.io/yt-downloader).

The page UI is bilingual (IT/EN toggle, top right).

## Features

- **Search** — results with thumbnail, title, author, duration and audio preview (▶).
- **Paste link** — video or playlist: card with title & cover, track list.
- **Quality picker** — every “Download” button lets you choose format/quality:
  Audio (AAC/Opus with bitrate), Video with audio (360p progressive) and
  Video only (720p–1080p+). Estimated size shown on every option.
- **Playlist “Download all”** — downloads every track in sequence, with your
  chosen audio quality (AAC recommended / Opus best / light).
- **IT/EN language** — toggle at the top right (choice is remembered).
- **Download always available** — the Download button appears immediately,
  even when the video details (`/info`) are temporarily blocked by YouTube;
  `/info` is only used for duration and title and never blocks the download.
- **Clear errors** — error messages report the real reason (e.g. anti-bot,
  interrupted download) instead of a generic “all engines failed”.
- **Progress bars** — every download (single, “Download all” and the .zip
  batch) shows a red bar advancing with the received bytes.
- **Anti-bot** — the engine generates a PO token and retries on its own if
  YouTube asks “sign in to confirm you're not a bot” (see Notes).

## How it works

GitHub Pages (static) + serverless engine (Cloudflare Worker) or a
self-hosted NAS engine (residential IP, auto-discovered via `/nas`;
engine order: custom → NAS → worker). YouTube blocks requests with `Origin`
headers that come from the browser. The engine makes API calls server-side,
without `Origin`, and generates its own anti-bot PO token (`worker/pot.js`)
inside the engine.

### Engine endpoints (`worker/index.js`)

| Endpoint           | Description                                      |
|--------------------|--------------------------------------------------|
| `/search?q=…`      | search (title, author, duration, thumbnail)     |
| `/info?id=…`       | video details + preferred audio                  |
| `/formats?id=…`    | all available formats (audio, progressive, video)|
| `/playlist?list=…` | playlist track list                              |
| `/stream?id=…&itag=…` | stream the file (CORS, Range), optional itag  |
| `/proxies`             | health check of the 5 public proxy lists     |
| `/register` (POST)     | the self-hosted NAS registers its public URL (key) |
| `/nas`                 | the page discovers the current NAS URL         |

## Auto-update

The page shows **new versions immediately**: `app.js` compares
`window.YTD_VERSION` (written into `index.html`) with `version.txt` and,
when they differ, reloads itself (if a download is in progress it shows a
“Reload” banner instead of interrupting it). Asset names carry `?v=…` to
bypass the browser cache. **Before every commit** bump the version with:

```bash
bash tools/bump.sh
```

## Deploy

Only the Cloudflare account already in use is required (single account).

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

## Self-hosting: engine on your NAS (residential IP)

The engine also runs as a **Node server on a NAS/VPS** with a residential
IP: YouTube flags home IPs much less than datacenter ones (Cloudflare), so
full audio formats (Opus/AAC) come back even when the worker is in cooldown.

Copy the project to the NAS (e.g. `/volume1/Download/yt-downloader`) and run:

```bash
bash server/start.sh
```

The script finds the Node binary by itself (including the Synology package
`Node.js_v20`, which is not in PATH) and starts, persistently, in background,
inside **screen sessions** (Entware: `/opt/sbin/screen`, install with
`opkg install screen`):

1. the **engine** on `http://localhost:8787` in a screen session `ytd`
   (log in `server.log.screen`; attach with `screen -r ytd`);
2. the **public tunnel** `cloudflared` in a screen session `cloudflared`
   → `https://….trycloudflare.com` URL (free, no account, no port
   forwarding; log in `server.log.cloudflared.screen`). If `cloudflared` is
   missing, install it with `bash server/install-cloudflared.sh`.

The screen sessions survive SSH disconnects (more robust than
`setsid nohup`). To manage them: `screen -r ytd` (or `-r cloudflared`) to
attach, `Ctrl-a d` to detach; `SCREENDIR=<dir>/.screen` is needed when the
user home does not exist (typical on Synology).

There is also a third screen session, **watchdog**: every 60 seconds it
re-runs `server/start.sh` (idempotent), so if the engine or the tunnel die
at runtime they are **restarted by themselves** in under a minute.

To find the current public URL at any time (it changes on every tunnel
restart):

```bash
curl http://<NAS-IP>:8787/tunnel-url
# → {"tunnelUrl":"https://….trycloudflare.com","local":"http://…"}
```

### Auto-start at boot (Synology)

```bash
sudo cp server/S99ytd.sh /usr/local/etc/rc.d/S99ytd.sh
sudo chmod +x /usr/local/etc/rc.d/S99ytd.sh
# manual test:
sudo /usr/local/etc/rc.d/S99ytd.sh start   # starts engine + tunnel
sudo /usr/local/etc/rc.d/S99ytd.sh stop    # stops both
```

After a NAS reboot the engine, the tunnel and the watchdog start on their
own (`S99` = run among the last at boot, when the network is ready; with
automatic retry if the volume is not mounted yet).

### Using the NAS as engine in the page (automatic)

The page **uses the NAS by itself**, nothing to paste:

1. the NAS registers its current public URL on the Cloudflare worker every
   60 seconds (`POST /register`, key-protected) — the worker always knows
   where to reach it, even when the tunnel URL changes;
2. on load the page asks the worker `GET /nas` and, if a NAS is
   registered, puts it **on top** of the engine list (order: custom engine →
   NAS → Cloudflare worker), re-checking every 5 minutes;
3. if the NAS does not answer, the page **automatically falls back to the
   worker** (no user-facing error).

One-time setup (on the NAS and the worker):

```bash
# 1) on the worker: shared key (once)
cd worker && openssl rand -hex 24 | npx wrangler secret put NAS_REGISTER_KEY

# 2) on the NAS: same key + worker URL in server/.env (not in git)
cat > server/.env <<EOF
NAS_REGISTER_KEY=<same key>
REGISTER_WORKER=https://xxx.workers.dev
EOF
```

The page footer shows the active NAS (e.g. `…trycloudflare.com (NAS
active) → …`). You can still force a specific engine with the “Engine URL”
field (top right).

> **Note**: with the free `trycloudflare` tunnel the URL changes on every
> tunnel restart, but the NAS re-registers it by itself: the page never
> notices. For a *stable* URL you still need a “named” tunnel (requires a
> Cloudflare account and a domain).

### Local tests

```bash
# worker parsing tests (Node.js)
node worker/test.js

# PO token generation test (Node.js)
cd worker && node pot-test.mjs

# proxy lists health check (Node.js)
cd worker && node proxy-test.mjs
```

## Development

- `index.html`, `style.css`, `app.js` — static page, ES5 (no framework, no build).
- `worker/index.js` — engine logic (standard Web APIs).
- `worker/pot.js` — anti-bot PO token generation (`bgutils-js`). Generates
  the token at worker startup, refreshes it on demand (8h TTL) and, when
  YouTube answers `LOGIN_REQUIRED`, **force-regenerates the token** (the
  block is often bound to the token used, not the IP).
- `worker/proxy-list.js` — public proxy-list manager: fetches 5 sources,
  health-checks each source (HTTP + parse), dedupes host:port and
  auto-refreshes with a 15-min TTL. Exposed via `/proxies`.
  **Note**: on the free worker plan `fetch()` cannot route traffic *through*
  a proxy (that needs `connect()`, paid only) — the list is kept as
  infrastructure and source health-check, not to route YouTube traffic.

## Notes

- Only for content you have rights to.
- **Anti-bot (PO token)**: YouTube asks "Sign in to confirm you're not a bot"
  on datacenter IPs. The worker generates a PO token with `bgutils-js`
  (`worker/pot.js`) and injects it into `/info`, `/formats`, `/stream` to
  pass the challenge.
- **Aggressive anti-bot**: 3 rounds of clients with fresh `visitorData`;
  when a request answers `LOGIN_REQUIRED`, the worker regenerates the PO
  token (not the blocked one) and retries. Generation has retry-with-backoff
  (3 attempts) and an 8h TTL.
- **Reliability (fewer requests = fewer blocks)**: the worker keeps an
  in-memory cache for `/search`, `/info`, `/formats`, `/playlist`
  (10–30 min TTL) with single-flight (concurrent requests for the same video
  wait for a single YouTube call) and **serializes** every YouTube call
  (never more than one at a time — bursts trigger the flag).
- **Anti-bot backoff**: when all routes fail with `LOGIN_REQUIRED`, the
  worker stops hammering YouTube and for a while (90s → 10min, doubling each
  block) answers immediately with `{ retryAfter }`; the frontend shows a
  countdown and **retries automatically** (no user action): up to 5 full
  cycles, each wait capped at 90s — every attempt may land on a different,
  unblocked worker instance (backoff is per-instance in memory). A single
  engine is also retried up to 6 times with exponential backoff
  (1.5s → 20s) before falling through to the next one.
- **Light stream**: `/stream` does not redo the heavy YouTube calls: it
  reuses the formats already cached by `/formats` (same worker IP, so
  googlevideo URLs stay valid) and downloads the URL directly. If the cached
  URL answers 403, it does a single light refresh. This avoids the free-plan
  CPU-limit crash (error 1101) and halves latency.
- **Audio URL cache**: googlevideo URLs are not cached beyond the 20-min
  `/formats` cache (reusing them for long triggers YouTube throttling).
- **Free proxies (5 lists)**: the worker fetches and health-checks public
  proxy lists (ProxyScrape, GeoNode, Proxifly, iplocate, TheSpeedX) with
  auto-refresh (`/proxies`). ⚠️ On the free Cloudflare plan the worker's
  `fetch()` cannot go *through* a proxy (`connect()` is paid only), so the
  lists do not route YouTube traffic: they stay available as infrastructure
  for a possible external engine. Also, free proxies are almost all
  datacenter IPs — the very category YouTube flags.
- **Client strategy (aligned with yt-dlp, Jul 2026)**: with YouTube's new
  enforcement (video-bound PO tokens), the `ANDROID` 21.26.364 client often
  returns formats **without urls**. Verified empirically, two clients still
  return the full audio-only formats: **`ANDROID 20.14.37` + PO token**
  (first try) and **`VISIONOS`** (no token). Then the new versions
  (`ANDROID 21.26.364`, `IOS 21.26.4`) are tried, and finally `web_embedded`
  (no PO token, but only 360p progressive itag 18) as the last downloadable
  resort. `android_vr` is avoided: YouTube broke it on 2026-08-17 (403 on
  all formats).
- **Multi-select → .zip**: tick songs with the checkboxes (from one or more
  searches — the selection stays while you search more) and download them all
  as a single `ytd-YYYY-MM-DD.zip`: sequential downloads with progress,
  filenames from the title with the right extension, failed songs don't stop
  the batch. The zip is built in the browser in plain ES5 (store method — the
  audio is already compressed, so there is nothing to gain from recompressing;
  a few dozen songs are fine, very large batches need enough RAM).
- **Real limit**: heavy continued use still triggers blocks on the worker IP
  (PO token is not 100%). It resets on its own in minutes/hours. Normal use
  (a few songs) is fine. For heavy use you'd need an extra provider or a
  residential proxy (paid).
- **Older browsers**: the page is plain ES5 JavaScript (no `let`/arrow/fetch,
  no build) and uses `<audio>` for preview: works roughly from 2015 onwards
  (Chrome/Edge 49+, Firefox 44+, Safari 9+, Internet Explorer 11 with `<audio>`).
  The quality picker uses `<select>`+`optgroup`, supported everywhere.

## License

MIT