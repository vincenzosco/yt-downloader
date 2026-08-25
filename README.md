# ytd.

YouTube downloader — minimale, su GitHub Pages. Cerca una canzone o incolla un link (video o playlist): anteprima titolo e copertina, download audio.

Pubblicato su [vincenzosco.github.io/yt-downloader](https://vincenzosco.github.io/yt-downloader).

[English version below ↓](#english)

## Come funziona

GitHub Pages (statico) + engine serverless (Cloudflare Worker o Deno Deploy). YouTube blocca le chiamate con header `Origin` (il browser non può chiamare direttamente le API interne). L'engine le chiama lato server, senza `Origin`.

```
browser (pagina statica su GitHub Pages)
   │  oEmbed YouTube (CORS nativo) → anteprima titolo/copertina
   │  chiamate all'engine (CORS *)
   ▼
engine: Cloudflare Worker + Deno Deploy (entrambi gratis)
   │  API Innertube lato server, senza Origin, retry su più host/client
   ▼
YouTube → URL audio/video → l'engine lo streama al browser → download
```

Il frontend prova automaticamente **entrambi gli engine**: se uno è in
cooldown anti-bot, passa all'altro (provider e IP diversi).

### Endpoint dell'engine (`worker/index.js`)

| Endpoint           | Descrizione                                      |
|--------------------|--------------------------------------------------|
| `/search?q=…`      | ricerca (titolo, autore, durata, copertina)     |
| `/info?id=…`       | dettagli video + audio preferito                 |
| `/formats?id=…`    | tutti i formati (audio, progressive, video-only) |
| `/playlist?list=…` | elenco tracce di una playlist                    |
| `/stream?id=…&itag=…` | stream del file (CORS, Range), itag opzionale |

## Deploy

### Cloudflare Worker

```bash
npx wrangler login
npx wrangler deploy
```

### Deno Deploy

1. Vai su [dash.deno.com](https://dash.deno.com) → New Project → collega il repo GitHub.
2. Entrypoint: `deno/main.js`.
3. L'URL sarà `https://yt-downloader-deno.deno.dev` (o simile). Incollalo in `app.js` come `ENGINE_DENO`.

In alternativa via CLI:

```bash
# installa deployctl (npm)
npx deployctl deploy --project=yt-downloader-deno --token=$DENO_DEPLOY_TOKEN --entrypoint=deno/main.js
```

Test rapido:

```bash
curl "https://xxx.workers.dev/search?q=test"
curl -I "https://xxx.workers.dev/stream?id=dQw4w9WgXcQ&itag=140"
```

## Sviluppo

- `index.html`, `style.css`, `app.js` — pagina statica, JavaScript ES5
  volutamente senza framework né build: gira anche su browser datati.
- `worker/index.js` — logica engine (Web API standard, funziona su Cloudflare
  Workers e Deno Deploy).
- `deno/main.js` — entrypoint Deno Deploy (riusa `worker/index.js`).

### Test locale

```bash
# test del parsing worker (Node.js)
node worker/test.js

# test engine su Deno (scarica il runtime in /tmp)
curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/tmp/denobin sh -s v2.0.0
/tmp/denobin/bin/deno run --allow-net deno/test.js
```

## Note

- Solo per contenuti di cui hai i diritti.
- Gli endpoint Innertube possono cambiare: aggiorna i client in `worker/index.js`
  (`CLIENT_WEB`, `CLIENT_ANDROID`, `CLIENT_IOS`).
- **Blocchi temporanei**: se l'engine accumula troppe richieste in poco tempo,
  YouTube può chiedere "Sign in to confirm you're not a bot". È un limite degli
  IP datacenter e si azzera da solo (pochi minuti/diverse ore). La pagina riprova
  da sola e passa automaticamente all'altro engine (Cloudflare → Deno e viceversa).
- Il download via engine non usa cache sull'URL audio: riusare lo stesso URL
  googlevideo fa scattare il throttling di YouTube.

<hr>

<a id="english"></a>
## English

# ytd.

A minimal YouTube downloader, hosted on GitHub Pages. Search a song or
paste a link (video or playlist): preview title & cover, download audio.

Published at [vincenzosco.github.io/yt-downloader](https://vincenzosco.github.io/yt-downloader).

The page has an IT/EN language toggle (top right). The engine serves both languages, but the page UI is available in both via the toggle.

## How it works

GitHub Pages (static) + serverless engine (Cloudflare Worker or Deno Deploy).
YouTube blocks requests with `Origin` headers that come from the browser.
The engine makes API calls server-side, without `Origin`.

The frontend automatically tries **both engines** in sequence: if one is
temporarily blocked (bot-challenge cooldown), it falls back to the other
(different provider, different IP pool).

### Engine endpoints (`worker/index.js`)

| Endpoint           | Description                                      |
|--------------------|--------------------------------------------------|
| `/search?q=…`      | search (title, author, duration, thumbnail)     |
| `/info?id=…`       | video details + preferred audio                  |
| `/formats?id=…`    | all available formats (audio, progressive, video)|
| `/playlist?list=…` | playlist track list                              |
| `/stream?id=…&itag=…` | stream the file (CORS, Range), optional itag  |

## Duplicate deploying

### Cloudflare Worker

```bash
npx wrangler login
npx wrangler deploy
```

Paste the resulting URL in the page footer (**change**) or set `ENGINE_CLOUDFLARE`
in `app.js`.

### Deno Deploy

1. Go to [dash.deno.com](https://dash.deno.com) → New Project → connect GitHub repo.
2. Entrypoint: `deno/main.js`.
3. Paste the resulting URL in `app.js` as `ENGINE_DENO`.

Or via CLI:

```bash
npx deployctl deploy --project=yt-downloader-deno --token=$DENO_DEPLOY_TOKEN --entrypoint=deno/main.js
```

## Development

- `index.html`, `style.css`, `app.js` — static page, ES5 (no framework, no build).
- `worker/index.js` — engine logic (standard Web APIs, works on both Cloudflare Workers and Deno Deploy).
- `deno/main.js` — Deno Deploy entrypoint (reuses `worker/index.js`).

## Notes

- Only for content you have rights to.
- **Temporary blocks**: heavy repeated use from datacenter IPs triggers
  YouTube's bot-challenge ("Sign in to confirm you're not a bot").
  Blocks reset on their own (minutes/hours). The page retries automatically
  and falls back to the other engine. Normal use (a few songs) doesn't trigger them.

## License

MIT