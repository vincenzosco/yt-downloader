# ytd.

YouTube downloader — minimale, su GitHub Pages, **senza alcun server dietro**.
Cerca una canzone o incolla un link (video o playlist): anteprima titolo e
copertina, download audio/video con scelta di qualità.

Pubblicato su [vincenzosco.github.io/yt-downloader](https://vincenzosco.github.io/yt-downloader).

[English version below ↓](#english)

## Funzioni

- **Cerca** — risultati con copertina, titolo, autore, durata, visualizzazioni
  e anteprima audio (▶).
- **Incolla link** — video o playlist: card con titolo e copertina, elenco tracce.
- **Selettore qualità** — su ogni pulsante “Scarica”: scegli formato e qualità
  (Audio se disponibile, Video con audio, Video solo video). Ogni opzione
  mostra la dimensione stimata.
- **Playlist: “Scarica tutte”** — scarica a catena tutte le tracce.
- **Selezione multipla → .zip** — spunta le canzoni con le checkbox (da una o
  più ricerche, la selezione resta mentre cerchi altro) e scarica tutto in un
  unico `ytd-AAAA-MM-GG.zip`: download in sequenza con progress, nomi file dal
  titolo con estensione giusta, le canzoni che falliscono non bloccano il lotto.
- **Lingua IT/EN** — selettore in alto a destra (ricorda la scelta).
- **Barre di progresso** — ogni download (singolo, “Scarica tutte” e batch
  .zip) mostra una barra che avanza con i byte ricevuti.
- **Auto-update** — quando il repo viene aggiornato, la pagina si ricarica da
  sola (banner “Ricarica” se c'è un download in corso).

## Come funziona — zero server

La pagina è **statica al 100%** (GitHub Pages) e parla **dal browser** con
**ytdlp.online** (yt-dlp server-side, gratis e senza account). Non c'è un tuo
server, non serve configurare nulla:

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
- **Cache della ricerca** (10 minuti): ricerche ripetute non consumano task;
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
- I formati hanno **URL googlevideo senza CORS**: il download si apre in una
  scheda (il browser lo scarica comunque, senza barra di progresso).
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

- `index.html`, `style.css`, `app.js` — pagina statica, JavaScript **ES5**
  volutamente senza framework né build: gira anche su browser datati
  (Firefox 44+, Chrome/Edge 49+, Safari 9+).
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
- **Browser datati**: la pagina è JavaScript ES5 puro (niente `let`/arrow/fetch,
  niente build) e usa `<audio>` per l'anteprima: funziona da circa il 2015 in
  su (Chrome/Edge 49+, Firefox 44+, Safari 9+, Internet Explorer 11 con
  `<audio>`). Il selettore qualità usa `<select>`+`optgroup`, supportato da
  sempre. Niente WebAssembly richiesto.

## License

MIT

<hr>

<a id="english"></a>
## English

# ytd.

A minimal YouTube downloader, hosted on GitHub Pages, **with no server
behind it at all**. Search a song or paste a link (video or playlist):
preview title & cover, download audio/video with quality choice.

Published at [vincenzosco.github.io/yt-downloader](https://vincenzosco.github.io/yt-downloader).

The page UI is bilingual (IT/EN toggle, top right).

## Features

- **Search** — results with thumbnail, title, author, duration, views and
  audio preview (▶).
- **Paste link** — video or playlist: card with title & cover, track list.
- **Quality picker** — every “Download” button lets you choose format/quality
  (Audio when available, Video with audio, Video only). Estimated size shown
  on every option.
- **Playlist “Download all”** — downloads every track in sequence.
- **Multi-select → .zip** — tick songs with the checkboxes (from one or more
  searches — the selection stays while you search more) and download them all
  as a single `ytd-YYYY-MM-DD.zip`: sequential downloads with progress,
  filenames from the title with the right extension, failed songs don't stop
  the batch.
- **IT/EN language** — toggle at the top right (choice is remembered).
- **Progress bars** — every download (single, “Download all” and the .zip
  batch) shows a bar advancing with the received bytes.
- **Auto-update** — when the repo is updated, the page reloads itself (a
  “Reload” banner appears if a download is in progress).

## How it works — zero server

The page is **100% static** (GitHub Pages) and talks **from the browser** to
**ytdlp.online** (yt-dlp server-side, free and no account). There is no server
of yours, nothing to configure:

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
- **Search cache** (10 minutes): repeated searches consume zero tasks;
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
- The formats are **googlevideo URLs without CORS**: the download opens in a
  tab (the browser still downloads it, just without a progress bar).
- **ytdown.tools widget (bestapi.cc)**: in the “Paste link” panel, for a
  video there is a **🎯 download with ytdown.tools widget** button that
  opens the bestapi.cc widget in an iframe (`frame-ancestors *`, verified
  in a real browser: it shows the MP3/MP4 formats with convert buttons).
  It always works: the formats run inside the widget, no CORS to handle.
- For **guaranteed** downloads you would need a server on a dedicated IP
  (e.g. a ~3€/month VPS): it is the only route YouTube cannot block for
  long. This page is the best option possible **without a server**.

## Development

- `index.html`, `style.css`, `app.js` — static page, plain **ES5** JavaScript
  (no framework, no build): works on old browsers too (Firefox 44+,
  Chrome/Edge 49+, Safari 9+).
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
- **Older browsers**: the page is plain ES5 JavaScript (no `let`/arrow/fetch,
  no build) and uses `<audio>` for preview: works roughly from 2015 onwards
  (Chrome/Edge 49+, Firefox 44+, Safari 9+, Internet Explorer 11 with
  `<audio>`). The quality picker uses `<select>`+`optgroup`, supported
  everywhere. No WebAssembly required.

## License

MIT
