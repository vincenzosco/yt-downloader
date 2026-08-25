# ytd.

Downloader YouTube minimale, ospitato su GitHub Pages.

Cerca una canzone oppure incolla un link (video o playlist): anteprima di
titolo e copertina, anteprima audio e download dell'audio (m4a o webm).

Pubblicato su <https://vincenzosco.github.io/yt-downloader>.

Engine live: <https://yt-downloader.scopacasa-vincenzo432.workers.dev> (gia'
configurato come default nella pagina).

## Come funziona

GitHub Pages serve solo file statici, e YouTube blocca le chiamate dirette
dal browser (lo blocca se la richiesta arriva con header `Origin`). Quindi
l'architettura e' divisa in due:

```
browser (la pagina, statica su GitHub Pages)
   │  oEmbed di YouTube (CORS nativo)  → anteprima titolo/copertina
   │  chiamate all'engine (CORS *)
   ▼
engine: un Cloudflare Worker (gratis)
   │  chiama le API interne di YouTube (Innertube) lato server, senza Origin
   ▼
YouTube → URL audio → l'engine lo streama al browser → download
```

### Endpoint dell'engine (`worker/index.js`)

| Endpoint        | Descrizione                                            |
|-----------------|--------------------------------------------------------|
| `/search?q=…`   | ricerca (titolo, autore, durata, copertina)            |
| `/info?id=…`    | dettagli video + URL audio (m4a 128 kbps se disponibile) |
| `/playlist?list=…` | elenco tracce di una playlist                       |
| `/stream?id=…`  | stream dell'audio, con CORS e supporto `Range`         |

## Deploy dell'engine (una tantum)

Serve un account Cloudflare gratuito (gia' fatto per questo progetto).

```bash
npx wrangler login          # apre il browser per il login
npx wrangler deploy         # pubblica il worker
```

Al termine viene stampato l'URL, tipo `https://yt-downloader.xxxx.workers.dev`.
Incollalo nel sito: footer → **cambia** (oppure imposta `DEFAULT_ENGINE` in
`app.js` prima del deploy e lo trovi gia' configurato).

Verifica rapida:

```bash
curl "https://yt-downloader.xxxx.workers.dev/search?q=test"
curl -I "https://yt-downloader.xxxx.workers.dev/stream?id=dQw4w9WgXcQ"
```

Test del parsing contro i dati reali di YouTube (senza deploy):

```bash
node worker/test.js
```

## Sviluppo

- `index.html`, `style.css`, `app.js` — pagina statica, JavaScript ES5
  volutamente senza framework, niente build: gira anche su browser datati.
- `worker/index.js` — engine (Cloudflare Workers, JS moderno).

## Note

- Solo per contenuti di cui hai i diritti.
- Gli endpoint interni di YouTube possono cambiare: se qualcosa smette di
  funzionare, aggiorna le versioni dei client in `worker/index.js`
  (`CLIENT_WEB`, `CLIENT_ANDROID`).
- **Blocchi temporanei di YouTube**: se l'engine accumula troppe richieste
  in poco tempo, YouTube puo' chiedere "Sign in to confirm you're not a bot"
  o rifiutare gli stream (403). E' un limite degli IP datacenter e si azzera
  da solo in un paio d'ore. Il worker usa gia' piu' host, retry, `visitorData`
  e un fallback sulla pagina HTML per la ricerca; la pagina mostra un
  messaggio chiaro quando capita.
- Il download via worker non usa cache sull'URL audio: riusare lo stesso URL
  googlevideo fa scattare il throttling di YouTube.
