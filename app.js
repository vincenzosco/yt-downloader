/* ytd. — logica pagina (ES5: niente fetch, arrow o template literal, gira sui browser datati) */
(function () {
  'use strict';

  /* La pagina NON usa alcun server: parla direttamente con le API pubbliche
     di Piped (gratis, senza account, CORS permissivo) dal browser. Le
     istanze pubbliche vengono bloccate/cambiate da YouTube in modo
     intermittente, quindi la pagina tiene un pool, le verifica (health
     check) e usa la prima viva, ricontrollando in automatico. */

  /* ---------- lingua ---------- */

  var LANGS = {
    it: {
      'title': 'ytd. — download audio da YouTube',
      'tagline': 'download audio da youtube — cerca una canzone oppure incolla un link',
      'tab-search': 'Cerca',
      'tab-link': 'Incolla link',
      'placeholder-search': 'artista o titolo…',
      'btn-search': 'Cerca',
      'placeholder-link': 'https://www.youtube.com/watch?v=… o playlist…',
      'btn-preview': 'Anteprima',
      'noscript': 'Questa pagina richiede JavaScript (dalla versione 2015 in poi va bene).',
      'engine-label': 'engine:',
      'disclaimer': 'solo per contenuti di cui hai i diritti.',
      'piped-checking': 'verifico le istanze pubbliche…',
      'piped-none': 'Nessuna istanza pubblica raggiungibile in questo momento. Riprova tra poco.',
      'piped-label': 'browser (API Piped pubblica)',
      'searching': 'cerco…',
      'no-results': 'nessun risultato per \u201c{0}\u201d',
      'search-err': 'ricerca: {0}',
      'formats-err': 'formati: {0}',
      'download-err': 'Download: {0}',
      'backup-open': 'apri y2mate.vet',
      'backup-open2': 'apri ytdown.tools',
      'backup-tip': 'Tutti gli engine sono bloccati? Apri y2mate.vet o ytdown.tools: incolla lì il link del video e scarica.',
      'info-err': 'info video: {0}',
      'playlist-err': 'playlist: {0}',
      'link-unrecognized': 'Link non riconosciuto: incolla un URL di YouTube (video o playlist).',
      'loading-tracks': 'carico le tracce…',
      'playlist-empty': 'Playlist vuota o non accessibile (spesso è il blocco anti-bot di YouTube: riprova tra poco).',
      'tracks-count': '{0} tracce',
      'download': 'Scarica',
      'download-all': 'Scarica tutte',
      'download-audio': 'Scarica audio',
      'preview-audio': 'Anteprima audio',
      'cancel': 'Annulla',
      'quality': 'Qualità',
      'quality-audio': 'Qualità audio',
      'saved': 'salvato',
      'error': 'errore',
      'done': 'fatto',
      'search': 'Cerca',
      'group-audio': 'Audio',
      'group-video-mixed': 'Video (con audio)',
      'group-video-only': 'Video (solo video)',
      'opt-audio-rec': 'Audio AAC (consigliato)',
      'opt-audio-best': 'Audio Opus (migliore)',
      'opt-audio-light': 'Audio leggero',
      'no-save-support': 'Il tuo browser non supporta il salvataggio diretto: apri il link e salva con \u201csalva con nome\u201d.',
      'loading-stream': 'carico lo stream…',
      'loading-info': 'carico le informazioni…',
      'bot-blocked': "YouTube ha bloccato temporaneamente l'istanza pubblica (anti-bot). Riprova tra qualche minuto.",
      'youtube-refused': 'YouTube ha rifiutato la richiesta (blocco temporaneo). Riprova tra poco.',
      'youtube-refused-status': 'YouTube ha rifiutato la richiesta (HTTP {0}, blocco temporaneo). Riprova tra poco.',
      'interrupted': 'Download interrotto (rete o annullamento). Riprova.',
      'retry-wait': "YouTube ha bloccato l'engine: riprovo da solo tra {0}s…",
      'zip-select': 'Seleziona per lo zip',
      'sel-count': '{0} selezionate',
      'zip-download': 'Scarica .zip',
      'zip-clear': 'Svuota',
      'zip-progress': '{0}/{1} · {2}',
      'zip-done': 'Zip salvato ({0} file)',
      'zip-err': 'zip: {0}',
      'zip-unavailable': 'stream non disponibile',
      'zip-some-failed': ' ({0} non riuscite)',
      'up-available': 'Nuova versione disponibile (v{0}).',
      'up-reload': 'Ricarica'
    },
    en: {
      'title': 'ytd. — YouTube downloader',
      'tagline': 'YouTube downloader — search a song or paste a link',
      'tab-search': 'Search',
      'tab-link': 'Paste link',
      'placeholder-search': 'artist or title…',
      'btn-search': 'Search',
      'placeholder-link': 'https://www.youtube.com/watch?v=… or playlist…',
      'btn-preview': 'Preview',
      'noscript': 'This page requires JavaScript (ES5, works in any browser from ~2015).',
      'engine-label': 'engine:',
      'disclaimer': 'only for content you have rights to.',
      'piped-checking': 'checking public instances…',
      'piped-none': 'No public instance reachable right now. Try again soon.',
      'piped-label': 'browser (public Piped API)',
      'searching': 'searching…',
      'no-results': 'no results for \u201c{0}\u201d',
      'search-err': 'search: {0}',
      'formats-err': 'formats: {0}',
      'download-err': 'Download: {0}',
      'backup-open': 'open y2mate.vet',
      'backup-open2': 'open ytdown.tools',
      'backup-tip': 'All engines blocked? Open y2mate.vet or ytdown.tools, paste the video link there and download.',
      'info-err': 'video info: {0}',
      'playlist-err': 'playlist: {0}',
      'link-unrecognized': 'Link not recognized: paste a YouTube URL (video or playlist).',
      'loading-tracks': 'loading tracks…',
      'playlist-empty': 'Empty or inaccessible playlist (often YouTube\u2019s anti-bot block: try again soon).',
      'tracks-count': '{0} tracks',
      'download': 'Download',
      'download-all': 'Download all',
      'download-audio': 'Download audio',
      'preview-audio': 'Audio preview',
      'cancel': 'Cancel',
      'quality': 'Quality',
      'quality-audio': 'Audio quality',
      'saved': 'saved',
      'error': 'error',
      'done': 'done',
      'search': 'Search',
      'group-audio': 'Audio',
      'group-video-mixed': 'Video (with audio)',
      'group-video-only': 'Video (video only)',
      'opt-audio-rec': 'Audio AAC (recommended)',
      'opt-audio-best': 'Audio Opus (best)',
      'opt-audio-light': 'Light audio',
      'no-save-support': 'Your browser does not support direct saving: open the link and save with \u201csave as\u201d.',
      'loading-stream': 'loading stream…',
      'loading-info': 'loading info…',
      'bot-blocked': "YouTube temporarily blocked the public instance (anti-bot). Try again in a few minutes.",
      'youtube-refused': 'YouTube refused the request (temporary block). Try again soon.',
      'youtube-refused-status': 'YouTube refused the request (HTTP {0}, temporary block). Try again soon.',
      'interrupted': 'Download interrupted (network or cancelled). Try again.',
      'retry-wait': 'YouTube blocked the engine: retrying automatically in {0}s…',
      'zip-select': 'Select for zip',
      'sel-count': '{0} selected',
      'zip-download': 'Download .zip',
      'zip-clear': 'Clear',
      'zip-progress': '{0}/{1} · {2}',
      'zip-done': 'Zip saved ({0} files)',
      'zip-err': 'zip: {0}',
      'zip-unavailable': 'stream unavailable',
      'zip-some-failed': ' ({0} failed)',
      'up-available': 'New version available (v{0}).',
      'up-reload': 'Reload'
    }
  };

  var LANG_KEY = 'ytd.lang';
  var currentLang = storageGet(LANG_KEY) === 'en' ? 'en' : 'it';

  function t(key) {
    var s = LANGS[currentLang][key];
    if (s == null) s = LANGS.it[key];
    return s == null ? key : s;
  }

  /* t('no-results', q) -> sostituisce {0}, {1}... */
  function tF(key) {
    var s = t(key);
    for (var i = 1; i < arguments.length; i++) {
      s = s.split('{' + (i - 1) + '}').join(arguments[i]);
    }
    return s;
  }

  function applyLang() {
    document.documentElement.lang = currentLang;
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var k = els[i].getAttribute('data-i18n');
      if (t(k)) els[i].textContent = t(k);
    }
    var ph = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < ph.length; j++) {
      ph[j].setAttribute('placeholder', t(ph[j].getAttribute('data-i18n-placeholder')));
    }
    var btn = $('lang-toggle');
    if (btn) btn.textContent = currentLang === 'it' ? 'EN' : 'IT';
    if (typeof renderPipedStatus === 'function') renderPipedStatus();
    if (typeof renderSel === 'function') renderSel();
  }

  function bindLang() {
    var btn = $('lang-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      currentLang = (currentLang === 'it') ? 'en' : 'it';
      storageSet(LANG_KEY, currentLang);
      applyLang();
    });
  }

  /* ---------- helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function hasClass(el, c) { return (' ' + el.className + ' ').indexOf(' ' + c + ' ') !== -1; }
  function addClass(el, c) { if (!hasClass(el, c)) el.className = (el.className + ' ' + c).replace(/^\s+|\s+$/g, ''); }
  function removeClass(el, c) { el.className = (' ' + el.className + ' ').replace(' ' + c + ' ', ' ').replace(/^\s+|\s+$/g, ''); }

  function thumbFor(id) { return 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/mqdefault.jpg'; }

  function fmtDur(sec) {
    sec = parseInt(sec, 10) || 0;
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function fmtBytes(n) {
    n = parseInt(n, 10) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  function extForMime(mime) {
    mime = String(mime || '');
    if (mime.indexOf('webm') !== -1) return 'webm';
    if (mime.indexOf('audio/mp4') !== -1 || mime.indexOf('m4a') !== -1 || mime.indexOf('aac') !== -1 || mime.indexOf('mp4a') !== -1) return 'm4a';
    if (mime.indexOf('video/mp4') !== -1 || mime.indexOf('mp4') !== -1) return 'mp4';
    if (mime.indexOf('ogg') !== -1 || mime.indexOf('opus') !== -1) return 'ogg';
    return 'm4a';
  }

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, val) {
    try { window.localStorage.setItem(key, val); } catch (e) { /* niente */ }
  }
  function storageDel(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* niente */ }
  }

  /* ---------- engine: API pubbliche di Piped + Invidious (browser-direct, zero server) ----------
     La pagina parla DIRETTAMENTE con le istanze pubbliche di due backend:
       - Piped (default, quando vivo)
       - Invidious (fallback, usato se TUTTO Piped fallisce)
     Gratis, senza account, CORS permissivo; nessun server dietro, funziona da
     sola su GitHub Pages. YouTube blocca/cambia le istanze pubbliche in modo
     intermittente (anti-bot), quindi la pagina:
       - tiene un pool per entrambi i backend e le verifica (health check)
         ogni pochi minuti
       - usa la prima viva, salvata anche in localStorage per ripartire subito
       - se un'istanza fallisce, la scarta e passa alle altre in automatico;
         se fallisce tutto Piped, pirotta su Invidious
     Nel footer ci sono anche y2mate.vet e ytdown.tools come backup manuali
     (aprono il sito e copiano l'URL del video negli appunti): i loro
     motori rifiutano le richieste cross-origin (403 per qualunque Origin
     estraneo), quindi non sono integrabili come engine dal browser — solo
     come siti da aprire.
     Quando YouTube blocca l'istanza ("Sign in to confirm you're not a bot"),
     la pagina riprova da sola con attese crescenti e alla fine mostra un
     messaggio chiaro. */

  /* Pool di istanze pubbliche di Piped, ordinate con le più vicine/affidabili
     in cima. Le istanze pubbliche nascono e muoiono spesso (anti-bot di
     YouTube), quindi il pool è volutamente ampio: il health check scarta le
     morte e la pagina usa la prima che risponde davvero. Aggiungi qui una
     nuova istanza o un candidato per ampliare la rete. */
  var PIPED_POOL = [
    'https://api.piped.private.coffee',
    'https://pipedapi.orangenet.cc',
    'https://api.piped.projectsegfau.lt',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.drgns.space',
    'https://pipedapi.ducks.party',
    'https://api.piped.yt',
    'https://pipedapi.leptons.xyz',
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.reallyaweso.me',
    'https://piped-api.codespace.cz',
    'https://pipedapi.darkness.services',
    'https://pipedapi.nosebs.ru',
    'https://pipedapi-libre.kavin.rocks',
    'https://piped-api.privacy.com.de',
    'https://api.piped.shynek.de',
    'https://piped-api.owo.si',
    'https://pipedapi.mha.fi'
  ];
  /* Istanza di ultima risorsa: se il health check scarta tutto, prova questa
     comunque sulla search reale (alcune istanze mentono sull'healthcheck o
     rispondono solo su certi endpoint). */
  var PIPED_FALLBACK = 'https://api.piped.private.coffee';
  var PIPED_TTL = 4 * 60 * 1000;  /* ricontrolla le istanze ogni 4 min */
  var PIPED_KEY = 'ytd.piped';
  var pipedBase = '';
  var pipedChecked = 0;
  var pipedChecking = false;

  /* ---- backend di riserva: Invidious (usato se TUTTO Piped fallisce) ----
     Invidious oggi risponde quasi ovunque 403 (YouTube blocca anche lui),
     quindi è codice pronto ma inattivo: appena una delle istanze qui sotto
     (o l'una trovatane nelle liste remote) torna viva, la pagina la usa. */
  var INVID_POOL = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://invidious.f5.si',
    'https://invidious.tiekoetter.com'
  ];
  var INVID_KEY = 'ytd.invid';
  var invidBase = '';
  var invidChecked = 0;
  var invidChecking = false;

  function invidLoadCache() {
    try {
      var j = JSON.parse(window.localStorage.getItem(INVID_KEY) || 'null');
      if (j && j.base && j.at && (Date.now() - j.at) < PIPED_TTL) return j.base;
    } catch (e) { /* ignora */ }
    return '';
  }
  function invidSave(base) {
    try {
      window.localStorage.setItem(INVID_KEY, JSON.stringify({ base: base, at: Date.now() }));
    } catch (e) { /* ignora */ }
  }

  /* lista ufficiale istanze Invidious (api.invidious.io/instances.json, CORS *) */
  var INVID_LIST_SOURCE = 'https://api.invidious.io/instances.json?pretty=1';

  function invidProbe(base, cb) {
    var x = new XMLHttpRequest();
    x.open('GET', base + '/api/v1/search?q=probe', true); /* search reale, non healthcheck */
    x.timeout = 8000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      /* Invidious può rispondere 403 "Endpoint disabled" anche se l'istanza è
         su: meglio provarla comunque in pipedGet-style. Qui conta solo se la
         rotta HTTP esiste (2xx/3xx): i 403 si valutano all'uso. */
      cb(x.status > 0); /* qualunque risposta HTTP = host raggiungibile */
    };
    x.onerror = function () { cb(false); };
    x.ontimeout = function () { cb(false); };
    x.send();
  }

  function invidRefresh(force, cb) {
    if (invidChecking) { if (cb) setTimeout(function () { cb(invidBase); }, 200); return; }
    if (!force && invidBase && invidChecked && (Date.now() - invidChecked) < PIPED_TTL) {
      if (cb) cb(invidBase); return;
    }
    var cached = invidLoadCache();
    if (!force && cached && !invidBase) { invidBase = cached; invidChecked = Date.now(); if (cb) cb(invidBase); return; }
    invidChecking = true;
    /* c'è solitamente 1 sola istanza viva: prova prima la cache/fallback noti */
    var pool = INVID_POOL;
    var alive = [];
    var pending = pool.length;
    if (!pending) { invidChecking = false; if (cb) cb(''); return; }
    for (var i = 0; i < pool.length; i++) {
      (function (base) {
        invidProbe(base, function (ok) {
          if (ok && alive.indexOf(base) === -1) alive.push(base);
          pending--;
          if (pending === 0) {
            invidChecking = false;
            invidChecked = Date.now();
            invidBase = alive.length ? alive[0] : (cached || '');
            if (invidBase) invidSave(invidBase);
            if (cb) cb(invidBase);
          }
        });
      })(pool[i]);
    }
  }

  function pipedLoadCache() {
    try {
      var j = JSON.parse(window.localStorage.getItem(PIPED_KEY) || 'null');
      if (j && j.base && j.at && (Date.now() - j.at) < PIPED_TTL) return j.base;
    } catch (e) { /* ignora */ }
    return '';
  }
  function pipedSave(base) {
    try {
      window.localStorage.setItem(PIPED_KEY, JSON.stringify({ base: base, at: Date.now() }));
    } catch (e) { /* ignora */ }
  }

  function pipedProbe(base, cb) {
    var x = new XMLHttpRequest();
    x.open('GET', base + '/healthcheck', true);
    x.timeout = 9000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      /* 2xx/3xx = viva (3xx: redirect; l'API vera la verifica la richiesta) */
      cb(x.status >= 200 && x.status < 400);
    };
    x.onerror = function () { cb(false); };
    x.ontimeout = function () { cb(false); };
    x.send();
  }

  /* Fonti remote (browser-legibili via CORS) delle liste ufficiali delle
     istanze Piped. La pagina le scarica a RUNTIME e aggrega gli URL con il
     pool locale, così se una nuova istanza pubblica diventa disponibile la
     pagina la scopre da sola, senza dover aggiornare il codice.
       - TeamPiped/documentation (markdown, CORS *) — la lista ufficiale
       - api.github.com (JSON, CORS *) — stesso contenuto, formato diverso
     Il fetch fallisce senza conseguenze: si usa comunque PHP_POOL. */
  var PIPED_LIST_SOURCES = [
    'https://raw.githubusercontent.com/TeamPiped/documentation/main/content/docs/public-instances/index.md',
    'https://api.github.com/repos/TeamPiped/documentation/contents/content/docs/public-instances/index.md'
  ];

  /* estrae gli URL delle istanze Piped da markdown O json della API GitHub */
  function pipedUrlsFrom(body) {
    var out = [];
    var text = String(body == null ? '' : body);
    var m;
    var re = /https:\/\/[a-z0-9.-]*[:]?[a-z0-9.-]*piped[a-z0-9.-]*/gi;
    var seen = {};
    while ((m = re.exec(text)) !== null) {
      var u = m[0].replace(/\/+$/, '');
      if (/\s|['"]/.test(u)) continue;
      if (!seen[u]) { seen[u] = 1; out.push(u); }
    }
    return out;
  }

  function pipedFetchLists(cb) {
    var urls = [];
    var pending = PIPED_LIST_SOURCES.length;
    if (!pending) { cb([]); return; }
    PIPED_LIST_SOURCES.forEach(function (src) {
      var x = new XMLHttpRequest();
      x.open('GET', src, true);
      x.timeout = 10000;
      x.onreadystatechange = function () {
        if (x.readyState !== 4) return;
        if (x.status >= 200 && x.status < 300) {
          /* api.github.com restituisce l'html o {content}? per markdown textuale
             basta usare la risposta come stringa ed estrarre gli URL */
          var b = x.responseText || '';
          /* se api.github restituisce base64 (content), decodifica per cercare */
          var decoded = b;
          try {
            var j = JSON.parse(b);
            if (j && typeof j.content === 'string') {
              decoded = decodeURIComponent(escape(atob(j.content.replace(/\s/g, ''))));
            }
          } catch (e) { /* non json: usa il body grezzo */ }
          urls = urls.concat(pipedUrlsFrom(decoded));
        }
        pending--;
        if (pending === 0) cb(urls);
      };
      x.onerror = function () { pending--; if (pending === 0) cb(urls); };
      x.ontimeout = function () { pending--; if (pending === 0) cb(urls); };
      x.send();
    });
  }

  /* pool finale: hardcoded + quelli dalle liste remote, deduplicato e con
     l'hardcoded in testa (per ordinamento prevedibile) */
  function pipedFullPool(listUrls) {
    var out = [];
    var seen = {};
    function add(u) {
      u = String(u || '').replace(/\/+$/, '').replace(/^http:\/\//, 'https://');
      if (!u || seen[u] || !/^https:\/\//.test(u)) return;
      seen[u] = 1;
      out.push(u);
    }
    PIPED_POOL.forEach(add);
    (listUrls || []).forEach(add);
    return out;
  }

  function pipedRefresh(force, cb) {
    if (pipedChecking) {
      if (cb) setTimeout(function () { cb(pipedBase); }, 300);
      return;
    }
    if (!force && pipedBase && pipedChecked && (Date.now() - pipedChecked) < PIPED_TTL) {
      if (cb) cb(pipedBase);
      return;
    }
    var cached = pipedLoadCache();
    if (!force && cached && !pipedBase) { pipedBase = cached; pipedChecked = Date.now(); if (cb) cb(pipedBase); return; }
    pipedChecking = true;
    pipedFetchLists(function (listUrls) {
      var pool = pipedFullPool(listUrls);
      var alive = [];
      var pending = pool.length;
      if (!pending) {
        pipedChecking = false;
        pipedBase = PIPED_FALLBACK;
        pipedChecked = Date.now();
        if (cb) cb(pipedBase);
        return;
      }
      for (var i = 0; i < pool.length; i++) {
        (function (base) {
          pipedProbe(base, function (ok) {
            if (ok && alive.indexOf(base) === -1) alive.push(base);
            pending--;
            if (pending === 0) {
              pipedChecking = false;
              pipedChecked = Date.now();
              /* se il health check non trova nulla, ripiega sull'istanza nota
                 (ultima risorsa): alcune istanze mentono o rispondono solo su
                 certe rotte, meglio provare che dichiarare tutto morto */
              pipedBase = alive.length ? alive[0] : PIPED_FALLBACK;
              if (pipedBase) pipedSave(pipedBase);
              if (typeof window.__ytdOnPiped === 'function') window.__ytdOnPiped(pipedBase);
              if (cb) cb(pipedBase);
            }
          });
        })(pool[i]);
      }
    });
  }

  /* istanza viva non ancora provata in questo giro; se il health check non
     trova nulla, usa l'istanza di fallback (così si tenta sempre almeno una
     rotta prima di dire "nessuna api"). */
  function ensureBase(tried, cb) {
    var skip = function (u) { return u && (!tried || tried.indexOf(u) === -1); };
    pipedRefresh(false, function (base) {
      if (skip(base)) { cb(base); return; }
      pipedRefresh(true, function (base2) {
        if (skip(base2)) { cb(base2); return; }
        /* ultima risorsa: prova il fallback, anche se non ha passato il check */
        if (skip(PIPED_FALLBACK)) { cb(PIPED_FALLBACK); return; }
        /* l'ultima istanza che ha funzionato (memoria) come disperata */
        var cached = pipedLoadCache();
        if (skip(cached)) { cb(cached); return; }
        cb('');
      });
    });
  }

  function xhrPipedJson(url, ok, err) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.timeout = 15000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status >= 200 && x.status < 300) {
        var data = null;
        try { data = JSON.parse(x.responseText); } catch (e) { err('invalid response'); return; }
        /* le API Piped restituiscono {error: "..."} con HTTP 200 per i
           fallimenti applicativi (es. blocco anti-bot di YouTube) */
        if (data && data.error) { err(String(data.error)); return; }
        ok(data);
      } else {
        err('errore ' + x.status);
      }
    };
    x.onerror = function () { err('network error'); };
    x.ontimeout = function () { err('network error'); };
    x.send();
  }

  /* ripulisce il messaggio di errore di Piped (traceback Java multi-riga) */
  function pipedErrMsg(raw) {
    var s = String(raw == null ? '' : raw);
    s = s.split('\n')[0];
    if (s.length > 160) s = s.slice(0, 160);
    return s;
  }

  function pipedGet(path, ok, err, maxAttempts) {
    var maxA = maxAttempts || 5;
    var tried = [];
    var rounds = 0;
    (function go() {
      ensureBase(tried, function (base) {
        if (!base) {
          /* nessuna istanza viva: prima di arrenderti, ripeti un altro giro
             (in rete le cose cambiano in pochi secondi) e poi solo se ancora
             nulla dichiara "nessuna api" */
          rounds++;
          if (rounds < 2) { setTimeout(go, 1500); return; }
          err(t('piped-none'));
          return;
        }
        tried.push(base);
        xhrPipedJson(base + path,
          function (data) { ok(data); },
          function (msg) {
            /* istanza giù o bloccata: riprova (un'altra istanza può essere
               viva, o YouTube può aver sbloccato) con attesa crescente */
            if (tried.length < maxA && shouldRetry(msg)) {
              setTimeout(go, 1200 * tried.length);
            } else {
              err(msg);
            }
          });
      });
    })();
  }

  function retrySeconds(msg) {
    var m = /^RETRY_AFTER_(\d+)$/.exec(String(msg));
    return m ? parseInt(m[1], 10) : 0;
  }

  function friendlyMsg(raw) {
    var s = String(raw == null ? '' : raw);
    if (s === 'interrotto') return t('interrupted');
    if (retrySeconds(s)) return t('bot-blocked');
    if (/not a bot|bot|LOGIN_REQUIRED|sign in|confirm you/i.test(s)) return t('bot-blocked');
    if (/youtube http 403|youtube http 429|errore 403|errore 429/.test(s)) return tF('youtube-refused-status', '403/429');
    if (/403|429|400/.test(s)) return t('youtube-refused');
    return s;
  }

  /* ---------- mapping dei dati Piped ---------- */

  function vidFromUrl(u) {
    var m = String(u || '').match(/[?&]v=([\w-]{6,20})/);
    return m ? m[1] : '';
  }

  function fmtViews(n) {
    n = parseInt(n, 10) || 0;
    if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  /* normalizza un item di ricerca/playlist di Piped nel modello della pagina */
  function pipedItem(it) {
    var id = vidFromUrl(it.url);
    return {
      id: id,
      title: it.title || '',
      author: it.uploaderName || '',
      duration: fmtDur(it.duration),
      views: fmtViews(it.views),
      thumb: it.thumbnail || thumbFor(id)
    };
  }

  function pipedSearch(q, ok, err) {
    pipedGet('/search?q=' + encodeURIComponent(q) + '&filter=all', function (data) {
      var items = (data && data.items) || [];
      var out = [];
      for (var i = 0; i < items.length; i++) out.push(pipedItem(items[i]));
      ok(out);
    }, err, 4);
  }

  /* un singolo stream Piped -> formato della pagina */
  function fmtFromStream(s, isAudio) {
    var q = String(s.quality || '');
    var height = parseInt(String(q).match(/(\d+)/), 10) || 0;
    var kbps = Math.round((s.bitrate || 0) / 1000);
    var label;
    if (isAudio) {
      label = kbps > 0 ? kbps + ' kbps' : (q || 'audio');
    } else {
      label = height > 0 ? (q.indexOf('60') !== -1 ? height + 'p60' : height + 'p') : (q || 'video');
    }
    return {
      itag: String(s.itag),
      label: label,
      mime: s.mimeType || '',
      size: (s.contentLength && s.contentLength > 0) ? s.contentLength : 0,
      url: s.url || '',
      height: height,
      kbps: kbps
    };
  }

  function byHeight(x, y) { return y.height - x.height; }
  function byKbps(x, y) { return y.kbps - x.kbps; }

  /* /streams/{id} -> { info, audio, progressive, video } */
  function pipedFormats(id, ok, err) {
    pipedGet('/streams/' + encodeURIComponent(id), function (data) {
      var audio = [], progressive = [], video = [];
      var a = data.audioStreams || [];
      for (var i = 0; i < a.length; i++) if (a[i].url) audio.push(fmtFromStream(a[i], true));
      var vs = data.videoStreams || [];
      for (var j = 0; j < vs.length; j++) {
        var s = vs[j];
        if (!s.url || s.itag < 0) continue;             /* LBRY: non YouTube */
        if (s.videoOnly) video.push(fmtFromStream(s, false));
        else progressive.push(fmtFromStream(s, false));
      }
      var prog = data.video || [];
      for (var k = 0; k < prog.length; k++) if (prog[k].url) progressive.push(fmtFromStream(prog[k], false));
      audio.sort(byKbps);
      progressive.sort(byHeight);
      video.sort(byHeight);
      ok({
        info: {
          id: id,
          title: data.title || '',
          author: data.uploader || '',
          seconds: data.duration || 0,
          thumb: data.thumbnailUrl || thumbFor(id)
        },
        audio: audio,
        progressive: progressive,
        video: video
      });
    }, err, 5);
  }

  /* migliore stream per anteprima/zip: audio-only, altrimenti muxed, altrimenti video */
  function pickStream(fmts) {
    if (fmts.audio.length) return fmts.audio[0];
    if (fmts.progressive.length) return fmts.progressive[0];
    if (fmts.video.length) return fmts.video[0];
    return null;
  }

  /* ---------- dispatch: Piped prima, poi Invidious ----------
     Ogni operazione prova il backend Piped; se TUTTO Piped fallisce (nessuna
     istanza viva o tutte bloccate), pirotta su Invidious. Così la pagina ha
     due famiglie di API e passa da una all'altra in automatico. */

  function runChain(ops, ok, err) {
    var i = 0;
    (function next(lastMsg) {
      if (i >= ops.length) { err(lastMsg || t('piped-none')); return; }
      ops[i++](function (val) { ok(val); }, function (msg) { next(msg); });
    })();
  }

  function ytSearch(q, ok, err) {
    runChain([
      function (o, e) { pipedSearch(q, o, e); },
      function (o, e) { invidSearch(q, o, e); }
    ], ok, err);
  }
  function ytFormats(id, ok, err) {
    runChain([
      function (o, e) { pipedFormats(id, o, e); },
      function (o, e) { invidFormats(id, o, e); }
    ], ok, err);
  }
  function ytPlaylist(list, ok, err) {
    runChain([
      function (o, e) { pipedPlaylist(list, o, e); },
      function (o, e) { invidPlaylist(list, o, e); }
    ], ok, err);
  }

  function pipedPlaylist(list, ok, err) {
    var tries = 0;
    (function go() {
      pipedGet('/playlists/' + encodeURIComponent(list), function (data) {
        var items = (data && data.relatedStreams) || [];
        /* il blocco anti-bot di YouTube è intermittente: una playlist
           vuota con nome presente = estrazione fallita, riprova una volta */
        if (!items.length && data && data.name && tries < 1) {
          tries++;
          setTimeout(go, 2000);
          return;
        }
        var out = [];
        for (var i = 0; i < items.length; i++) out.push(pipedItem(items[i]));
        ok({ name: (data && data.name) || '', items: out });
      }, err, 3);
    })();
  }

  /* ---------- mapping dei dati Invidious (backend di riserva) ---------- */

  /* normalizza un item di ricerca/playlist di Invidious nel modello della pagina */
  function invidItem(it) {
    var thumbs = (it && it.videoThumbnails) || [];
    var t = '';
    for (var i = 0; i < thumbs.length; i++) if (thumbs[i] && thumbs[i].url) { t = thumbs[i].url; break; }
    return {
      id: it.videoId || '',
      title: it.title || '',
      author: it.author || '',
      duration: fmtDur(it.lengthSeconds),
      views: fmtViews(it.viewCount),
      thumb: t || thumbFor(it.videoId)
    };
  }

  /* formato Invidious (adaptive/formatStreams) -> formato della pagina */
  function invidFmt(s, isAudio) {
    var q = String(s.quality || '');
    var height = parseInt(String(q).match(/(\d+)/), 10) || 0;
    var bitrate = parseInt(s.bitrate, 10) || 0;
    var kbps = Math.round(bitrate / 1000) || 0;
    var label;
    if (isAudio) label = kbps > 0 ? kbps + ' kbps' : (q || 'audio');
    else label = height > 0 ? (q.indexOf('60') !== -1 ? height + 'p60' : height + 'p') : (q || 'video');
    return {
      itag: String(s.itag),
      label: label,
      mime: s.type || '',
      size: 0,
      url: s.url || '',
      height: height,
      kbps: kbps
    };
  }

  function invidGet(path, ok, err, maxAttempts) {
    var maxA = maxAttempts || 3;
    invidRefresh(false, function (base) {
      if (!base) { err(t('piped-none')); return; }
      var attempts = 0;
      (function go() {
        attempts++;
        var x = new XMLHttpRequest();
        x.open('GET', base + path, true);
        x.timeout = 15000;
        x.onreadystatechange = function () {
          if (x.readyState !== 4) return;
          if (x.status >= 200 && x.status < 300) {
            var data = null;
            try { data = JSON.parse(x.responseText); } catch (e) { err('invalid response'); return; }
            if (data && data.error && !Array.isArray(data)) { err(String(data.error)); return; }
            ok(data);
          } else {
            var msg = (x.status === 0) ? 'network error' : 'errore ' + x.status;
            if (attempts < maxA && shouldRetry(msg)) {
              setTimeout(go, 1500 * attempts);
            } else err(msg);
          }
        };
        x.onerror = function () {
          if (attempts < maxA) setTimeout(go, 1500 * attempts); else err('network error');
        };
        x.send();
      })();
    });
  }

  function invidSearch(q, ok, err) {
    invidGet('/api/v1/search?q=' + encodeURIComponent(q), function (arr) {
      var out = [];
      var src = (arr && arr.length) ? arr : [];
      for (var i = 0; i < src.length; i++) {
        if (!src[i] || src[i].type !== 'video') continue;
        var it = invidItem(src[i]);
        if (it.id) out.push(it);
      }
      ok(out);
    }, err, 3);
  }

  function invidFormats(id, ok, err) {
    invidGet('/api/v1/videos/' + encodeURIComponent(id), function (data) {
      var audio = [], progressive = [], video = [];
      var ad = data.adaptiveFormats || [];
      for (var i = 0; i < ad.length; i++) {
        var s = ad[i];
        if (!s || !s.url) continue;
        var isAudio = /^audio\//.test(String(s.type || ''));
        var f = invidFmt(s, isAudio);
        if (isAudio && !f.kbps) f.label = s.audioQuality || 'audio';
        if (isAudio) audio.push(f);
        else video.push(f);
      }
      var fs = data.formatStreams || [];
      for (var j = 0; j < fs.length; j++) if (fs[j] && fs[j].url) progressive.push(invidFmt(fs[j], false));
      audio.sort(byKbps);
      progressive.sort(byHeight);
      video.sort(byHeight);
      ok({
        info: {
          id: id,
          title: data.title || '',
          author: data.author || '',
          seconds: data.lengthSeconds || 0,
          thumb: data.thumbnailUrl || thumbFor(id)
        },
        audio: audio, progressive: progressive, video: video
      });
    }, err, 4);
  }

  function invidPlaylist(list, ok, err) {
    invidGet('/api/v1/playlists/' + encodeURIComponent(list), function (data) {
      var items = (data && data.videos) || [];
      var out = [];
      for (var i = 0; i < items.length; i++) {
        var it = invidItem(items[i]);
        if (it.id) out.push(it);
      }
      ok({ name: (data && data.title) || '', items: out });
    }, err, 3);
  }

  /* scarica i byte di uno stream (URL diretto Piped/Invidious, CORS permissivo) */
  function xhrBlobUrl(url, ok, err, onProgress) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.responseType = 'blob';
    if (onProgress) x.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded, e.total); };
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status >= 200 && x.status < 300 && x.response) { ok(x.response); return; }
      if (x.status === 0) { err('interrotto'); return; }
      err('errore ' + x.status);
    };
    x.onerror = function () { err('network error'); };
    x.send();
  }

  function renderPipedStatus() {
    var el = $('piped-status');
    if (!el) return;
    if (pipedBase) {
      var host = pipedBase.replace(/^https?:\/\//, '').split('/')[0];
      var extra = (invidBase && invidBase !== pipedBase) ? ' \u00B7 +Invidious' : '';
      el.textContent = t('piped-label') + ' \u00B7 ' + host + extra;
    } else {
      el.textContent = t('piped-checking');
    }
  }

  /* ---------- stato ---------- */

  function setStatus(panelId, msg, isError) {
    var el = $(panelId);
    if (!el) return;
    el.innerHTML = esc(msg);
    el.hidden = false;
    if (isError) addClass(el, 'is-error'); else removeClass(el, 'is-error');
  }
  function clearStatus(panelId) {
    var el = $(panelId);
    if (el) { el.hidden = true; el.innerHTML = ''; removeClass(el, 'is-error'); }
  }

  /* ---------- tabs ---------- */

  function bindTabs() {
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (tab) {
        tab.addEventListener('click', function () {
          for (var j = 0; j < tabs.length; j++) removeClass(tabs[j], 'is-active');
          addClass(tab, 'is-active');
          var name = tab.getAttribute('data-tab');
          $('panel-search').hidden = (name !== 'search');
          $('panel-link').hidden = (name !== 'link');
        });
      })(tabs[i]);
    }
  }

  /* ---------- risultati: riga ---------- */

  function buildRow(item, statusId) {
    var li = document.createElement('li');
    li.className = 'row';

    /* selezione multipla per lo zip */
    var check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'sel-check';
    check.setAttribute('data-id', item.id);
    check.setAttribute('aria-label', t('zip-select'));
    check.addEventListener('change', function () {
      if (check.checked) selAdd(item); else selRemove(item.id);
    });
    li.appendChild(check);

    var img = document.createElement('img');
    img.className = 'thumb';
    img.src = thumbFor(item.id);
    img.alt = '';
    li.appendChild(img);

    var actions = document.createElement('div');
    actions.className = 'actions';

    var playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'btn btn-play';
    playBtn.textContent = '\u25B6';
    playBtn.setAttribute('aria-label', t('preview-audio'));
    actions.appendChild(playBtn);

    var dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'btn btn-dl';
    dlBtn.textContent = t('download');
    actions.appendChild(dlBtn);

    li.appendChild(actions);

    var meta = document.createElement('div');
    meta.className = 'meta';
    var titleEl = document.createElement('div');
    titleEl.className = 't-title';
    titleEl.textContent = item.title || '';
    meta.appendChild(titleEl);
    var sub = document.createElement('div');
    sub.className = 't-sub';
    var bits = [];
    if (item.author) bits.push(item.author);
    if (item.duration) bits.push(item.duration);
    if (item.views) bits.push(item.views);
    if (!bits.length) bits.push(item.id);
    sub.textContent = bits.join(' \u00B7 ');
    meta.appendChild(sub);
    li.appendChild(meta);

    bindPlay(playBtn, li, item, statusId);
    bindDownload(li, dlBtn, item, t('download'), statusId);

    /* sincronizza lo stato della checkbox con la selezione corrente */
    check.checked = !!selMap[item.id];
    if (selMap[item.id]) addClass(li, 'is-sel');

    return li;
  }

  function bindPlay(btn, row, item, statusId) {
    btn.addEventListener('click', function () {
      var preview = row.querySelector('.preview');
      if (preview) {
        row.removeChild(preview);
        btn.textContent = '\u25B6';
        return;
      }
      var p = document.createElement('div');
      p.className = 'preview';
      var audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'none';
      p.appendChild(audio);
      row.appendChild(p);
      btn.textContent = '\u25A0';
      setStatus(statusId || 'search-status', t('loading-stream'), false);
      ytFormats(item.id,
        function (fmts) {
          clearStatus(statusId || 'search-status');
          var fmt = pickStream(fmts);
          if (!fmt) { setStatus(statusId || 'search-status', t('zip-unavailable'), true); return; }
          audio.src = fmt.url;
          try { audio.play(); } catch (e) { /* browser vecchi: l'utente preme play */ }
        },
        function (msg) {
          setStatus(statusId || 'search-status', tF('formats-err', friendlyMsg(pipedErrMsg(msg))), true);
        });
    });
  }

  /* "Scarica" apre un picker (audio/video, qualita') e poi avvia il download */
  function bindDownload(container, btn, item, label, statusId, cachedFmts) {
    btn.addEventListener('click', function () {
      if (btn.getAttribute('data-busy') === '1') return;
      btn.setAttribute('data-busy', '1');
      btn.textContent = '\u2026';
      function got(fmts) {
        btn.removeAttribute('data-busy');
        btn.textContent = label;
        buildPicker(container, item, fmts, label, statusId);
      }
      if (cachedFmts) { got(cachedFmts); return; }
      ytFormats(item.id,
        got,
        function (msg) {
          btn.removeAttribute('data-busy');
          btn.textContent = t('error');
          setStatus(statusId || 'search-status', tF('formats-err', friendlyMsg(pipedErrMsg(msg))), true);
          setTimeout(function () { btn.textContent = label; }, 2200);
        });
    });
  }

  /* costruisce il selettore qualità inline (audio / video) */
  function buildPicker(container, item, fmts, label, statusId) {
    var old = container.querySelector('.picker');
    if (old) container.removeChild(old);

    var picker = document.createElement('div');
    picker.className = 'picker';

    var sel = document.createElement('select');
    sel.className = 'picker-select';
    sel.setAttribute('aria-label', t('quality'));

    function addGroup(title, list) {
      if (!list || !list.length) return;
      var g = document.createElement('optgroup');
      g.label = title;
      for (var i = 0; i < list.length; i++) {
        var o = document.createElement('option');
        o.value = String(list[i].itag);
        o.textContent = list[i].label + (list[i].size ? ' \u00B7 ' + fmtBytes(list[i].size) : '');
        o.setAttribute('data-fmt', JSON.stringify({
          url: list[i].url,
          mime: list[i].mime || '',
          ext: extForMime(list[i].mime || '')
        }));
        g.appendChild(o);
      }
      sel.appendChild(g);
    }
    addGroup(t('group-audio'), fmts.audio);
    addGroup(t('group-video-mixed'), fmts.progressive);
    addGroup(t('group-video-only'), fmts.video);

    var go = document.createElement('button');
    go.type = 'button';
    go.className = 'btn btn-dl';
    go.textContent = t('download');

    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn';
    cancel.textContent = '✕';
    cancel.setAttribute('aria-label', t('cancel'));

    picker.appendChild(sel);
    picker.appendChild(go);
    picker.appendChild(cancel);
    container.appendChild(picker);

    function close() { if (picker.parentNode) picker.parentNode.removeChild(picker); }
    cancel.addEventListener('click', close);

    go.addEventListener('click', function () {
      var opt = sel.options[sel.selectedIndex];
      var fmt = null;
      try { fmt = JSON.parse(opt.getAttribute('data-fmt') || 'null'); } catch (e) { /* ignora */ }
      if (!fmt || !fmt.url) return;
      close();
      startDownload(item, fmt, label, statusId, container);
    });
  }

  /* avvia il download di un singolo formato (URL diretto Piped); mostra una
     barra di progresso nel container (il pulsante del picker viene rimosso
     dal DOM quando il picker si chiude, quindi la % sul pulsante non
     sarebbe visibile). */
  function startDownload(item, fmt, label, statusId, container) {
    var title = item.title || item.id;
    if (!fmt || !fmt.url) {
      setStatus(statusId || 'search-status', tF('download-err', t('zip-unavailable')), true);
      return;
    }
    var ext = fmt.ext || extForMime(fmt.mime || '');
    var bar = attachProgress(container);
    xhrBlobUrl(fmt.url,
      function (blob) {
        saveBlob(blob, sanitizeTitle(title) + '.' + ext, statusId);
        bar.done();
      },
      function (msg) {
        setStatus(statusId || 'search-status', tF('download-err', friendlyMsg(pipedErrMsg(msg))), true);
        bar.done();
      },
      function (loaded, total) { if (total) setBar(bar.el, loaded / total); });
  }

  function sanitizeTitle(t) {
    t = String(t || 'audio')
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .slice(0, 90);
    return t || 'audio';
  }

  function shouldRetry(msg) {
    return /bot|sign in|blocked|bloccato|blocco|rifiutato|403|429|500|502|503|network error|errore di rete|invalid response/i.test(String(msg));
  }

  /* esegue exec(ok, err) con retry aggressivo e backoff esponenziale:
     l'anti-bot di YouTube e' intermittente, un nuovo tentativo ha buona
     probabilita' di passare (visitorData fresco, altra istanza del worker). */
  function retryCall(exec, onOk, onErr, maxAttempts, delayMs) {
    var attempts = 0;
    (function go() {
      attempts++;
      exec(function (val) { onOk(val); },
        function (msg) {
          /* "bloccato, riprova tra Ns": non consumare tentativi con attese
             corte inutili; il chiamante (auto-retry) aspetta l'attesa giusta */
          if (retrySeconds(msg)) { onErr(msg); return; }
          if (attempts < maxAttempts && shouldRetry(msg)) {
            setTimeout(go, Math.min(delayMs * Math.pow(2, attempts - 1), 20000));
          } else { onErr(msg); }
        });
    })();
  }

  /* Download audio (usato da "Scarica tutte"): itag opzionale, ext = estensione */
  function fetchAudio(item, itag, ext, onProgress, onDone, onErr) {
    var title = item.title || item.id;
    ytFormats(item.id,
      function (fmts) {
        var fmt = null;
        if (itag) {
          for (var i = 0; i < fmts.audio.length; i++) if (fmts.audio[i].itag === itag) { fmt = fmts.audio[i]; break; }
          if (!fmt) for (var j = 0; j < fmts.progressive.length; j++) if (fmts.progressive[j].itag === itag) { fmt = fmts.progressive[j]; break; }
        }
        if (!fmt) fmt = pickStream(fmts);
        if (!fmt) { onErr(t('zip-unavailable')); return; }
        var e = ext || extForMime(fmt.mime || '');
        xhrBlobUrl(fmt.url,
          function (blob) { onDone(blob, sanitizeTitle(title) + '.' + e); },
          function (msg) { onErr(friendlyMsg(pipedErrMsg(msg))); },
          onProgress);
      },
      function (msg) { onErr(friendlyMsg(pipedErrMsg(msg))); });
  }

  function saveBlob(blob, name, statusId) {
    var U = window.URL || window.webkitURL;
    if (!U || !U.createObjectURL) {
      setStatus(statusId || 'search-status', t('no-save-support'), true);
      return;
    }
    var url = U.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      U.revokeObjectURL(url);
    }, 1500);
  }

  /* ---------- barra di progresso ---------- */

  function setBar(el, frac) {
    if (!el) return;
    frac = Math.max(0, Math.min(1, frac || 0));
    el.style.width = Math.round(frac * 100) + '%';
  }

  /* crea una barra di progresso dentro container; ritorna {el, done}
     (done() la rimuove dal DOM) */
  function attachProgress(container) {
    var bar = document.createElement('div');
    bar.className = 'progress';
    var inner = document.createElement('div');
    inner.className = 'progress-bar';
    bar.appendChild(inner);
    if (container) container.appendChild(bar);
    return {
      el: inner,
      done: function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }
    };
  }

  /* ---------- selezione multipla + zip ---------- */

  // Selezioni persistenti tra le ricerche: l'utente spunta le canzoni e le
  // scarica tutte in un unico .zip (costruito nel browser, metodo "store":
  // gli audio sono gia' compressi, non serve comprimere il contenitore).
  var selOrder = [];
  var selMap = {};

  function selAdd(item) {
    if (selMap[item.id]) return;
    selMap[item.id] = { id: item.id, title: item.title || '', author: item.author || '' };
    selOrder.push(item.id);
    renderSel();
  }
  function selRemove(id) {
    if (!selMap[id]) return;
    delete selMap[id];
    var i = selOrder.indexOf(id);
    if (i > -1) selOrder.splice(i, 1);
    renderSel();
  }
  function selClear() {
    selOrder = [];
    selMap = {};
    renderSel();
  }

  function renderSel() {
    var tray = $('sel-tray');
    var count = $('sel-count');
    var zipBtn = $('sel-zip');
    var zipBtnBusy = zipBtn && zipBtn.getAttribute('data-busy') === '1';
    if (!tray) return;
    tray.hidden = (selOrder.length === 0 && !zipBtnBusy);
    if (count) count.textContent = tF('sel-count', selOrder.length);
    // sincronizza le checkbox esistenti
    var boxes = document.querySelectorAll('.sel-check');
    for (var i = 0; i < boxes.length; i++) {
      var id = boxes[i].getAttribute('data-id');
      boxes[i].checked = !!selMap[id];
      var row = boxes[i].parentNode;
      if (selMap[id]) addClass(row, 'is-sel'); else removeClass(row, 'is-sel');
    }
  }

  function setSelStatus(msg, isError) {
    var el = $('sel-status');
    if (!el) return;
    el.textContent = msg || '';
    if (isError) addClass(el, 'is-error'); else removeClass(el, 'is-error');
  }

  /* ---------- zip (puro ES5, niente librerie) ---------- */

  var CRC_TABLE = null;
  function crcTable() {
    if (CRC_TABLE) return CRC_TABLE;
    CRC_TABLE = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      CRC_TABLE[n] = c >>> 0;
    }
    return CRC_TABLE;
  }
  function crc32(bytes) {
    var t = crcTable();
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length &&
               str.charCodeAt(i + 1) >= 0xDC00 && str.charCodeAt(i + 1) <= 0xDFFF) {
        var cp = 0x10000 + ((c - 0xD800) << 10) + (str.charCodeAt(i + 1) - 0xDC00);
        out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
        i++;
      } else if (c >= 0xD800 && c <= 0xDFFF) out.push(0xEF, 0xBF, 0xBD);
      else out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(out);
  }

  function arrBlob(view) {
    try { return new Blob([view]); }
    catch (e) { return new Blob([view.buffer]); }
  }

  function zipU16(arr, off, v) { arr[off] = v & 255; arr[off + 1] = (v >>> 8) & 255; }
  function zipU32(arr, off, v) {
    arr[off] = v & 255; arr[off + 1] = (v >>> 8) & 255;
    arr[off + 2] = (v >>> 16) & 255; arr[off + 3] = (v >>> 24) & 255;
  }

  // Costruisce uno zip "store" (senza compressione): header locale + dati +
  // directory centrale + end-of-central-directory, come da specifica PKZIP.
  function ZipBuilder() {
    this.parts = [];
    this.central = [];
    this.offset = 0;
    this.count = 0;
  }
  ZipBuilder.prototype.add = function (name, bytes) {
    var nameB = utf8Bytes(String(name));
    var crc = crc32(bytes);
    var now = new Date();
    var time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
    var date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
    var size = bytes.length;

    var lh = new Uint8Array(30 + nameB.length);
    zipU32(lh, 0, 0x04034B50);
    zipU16(lh, 4, 20);        // version needed (2.0)
    zipU16(lh, 6, 0x0800);    // flags: nomi UTF-8
    zipU16(lh, 8, 0);         // metodo: store
    zipU16(lh, 10, time);
    zipU16(lh, 12, date);
    zipU32(lh, 14, crc);
    zipU32(lh, 18, size);
    zipU32(lh, 22, size);
    zipU16(lh, 26, nameB.length);
    zipU16(lh, 28, 0);        // extra len
    lh.set(nameB, 30);

    this.parts.push(arrBlob(lh));
    this.parts.push(bytes instanceof Blob ? bytes : arrBlob(bytes));

    var ch = new Uint8Array(46 + nameB.length);
    zipU32(ch, 0, 0x02014B50);
    zipU16(ch, 4, 20);        // version made by
    zipU16(ch, 6, 20);        // version needed
    zipU16(ch, 8, 0x0800);
    zipU16(ch, 10, 0);
    zipU16(ch, 12, time);
    zipU16(ch, 14, date);
    zipU32(ch, 16, crc);
    zipU32(ch, 20, size);
    zipU32(ch, 24, size);
    zipU16(ch, 28, nameB.length);
    zipU16(ch, 30, 0);        // extra
    zipU16(ch, 32, 0);        // comment
    zipU16(ch, 34, 0);        // disk start
    zipU16(ch, 36, 0);        // internal attrs
    zipU32(ch, 38, 0);        // external attrs
    zipU32(ch, 42, this.offset);
    ch.set(nameB, 46);
    this.central.push(ch);

    this.offset += 30 + nameB.length + size;
    this.count++;
  };
  ZipBuilder.prototype.build = function () {
    var cdSize = 0;
    for (var i = 0; i < this.central.length; i++) cdSize += this.central[i].length;
    var eocd = new Uint8Array(22);
    zipU32(eocd, 0, 0x06054B50);
    zipU16(eocd, 4, 0);       // disk
    zipU16(eocd, 6, 0);       // cd start disk
    zipU16(eocd, 8, this.count);
    zipU16(eocd, 10, this.count);
    zipU32(eocd, 12, cdSize);
    zipU32(eocd, 16, this.offset);
    zipU16(eocd, 20, 0);      // comment len
    var parts = this.parts.slice();
    for (var j = 0; j < this.central.length; j++) parts.push(this.central[j]);
    parts.push(eocd);
    return new Blob(parts, { type: 'application/zip' });
  };

  function blobBytes(blob, cb) {
    if (typeof FileReader === 'undefined' || !blob) { cb(null); return; }
    var r = new FileReader();
    r.onload = function () { cb(new Uint8Array(r.result)); };
    r.onerror = function () { cb(null); };
    r.readAsArrayBuffer(blob);
  }

  /* scarica una canzone come bytes per lo zip: miglior stream disponibile
     (audio-only se c'è, altrimenti muxed), estensione dal Content-Type. */
  function fetchZipItem(item, ok, err, onProgress) {
    ytFormats(item.id,
      function (fmts) {
        var fmt = pickStream(fmts);
        if (!fmt) { err(t('zip-unavailable')); return; }
        xhrBlobUrl(fmt.url,
          function (blob) {
            blobBytes(blob, function (bytes) {
              if (!bytes || !bytes.length) { err(t('zip-unavailable')); return; }
              var mime = blob.type || fmt.mime || 'video/mp4';
              ok(sanitizeTitle(item.title || item.id) + '.' + extForMime(mime), bytes);
            });
          },
          function (msg) { err(friendlyMsg(pipedErrMsg(msg))); },
          onProgress);
      },
      function (msg) { err(friendlyMsg(pipedErrMsg(msg))); });
  }

  function downloadZip(zipBtn) {
    if (zipBtn.getAttribute('data-busy') === '1') return;
    if (!selOrder.length) return;
    zipBtn.setAttribute('data-busy', '1');
    addClass(zipBtn, 'is-busy');
    zipBtn.textContent = '0/' + selOrder.length;
    var items = selOrder.map(function (id) { return selMap[id]; });
    var failures = 0;
    var lastMsg = null;
    var zip = new ZipBuilder();
    var i = 0;
    var barWrap = $('sel-progress');
    var barEl = $('sel-progress-bar');
    if (barWrap) barWrap.hidden = false;
    setBar(barEl, 0);
    (function next() {
      if (i >= items.length) {
        var done = items.length - failures;
        if (done) {
          setBar(barEl, 1);
          var zipName = 'ytd-' + new Date().toISOString().slice(0, 10) + '.zip';
          saveBlob(zip.build(), zipName, null);
          setSelStatus(tF('zip-done', done) + (failures ? tF('zip-some-failed', failures) : ''));
          setTimeout(function () { if (barWrap) barWrap.hidden = true; setBar(barEl, 0); }, 1500);
        } else {
          if (barWrap) barWrap.hidden = true;
          setBar(barEl, 0);
          setSelStatus(tF('zip-err', lastMsg || t('zip-unavailable')), true);
        }
        zipBtn.removeAttribute('data-busy');
        removeClass(zipBtn, 'is-busy');
        zipBtn.textContent = t('zip-download');
        renderSel();
        setTimeout(function () { setSelStatus(''); }, 6000);
        return;
      }
      var item = items[i];
      zipBtn.textContent = (i + 1) + '/' + items.length;
      setSelStatus(tF('zip-progress', i + 1, items.length, item.title));
      setBar(barEl, i / items.length);
      fetchZipItem(item,
        function (name, bytes) { zip.add(name, bytes); i++; next(); },
        function (msg) { lastMsg = msg; failures++; i++; next(); },
        function (loaded, total) {
          if (total) setBar(barEl, (i + loaded / total) / items.length);
        });
    })();
  }

  function bindSelTray() {
    var zipBtn = $('sel-zip');
    var clearBtn = $('sel-clear');
    if (zipBtn) zipBtn.addEventListener('click', function () { downloadZip(zipBtn); });
    if (clearBtn) clearBtn.addEventListener('click', selClear);
    renderSel();
  }

  /* ---------- ricerca ---------- */

  function doSearch(q) {
    clearStatus('search-status');
    var list = $('search-results');
    list.innerHTML = '';
    setStatus('search-status', t('searching'));
    ytSearch(q,
      function (results) {
        clearStatus('search-status');
        if (!results.length) { setStatus('search-status', tF('no-results', q), true); return; }
        for (var i = 0; i < results.length; i++) list.appendChild(buildRow(results[i], 'search-status'));
      },
      function (msg) { setStatus('search-status', tF('search-err', friendlyMsg(pipedErrMsg(msg))), true); });
  }

  /* ---------- link incollato ---------- */

  function parseYtUrl(raw) {
    var u = String(raw || '').trim();
    if (!u) return null;
    var vid = null, list = null, m;
    m = u.match(/[?&]list=([\w-]+)/);
    if (m) list = m[1];
    m = u.match(/[?&]v=([\w-]{6,20})/);
    if (m) vid = m[1];
    if (!vid) { m = u.match(/youtu\.be\/([\w-]{6,20})/); if (m) vid = m[1]; }
    if (!vid && !list) return null;
    return { vid: vid, list: list };
  }

  function buildCard(cover, title, sub, actionsHtml, extra) {
    var card = document.createElement('div');
    card.className = 'card';
    var img = document.createElement('img');
    img.className = 'card-cover';
    img.src = cover;
    img.alt = '';
    card.appendChild(img);
    var body = document.createElement('div');
    body.className = 'card-body';
    var titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = title || '';
    body.appendChild(titleEl);
    var s = document.createElement('div');
    s.className = 'card-sub';
    s.textContent = sub || '';
    body.appendChild(s);
    if (actionsHtml) {
      var a = document.createElement('div');
      a.className = 'card-actions';
      a.innerHTML = actionsHtml;
      body.appendChild(a);
    }
    card.appendChild(body);
    if (extra) card.appendChild(extra);
    return card;
  }

  function doLink(raw) {
    clearStatus('link-status');
    var box = $('link-preview');
    var tracks = $('link-tracks');
    box.innerHTML = '';
    tracks.innerHTML = '';

    var parsed = parseYtUrl(raw);
    if (!parsed) { setStatus('link-status', t('link-unrecognized'), true); return; }

    if (parsed.list) {
      openPlaylist(parsed.list);
    } else if (parsed.vid) {
      openVideo(parsed.vid);
    }
  }

  function openVideo(vid) {
    var box = $('link-preview');
    var card = buildCard(thumbFor(vid), '\u2026', '\u2026', '', null);
    box.appendChild(card);
    var actions = document.createElement('div');
    actions.className = 'card-actions';
    card.querySelector('.card-body').appendChild(actions);
    var previewWrap = document.createElement('div');
    previewWrap.className = 'card-preview';
    card.appendChild(previewWrap);

    setStatus('link-status', t('loading-info'), false);
    ytFormats(vid,
      function (fmts) {
        clearStatus('link-status');
        var info = fmts.info;
        card.querySelector('.card-title').textContent = info.title || '\u2026';
        var subEl = card.querySelector('.card-sub');
        var bits = [];
        if (info.author) bits.push(info.author);
        if (info.seconds) bits.push(fmtDur(info.seconds));
        subEl.textContent = bits.join(' \u00B7 ') || '\u2026';
        if (info.thumb && info.thumb !== thumbFor(vid)) card.querySelector('.card-cover').src = info.thumb;

        var fmt = pickStream(fmts);

        /* anteprima audio */
        var play = document.createElement('button');
        play.type = 'button';
        play.className = 'btn btn-play';
        play.textContent = '\u25B6';
        play.setAttribute('aria-label', t('preview-audio'));
        actions.appendChild(play);
        if (fmt) {
          play.addEventListener('click', function () {
            if (previewWrap.innerHTML) {
              previewWrap.innerHTML = '';
              play.textContent = '\u25B6';
              return;
            }
            var audio = document.createElement('audio');
            audio.controls = true;
            audio.preload = 'none';
            audio.src = fmt.url;
            previewWrap.appendChild(audio);
            play.textContent = '\u25A0';
            try { audio.play(); } catch (e) { /* ok */ }
          });
        } else {
          play.disabled = true;
        }

        /* scarica (riusa i formati già estratti) */
        var dl = document.createElement('button');
        dl.type = 'button';
        dl.className = 'btn btn-primary btn-dl-main';
        actions.appendChild(dl);
        dl.textContent = t('download');
        var item = { id: vid, title: info.title || '', author: info.author || '' };
        bindDownload(card.querySelector('.card-body'), dl, item, t('download'), 'link-status', fmts);
      },
      function (msg) {
        setStatus('link-status', tF('formats-err', friendlyMsg(pipedErrMsg(msg))), true);
      });
  }

  function openPlaylist(list) {
    var box = $('link-preview');
    var card = buildCard(thumbFor(''), 'Playlist', '\u2026', '', null);
    box.appendChild(card);
    setStatus('link-status', t('loading-tracks'), false);
    ytPlaylist(list,
      function (data) {
        clearStatus('link-status');
        var items = data.items || [];
        if (!items.length) {
          setStatus('link-status', t('playlist-empty'), true);
          return;
        }
        if (data.name) card.querySelector('.card-title').textContent = data.name;
        var n = items.length;
        var subEl = card.querySelector('.card-sub');
        var bits = subEl.textContent ? [subEl.textContent] : [];
        bits.push(tF('tracks-count', n));
        subEl.textContent = bits.join(' \u00B7 ');
        var actions = document.createElement('div');
        actions.className = 'card-actions';
        var qsel = document.createElement('select');
        qsel.className = 'picker-select';
        qsel.setAttribute('aria-label', t('quality-audio'));
        var qopts = [
          ['140', 'm4a', t('opt-audio-rec')],
          ['251', 'webm', t('opt-audio-best')],
          ['139', 'm4a', t('opt-audio-light')]
        ];
        for (var qi = 0; qi < qopts.length; qi++) {
          var qo = document.createElement('option');
          qo.value = qopts[qi][0];
          qo.setAttribute('data-ext', qopts[qi][1]);
          qo.textContent = qopts[qi][2];
          qsel.appendChild(qo);
        }
        var all = document.createElement('button');
        all.type = 'button';
        all.className = 'btn btn-primary';
        all.textContent = t('download-all');
        actions.appendChild(qsel);
        actions.appendChild(all);
        card.querySelector('.card-body').appendChild(actions);
        downloadAll(all, items, qsel);

        var listEl = $('link-tracks');
        for (var i = 0; i < items.length; i++) listEl.appendChild(buildRow(items[i], 'link-status'));
      },
      function (msg) { setStatus('link-status', tF('playlist-err', friendlyMsg(pipedErrMsg(msg))), true); });
  }

  function downloadAll(btn, items, qsel) {
    var busy = false;
    btn.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      btn.setAttribute('data-busy', '1');
      var itag = null, ext = 'm4a';
      if (qsel) {
        var opt = qsel.options[qsel.selectedIndex];
        itag = opt.value;
        ext = opt.getAttribute('data-ext') || 'm4a';
      }
      btn.textContent = '0/' + items.length;
      var bar = attachProgress(btn.parentNode);
      var i = 0;
      (function next() {
        if (i >= items.length) {
          setBar(bar.el, 1);
          btn.textContent = t('done');
          setTimeout(function () { bar.done(); btn.removeAttribute('data-busy'); btn.textContent = t('download-all'); busy = false; }, 2500);
          return;
        }
        var item = items[i];
        btn.textContent = (i + 1) + '/' + items.length;
        setBar(bar.el, i / items.length);
        fetchAudio(item, itag, ext,
          function (loaded, total) { if (total) setBar(bar.el, (i + loaded / total) / items.length); },
          function (blob, name) { saveBlob(blob, name); i++; next(); },
          function () { i++; next(); });
      })();
    });
  }

  /* ---------- auto-update ---------- */

  // Quando il repo viene aggiornato (nuove funzioni/componenti), la pagina
  // si ricarica da sola per mostrare subito la versione nuova: il browser e
  // GitHub Pages fanno cache, quindi la versione e' scritta nei nomi delle
  // risorse (?v=...) e in version.txt. Se c'e' un download in corso, invece
  // di ricaricare mostra un banner "Ricarica" (cliccabile) per non perdere
  // il lavoro.
  var YTD_VER = (typeof window.YTD_VERSION === 'string' && window.YTD_VERSION && window.YTD_VERSION !== 'bootstrap')
    ? window.YTD_VERSION : null;
  var upBanner = null;

  function xhrText(url, ok) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status >= 200 && x.status < 300) ok(x.responseText || '');
    };
    x.onerror = function () { /* ignora: offline o Pages down */ };
    x.send();
  }

  function anyDownloadBusy() {
    var els = document.querySelectorAll('[data-busy="1"]');
    return els.length > 0;
  }

  function showUpdateBanner(v) {
    if (upBanner) return;
    upBanner = document.createElement('div');
    upBanner.className = 'up-banner';
    var txt = document.createElement('span');
    txt.textContent = tF('up-available', v);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = t('up-reload');
    btn.addEventListener('click', function () { location.reload(); });
    upBanner.appendChild(txt);
    upBanner.appendChild(btn);
    document.body.appendChild(upBanner);
  }

  function checkVersion() {
    if (!YTD_VER) return; // placeholder non sostituito da tools/bump.sh: nessuna auto-update
    xhrText('version.txt?t=' + Date.now(), function (txt) {
      var v = String(txt || '').replace(/^\s+|\s+$/g, '');
      if (!v || v === YTD_VER) return; // tutto aggiornato
      if (anyDownloadBusy()) { showUpdateBanner(v); return; }
      location.reload();
    });
  }

  function renderVersion() {
    var el = $('ft-version');
    if (el && YTD_VER) el.textContent = 'v' + YTD_VER;
  }

  /* hook minimo per test/debug */
  window.__ytdAutoUpdate = { checkVersion: checkVersion, busy: anyDownloadBusy, version: YTD_VER };
  window.__ytdPiped = {
    base: function () { return pipedBase; },
    refresh: function (cb) { pipedRefresh(true, cb); },
    pool: PIPED_POOL,
    extractUrls: function (body) { return pipedUrlsFrom(body); },
    lists: function (cb) { pipedFetchLists(cb); }
  };
  window.__ytdInvid = {
    base: function () { return invidBase; },
    refresh: function (force, cb) { invidRefresh(force, cb); },
    pool: INVID_POOL
  };

  /* ---------- init ---------- */

  function init() {
    bindLang();
    applyLang();
    bindTabs();
    bindSelTray();
    renderVersion();
    /* discovery delle istanze Piped pubbliche (health check sul pool) */
    window.__ytdOnPiped = function (u) { pipedBase = u; renderPipedStatus(); };
    pipedRefresh(false, function () { renderPipedStatus(); });
    setInterval(function () { pipedRefresh(false, function () { renderPipedStatus(); }); }, PIPED_TTL);
    /* discovery dell'eventuale istanza Invidious di riserva (best-effort) */
    invidRefresh(false, function () { renderPipedStatus(); });
    setInterval(function () { invidRefresh(false, function () { renderPipedStatus(); }); }, PIPED_TTL);
    setTimeout(checkVersion, 4000);
    setInterval(checkVersion, 60000);

    $('search-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var q = $('search-input').value.replace(/^\s+|\s+$/g, '');
      if (q) doSearch(q);
    });
    $('link-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      doLink($('link-input').value);
    });
    /* backup manuale: i link del footer (y2mate.vet, ytdown.tools) aprono
       il sito; se nel campo link c'è un URL YouTube, lo copiano negli
       appunti così l'utente lo incolla lì */
    var backupBtns = document.querySelectorAll('.backup-btn');
    for (var b = 0; b < backupBtns.length; b++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var u = $('link-input') ? $('link-input').value : '';
          if (/youtube\.com\/watch\?v=|youtu\.be\//.test(u)) {
            try {
              var ta = document.createElement('textarea');
              ta.value = u;
              ta.style.position = 'fixed';
              ta.style.opacity = '0';
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
            } catch (e) { /* appunti non disponibili: incolla a mano */ }
          }
        });
      })(backupBtns[b]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
