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
- **Lingua IT/EN** — selettore in alto a destra (ricorda la scelta).
- **Anti-bot** — l'engine genera via token PO e ritenta da solo se YouTube
  chiede “sign in to confirm you're not a bot” (vedi Note).

## Come funziona

GitHub Pages (statico) + engine serverless (Cloudflare Worker). YouTube blocca le chiamate con header `Origin` (il browser non può chiamare direttamente le API interne). L'engine le chiama lato server, senza `Origin`.

```
browser (pagina statica su GitHub Pages)
   │  oEmbed YouTube (CORS nativo) → anteprima titolo/copertina
   │  chiamate all'engine (CORS *)
   ▼
engine: Cloudflare Worker (gratis, unico account: già usato)
   │  API Innertube lato server, senza Origin, retry su più host/client
   │  PO token (anti-bot) generato dentro il worker
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

## Sviluppo

- `index.html`, `style.css`, `app.js` — pagina statica, JavaScript ES5
  volutamente senza framework né build: gira anche su browser datati.
- `worker/index.js` — logica engine (Web API standard).
- `worker/pot.js` — generazione PO token (anti-bot) con `bgutils-js`
  (dipendenza npm in `worker/package.json`). Genera il token all'avvio del
  worker e lo rigenera su richiesta se scade.

### Test locale

```bash
# test del parsing worker (Node.js)
node worker/test.js

# test della generazione PO token (Node.js)
cd worker && node pot-test.mjs
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
- **Limite reale**: un uso frequente continuato fa comunque scattare il blocco
  sull'IP del worker (il PO token non garantisce il 100%). Si azzera da solo in
  pochi minuti/ore. L'uso normale (qualche canzone) non lo innesca. Per un uso
  intenso servirebbe un provider aggiuntivo (es. Deno Deploy, che richiede un
  secondo account) oppure un IP residenziale via proxy.
- Il download via engine non usa cache sull'URL audio: riusare lo stesso URL
  googlevideo fa scattare il throttling di YouTube.
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
- **Anti-bot** — the engine generates a PO token and retries on its own if
  YouTube asks “sign in to confirm you're not a bot” (see Notes).

## How it works

GitHub Pages (static) + serverless engine (Cloudflare Worker).
YouTube blocks requests with `Origin` headers that come from the browser.
The engine makes API calls server-side, without `Origin`, and generates its
own anti-bot PO token (`worker/pot.js`) inside the worker.

### Engine endpoints (`worker/index.js`)

| Endpoint           | Description                                      |
|--------------------|--------------------------------------------------|
| `/search?q=…`      | search (title, author, duration, thumbnail)     |
| `/info?id=…`       | video details + preferred audio                  |
| `/formats?id=…`    | all available formats (audio, progressive, video)|
| `/playlist?list=…` | playlist track list                              |
| `/stream?id=…&itag=…` | stream the file (CORS, Range), optional itag  |

## Deploy

Only the Cloudflare account already in use is required (single account).

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

## Development

- `index.html`, `style.css`, `app.js` — static page, ES5 (no framework, no build).
- `worker/index.js` — engine logic (standard Web APIs).
- `worker/pot.js` — anti-bot PO token generation (`bgutils-js`).

## Notes

- Only for content you have rights to.
- **Anti-bot (PO token)**: YouTube asks "Sign in to confirm you're not a bot"
  on datacenter IPs. The worker generates a PO token with `bgutils-js`
  (`worker/pot.js`) and injects it into `/info`, `/formats`, `/stream` to
  pass the challenge.
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