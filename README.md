# ytd.

YouTube downloader — minimale, su GitHub Pages, **senza alcun server dietro**.
Incolla un link (video o playlist): anteprima titolo e copertina, download
audio/video con scelta di qualità.

Pubblicato su [vincenzosco.github.io/yt-downloader](https://vincenzosco.github.io/yt-downloader).

[English version below ↓](#english)

## Funzioni

- **Incolla link** — video o playlist: card con titolo e copertina **subito**
  (da oembed, zero server), elenco tracce per le playlist.
- **Selettore qualità** — su ogni pulsante “Scarica”: scegli formato e qualità
  (Audio se disponibile, Video con audio, Video solo video). Ogni opzione
  mostra la dimensione stimata.
- **Playlist: “Scarica tutte”** — scarica a catena tutte le tracce.
- **Selezione multipla → .zip** — spunta le tracce di una playlist con le
  checkbox e scarica tutto in un unico `ytd-AAAA-MM-GG.zip`: download in
  sequenza con progress, nomi file dal titolo con estensione giusta, le tracce
  che falliscono non bloccano il lotto. Con gli stream protetti da YouTube
  (niente CORS) i file vengono scaricati singolarmente in sequenza, con un
  messaggio chiaro (i byte non possono entrare nello zip).
- **Lingua IT/EN** — selettore in alto a destra (ricorda la scelta).
- **Barre di progresso** — ogni download (singolo, “Scarica tutte” e batch
  .zip) mostra una barra che avanza con i byte ricevuti.
- **Auto-update** — quando il repo viene aggiornato, la pagina si ricarica da
  sola (banner “Ricarica” se c'è un download in corso).

## Come funziona — zero server

La pagina è **statica al 100%** (GitHub Pages) e parla **dal browser** con
**ytdlp.online** (yt-dlp server-side, gratis e senza account). Non c'è un tuo
server, non serve configurare nulla.

**Che libreria usa ytdlp.online?** È una web UI che esegue **yt-dlp** (e in
parte youtube-dl): un CLI **Python** che gira sul loro server. Python non può
girare in un browser, quindi non esiste un port "puro" della libreria per la
pagina — il browser può solo parlarci via API (attraverso i proxy, qui sotto).
Ho verificato le alternative client-side: **youtubei.js** (il port JS di
yt-dlp) è bloccato da YouTube nel browser (niente CORS, testato dal vivo),
le istanze **Invidious/Piped** pubbliche sono per lo più giù
(401/403/503, testate) — e **anche dal server** (test in Node, dove il CORS
non esiste) youtubei.js ottiene ricerca e playlist ma **niente URL reali
degli stream**: YouTube li serve solo con l'attestazione anti-bot (PO
token/BotGuard), che solo i server yt-dlp (come ytdlp.online) sanno
produrre. Resta quindi il flusso qui sotto.

**Anteprima zero-server**: titolo, autore e copertina arrivano **subito** da
**oembed** di YouTube direttamente (CORS aperto, verificato): niente proxy,
niente engine, niente quota consumata per la preview.

```
browser (pagina statica su GitHub Pages)
   │  richieste via proxy CORS pubblico (aggiunge gli header CORS)
   ▼
proxy CORS → ytdlp.online (yt-dlp server-side) → YouTube
   │  URL audio/video diretti (googlevideo)
   ▼
download (si apre in una scheda)
```

Il browser non può leggere la risposta SSE di ytdlp.online (nessun header
CORS), quindi la pagina passa da un **pool di proxy CORS pubblici**. La
pagina gestisce da sola tutta la resilienza:

- **Pool di proxy** (`YTDLP_PROXIES` in `app.js`): corsproxy.io, cors.io,
  api.allorigins.win, api.codetabs.com, api.cors.lol, cors.eu.org,
  test.cors.workers.dev — verificati con **health check** ogni 6 minuti,
  usando il primo vivo (ricordato in `localStorage`); cors.io risponde in
  JSON (il tool lo gestisce: estrae il body);
- **Rotazione automatica**: ogni proxy ha un IP diverso → **quota giornaliera
  separata** (ytdlp.online concede ~5 task/giorno per IP). Se un proxy è a
  quota o fallisce, la pagina **passa al successivo in automatico** e lo
  ricorda per 30 minuti (non lo riprova a ogni richiesta);
- **Cache locale dei formati**: una volta estratti i formati di un video
  (valgono 6 ore), i **download ripetuti non consumano più task** — la cache
  rende i re-download istantanei;
- **Retry aggressivo**: se tutti i proxy falliscono, la pagina riprova un
  altro giro con attese crescenti prima di arrendersi, e mostra un messaggio
  chiaro (il limite di ytdlp.online si resetta da solo).

## Onestà tecnica

Verificato empiricamente (ago 2026): senza alcun server non è possibile
garantire il 100% dei download, perché **YouTube non concede CORS** alle sue
API interne (il browser non può chiamarle direttamente) e ytdlp.online ha un
**limite di ~5 conversioni/giorno per IP**. La pagina mitiga con tre accorgimenti
verificati dal vivo:

1. **Pool di proxy CORS** — ogni proxy ha un IP diverso, quindi la quota
   giornaliera si moltiplica per il numero di proxy vivi. Se un IP è a quota,
   si passa al successivo (e lo si ricorda per 30 min).
2. **Cache dei formati in `localStorage`** — un video già estratto (valido 6
   ore) non consuma più task: i download ripetuti sono istantanei e gratuiti.
3. **Retry con secondo giro** — se tutti i proxy falliscono, la pagina riprova
   tutto un'altra volta con attese crescenti (l'anti-bot è intermittente).

Limiti reali, verificati:

- **~5 task/giorno per IP** su ytdlp.online: quando si esaurisce la pagina
  mostra un messaggio chiaro e passa ai proxy successivi; quando tutti sono a
  quota chiede di riprovare (il contatore si resetta da solo).
- I formati hanno **URL googlevideo senza CORS**: i byte non sono leggibili
  dal browser, quindi il download apre l'URL — singolo: nuova scheda;
  playlist "Scarica tutte" e selezione multipla: download in **sequenza** nel
  download manager del browser, uno dopo l'altro. Lo **.zip multi-selezione
  funziona quando gli stream sono leggibili**; per gli stream protetti la
  pagina scarica i file singolarmente con un messaggio chiaro.
- **Widget ytdown.tools (bestapi.cc)**: nel pannello “Incolla link”, per un
  video c'è il pulsante **🎯 scarica con widget ytdown.tools** che apre in un
  iframe il widget di bestapi.cc (`frame-ancestors *`, verificato nel
  browser: mostra i formati MP3/MP4 con i pulsanti di conversione).
  Funziona sempre: i formati girano dentro il widget, nessun CORS da
  gestire.
- Per un download **garantito** servirebbe un server con IP dedicato (es. un
  VPS da ~3€/mese): è l'unica strada che YouTube non riesce a bloccare a
  lungo. La pagina attuale è la migliore opzione possibile **senza server**.

## Sviluppo

- `index.html`, `style.css`, `app.js` — pagina statica, senza framework né
  build. Codice ES5 con `fetch` quando disponibile (fallback XHR):
  raccomandati browser moderni; gran parte funziona anche su browser datati.
- Il pool di proxy è `YTDLP_PROXIES` in `app.js` (in cima): aggiungi un proxy
  CORS pubblico come voce dell'array; il health check lo valuta da solo.
- Nessuna dipendenza, nessun account, nessun deploy: basta pushare su GitHub
  Pages.

### Bump versione

La pagina si auto-aggiorna confrontando `window.YTD_VERSION` (in `index.html`)
con `version.txt`. **Prima di ogni commit**:

```bash
bash tools/bump.sh
```

## Note

- Solo per contenuti di cui hai i diritti.
- I proxy CORS pubblici possono cambiare/bloccarsi: è il costo di non avere un
  server. Se un proxy muore, aggiungine un altro a `YTDLP_PROXIES` e la
  pagina lo userà da sola.
- **Browser**: raccomandati browser moderni (l'oembed usa `fetch`, con
  fallback XHR). Niente WebAssembly, niente build.

## License

MIT

<hr>

<a id="english"></a>
## English

# ytd.

A minimal YouTube downloader, hosted on GitHub Pages, **with no server
behind it at all**. Paste a link (video or playlist): preview title & cover,
download audio/video with quality choice.

Published at [vincenzosco.github.io/yt-downloader](https://vincenzosco.github.io/yt-downloader).

The page UI is bilingual (IT/EN toggle, top right).

## Features

- **Paste link** — video or playlist: card with title & cover **instantly**
  (from oembed, zero server), track list for playlists.
- **Quality picker** — every “Download” button lets you choose format/quality
  (Audio when available, Video with audio, Video only). Estimated size shown
  on every option.
- **Playlist “Download all”** — downloads every track in sequence.
- **Multi-select → .zip** — tick tracks of a playlist with the checkboxes and
  download them all as a single `ytd-YYYY-MM-DD.zip`: sequential downloads
  with progress, filenames from the title with the right extension, failed
  tracks don't stop the batch. With YouTube-protected streams (no CORS) the
  files are downloaded individually in sequence, with a clear message (their
  bytes can't go into the zip).
- **IT/EN language** — toggle at the top right (choice is remembered).
- **Progress bars** — every download (single, “Download all” and the .zip
  batch) shows a bar advancing with the received bytes.
- **Auto-update** — when the repo is updated, the page reloads itself (a
  “Reload” banner appears if a download is in progress).

## How it works — zero server

The page is **100% static** (GitHub Pages) and talks **from the browser** to
**ytdlp.online** (yt-dlp server-side, free and no account). There is no server
of yours, nothing to configure.

**What library does ytdlp.online use?** It is a web UI that runs **yt-dlp**
(and partly youtube-dl): a **Python** CLI that runs on their server. Python
cannot run in a browser, so there is no "pure" port of the library for the
page — the browser can only talk to it via API (through the proxies below).I checked the client-side alternatives: **youtubei.js** (yt-dlp's JS port) is
blocked by YouTube in the browser (no CORS, tested live), public
**Invidious/Piped** instances are mostly down (401/403/503, tested) — and
**even from a server** (Node test, where CORS doesn't exist) youtubei.js
gets search and playlists but **no real stream URLs**: YouTube only serves
them with the anti-bot attestation (PO token/BotGuard), which only yt-dlp
servers (like ytdlp.online) can produce. So the flow below is what remains.

**Zero-server preview**: title, author and cover arrive **instantly** from
**oembed** (YouTube, CORS open — verified): no proxy, no engine, no quota
spent on the preview.

```
browser (static page on GitHub Pages)
   │  requests through a public CORS proxy (adds the CORS headers)
   ▼
CORS proxy → ytdlp.online (yt-dlp server-side) → YouTube
   │  direct audio/video URLs (googlevideo)
   ▼
download (opens in a tab)
```

The browser cannot read ytdlp.online's SSE response (no CORS headers), so the
page goes through a **pool of public CORS proxies**. The page handles all the
resilience by itself:

- **Proxy pool** (`YTDLP_PROXIES` in `app.js`): corsproxy.io, cors.io,
  api.allorigins.win, api.codetabs.com, api.cors.lol, cors.eu.org,
  test.cors.workers.dev — **health-checked** every 6 minutes, using the
  first alive one (remembered in `localStorage`); cors.io replies in JSON
  (the tool handles it: it extracts the body);
- **Automatic rotation**: each proxy has a different IP → **separate daily
  quota** (ytdlp.online allows ~5 tasks/day per IP). If a proxy is at quota
  or fails, the page **moves to the next one automatically** and remembers it
  for 30 minutes (no repeated attempts);
- **Local formats cache**: once a video's formats are extracted (valid 6
  hours), **repeated downloads consume zero tasks** — re-downloads are
  instant;
- **Aggressive retry**: if all proxies fail, the page tries a second full
  round with increasing waits before giving up, and shows a clear message
  (ytdlp.online's counter resets on its own).

## Technical honesty

Verified empirically (Aug 2026): with no server at all, 100% reliable
downloads are impossible, because **YouTube does not grant CORS** to its
internal APIs (the browser cannot call them directly) and ytdlp.online has a
**~5 conversions/day per IP limit**. The page mitigates with three measures,
all verified live:

1. **CORS proxy pool** — each proxy has a different IP, so the daily quota
   is multiplied by the number of alive proxies. If one IP is at quota, the
   page moves to the next (and remembers it for 30 min).
2. **Formats cache in `localStorage`** — a video already extracted (valid 6
   hours) consumes zero further tasks: re-downloads are instant and free.
3. **Retry with a second round** — if all proxies fail, the page retries
   everything once more with increasing waits (the anti-bot is
   intermittent).

Real, verified limits:

- **~5 tasks/day per IP** on ytdlp.online: when exhausted, the page shows a
  clear message and moves to the next proxy; when all are at quota it asks
  you to retry (the counter resets on its own).
- The formats are **googlevideo URLs without CORS**: the bytes can't be read
  by the browser, so the download opens the URL — single: new tab; playlist
  "Download all" and multi-select: downloads in **sequence** into the
  browser's download manager, one after another. The **.zip multi-select
  works when streams are readable**; for YouTube-protected streams the page
  downloads the files individually with a clear message.
- **ytdown.tools widget (bestapi.cc)**: in the “Paste link” panel, for a
  video there is a **🎯 download with ytdown.tools widget** button that
  opens the bestapi.cc widget in an iframe (`frame-ancestors *`, verified
  in a real browser: it shows the MP3/MP4 formats with convert buttons).
  It always works: the formats run inside the widget, no CORS to handle.
- For **guaranteed** downloads you would need a server on a dedicated IP
  (e.g. a ~3€/month VPS): it is the only route YouTube cannot block for
  long. This page is the best option possible **without a server**.

## Development

- `index.html`, `style.css`, `app.js` — static page, no framework, no
  build. ES5 code with `fetch` when available (XHR fallback): modern
  browsers recommended; most of it also works on old ones.
- The proxy pool is `YTDLP_PROXIES` in `app.js` (at the top): add a public
  CORS proxy as an array entry; the health check evaluates it on its own.
- No dependencies, no account, no deploy: just push to GitHub Pages.

### Version bump

The page auto-updates by comparing `window.YTD_VERSION` (in `index.html`)
with `version.txt`. **Before every commit**:

```bash
bash tools/bump.sh
```

## Notes

- Only for content you have rights to.
- Public CORS proxies can change/be blocked: that's the price of having no
  server. If a proxy dies, add another to `YTDLP_PROXIES` and the page will
  use it on its own.
- **Browsers**: modern browsers recommended (oembed uses `fetch`, with XHR
  fallback). No WebAssembly, no build.

## License

MIT
