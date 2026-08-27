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

La pagina è **statica al 100%** (GitHub Pages) e parla **direttamente dal
browser** con le **API pubbliche di Piped** (gratis, senza account, CORS
permissivo). Non c'è un tuo server, non serve configurare nulla:

```
browser (pagina statica su GitHub Pages)
   │  richieste dirette (CORS *) alle API pubbliche di Piped
   ▼
istanza Piped pubblica → YouTube → URL audio/video
   │  i byte scendono diretti al browser (proxy CORS di Piped)
   ▼
download
```

Le istanze pubbliche vengono **bloccate/cambiate da YouTube in modo
intermittente** (anti-bot). La pagina gestisce da sola la cosa:

- tiene un **pool di istanze** di **due backend** (Piped + Invidious) e le
  **verifica** (health check) ogni 5 minuti, usando la prima viva (ricordata
  in `localStorage` per ripartire subito);
- se un'istanza fallisce, la scarta e **passa alle altre in automatico**;
- se **tutto Piped fallisce**, pirotta su **Invidious** come backend di
  riserva;
- nel footer ci sono **y2mate.vet, ytdown.tools e flvto.cyou come backup
  manuali**: un click apre il sito (e copia negli appunti l'URL del video
  se è nel campo link), così se tutti gli engine automatici sono bloccati
  puoi scaricare lì;
- **scarica a runtime le liste ufficiali** (TeamPiped documentation e
  api.invidious.io) così se spunta una nuova istanza viva la pagina la
  scopre da sola, senza aggiornare il codice;
- quando YouTube blocca l'istanza (“Sign in to confirm you're not a bot”),
  la pagina **riprova da sola** con attese crescenti e mostra un messaggio
  chiaro se il blocco persiste: basta riprovare tra qualche minuto.

## Onestà tecnica

Verificato empiricamente (ago 2026): senza alcun server non è possibile
garantire il 100% dei download, perché **YouTube non concede CORS** alle sue
API interne (il browser non può chiamarle direttamente) e blocca in modo
intermittente le istanze pubbliche gratuite. Per questo:

- **Ricerca e anteprima**: funzionano quasi sempre.
- **Download**: funzionano quando l'istanza pubblica non è in blocco
  (verificato: audio/video scaricati dal browser, ~11 MB in questo test).
  Nei momenti di blocco la pagina ritenta da sola e poi chiede di riprovare.
- **Playlist**: l'estrazione dipende dall'istanza; se bloccata la pagina
  mostra un messaggio esplicito.
- **Backup manuali**: y2mate.vet, ytdown.tools e flvto.cyou sono nel
  footer come riserve "umane": quando tutti gli engine automatici sono
  bloccati, un click apre il sito e lì incolli il link e scarichi. Non sono
  API: ho verificato che i loro motori (flvto.top per y2mate.vet,
  yt2api.com per ytdown.tools, flvto.com.im per flvto.cyou) **rifiutano le
  richieste cross-origin** (403 a qualunque Origin che non sia il proprio,
  token JWT legati all'origin, oppure nessun header CORS e preflight 404),
  quindi dal browser non sono integrabili come engine — solo come siti da
  aprire.
- **Backend di riserva**: Invidious è incluso come fallback, ma **oggi le
  sue istanze pubbliche non danno CORS permissivo né rispondono** (YouTube
  le blocca con 403/401) — è codice pronto che si attiva da solo appena una
  istanza Invidious torna viva e raggiungibile dal browser.
- Per un download **garantito** servirebbe un server con IP diverso dal tuo
  (es. un VPS da ~3€/mese): è l'unica strada che YouTube non riesce a
  bloccare a lungo. La pagina attuale è la migliore opzione possibile
  **senza server**.

## Sviluppo

- `index.html`, `style.css`, `app.js` — pagina statica, JavaScript **ES5**
  volutamente senza framework né build: gira anche su browser datati
  (Firefox 44+, Chrome/Edge 49+, Safari 9+).
- Il pool di istanze è `PIPED_POOL` in `app.js` (in cima): aggiungi un'istanza
  pubblica di Piped come voce dell'array; il health check la valuta da solo.
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
- Le istanze pubbliche di Piped possono cambiare/bloccarsi: è il costo di
  non avere un server. Se un'istanza muore, aggiungine un'altra a `PIPED_POOL`
  e la pagina la userà da sola.
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

The page is **100% static** (GitHub Pages) and talks **straight from the
browser** to the **public Piped API** (free, no account, permissive CORS).
There is no server of yours, nothing to configure:

```
browser (static page on GitHub Pages)
   │  direct requests (CORS *) to the public Piped API
   ▼
public Piped instance → YouTube → audio/video URLs
   │  bytes flow straight to the browser (Piped's CORS proxy)
   ▼
download
```

Public instances get **blocked/changed by YouTube intermittently**
(anti-bot). The page handles it by itself:

- keeps a **pool of instances from two backends** (Piped + Invidious) and
  **health-checks** them every 5 minutes, using the first alive one
  (remembered in `localStorage` to start fast);
- if an instance fails, it discards it and **falls through to the others
  automatically**;
- if **all of Piped fails**, it fails over to **Invidious** as a reserve
  backend;
- the footer has **y2mate.vet, ytdown.tools and flvto.cyou as manual
  backups**: one click opens the site (and copies the video URL to the
  clipboard if it is in the link field), so if all automatic engines are
  blocked you can download there;
- **downloads the official instance lists at runtime** (TeamPiped
  documentation and api.invidious.io), so if a new alive instance appears
  the page discovers it by itself, without a code update;
- when YouTube blocks the instance (“Sign in to confirm you're not a bot”),
  the page **retries on its own** with increasing waits and shows a clear
  message if the block persists: just try again in a few minutes.

## Technical honesty

Verified empirically (Aug 2026): with no server at all, 100% reliable
downloads are impossible, because **YouTube does not grant CORS** to its
internal APIs (the browser cannot call them directly) and intermittently
blocks free public instances. Therefore:

- **Search & preview**: work almost always.
- **Downloads**: work when the public instance is not blocked (verified:
  audio/video downloaded from the browser, ~11 MB in this test). During
  block windows the page retries by itself, then asks you to retry later.
- **Playlists**: extraction depends on the instance; if blocked, the page
  shows an explicit message.
- **Manual backups**: y2mate.vet, ytdown.tools and flvto.cyou are in the
  footer as “human” reserves: when all automatic engines are blocked, one
  click opens the site and you paste the link there and download. They are
  not APIs: I verified their engines (flvto.top for y2mate.vet, yt2api.com
  for ytdown.tools, flvto.com.im for flvto.cyou) **reject cross-origin
  requests** (403 to any Origin that is not their own, JWT tokens tied to
  the origin, or no CORS headers and a 404 preflight), so from the browser
  they cannot be integrated as engines — only as sites to open.
- **Reserve backend**: Invidious is included as a fallback, but **today its
  public instances do not grant permissive CORS nor respond** (YouTube
  blocks them with 403/401) — ready code that activates on its own as soon
  as an Invidious instance comes back alive and reachable from the
  browser.
- For **guaranteed** downloads you would need a server on a different IP
  than yours (e.g. a ~3€/month VPS): it is the only route YouTube cannot
  block for long. This page is the best option possible **without a server**.

## Development

- `index.html`, `style.css`, `app.js` — static page, plain **ES5** JavaScript
  (no framework, no build): works on old browsers too (Firefox 44+,
  Chrome/Edge 49+, Safari 9+).
- The instance pool is `PIPED_POOL` in `app.js` (at the top): add a public
  Piped instance as an array entry; the health check evaluates it on its own.
- No dependencies, no account, no deploy: just push to GitHub Pages.

### Version bump

The page auto-updates by comparing `window.YTD_VERSION` (in `index.html`)
with `version.txt`. **Before every commit**:

```bash
bash tools/bump.sh
```

## Notes

- Only for content you have rights to.
- Public Piped instances can change/be blocked: that's the price of having
  no server. If an instance dies, add another to `PIPED_POOL` and the page
  will use it on its own.
- **Older browsers**: the page is plain ES5 JavaScript (no `let`/arrow/fetch,
  no build) and uses `<audio>` for preview: works roughly from 2015 onwards
  (Chrome/Edge 49+, Firefox 44+, Safari 9+, Internet Explorer 11 with
  `<audio>`). The quality picker uses `<select>`+`optgroup`, supported
  everywhere. No WebAssembly required.

## License

MIT
