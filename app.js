/* ytd. — logica pagina (ES5: niente fetch, arrow o template literal, gira sui browser datati) */
(function () {
  'use strict';

  /* La pagina NON usa alcun server: parla con ytdlp.online (yt-dlp
     server-side, gratis e senza account) attraverso un pool di proxy CORS
     pubblici. Ogni proxy ha un IP diverso -> quota giornaliera separata
     (~5 task/IP): la pagina li verifica (health check), ruota in automatico
     e salva in localStorage i formati già estratti, così i download ripetuti
     non consumano più task. */

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
      'ytdlp-checking': 'verifico i server yt-dlp…',
      'ytdlp-none': 'Nessun server yt-dlp raggiungibile in questo momento. Riprova tra poco.',
      'ytdlp-label': 'yt-dlp (ytdlp.online)',
      'searching': 'cerco…',
      'no-results': 'nessun risultato per \u201c{0}\u201d',
      'search-err': 'ricerca: {0}',
      'formats-err': 'formati: {0}',
      'download-err': 'Download: {0}',
      'widget-open': '🎯 scarica con widget ytdown.tools',
      'widget-close': 'chiudi widget',
      'open-manually': 'Questo formato si apre in una nuova scheda: se il download non parte, clicca con il tasto destro e “Salva con nome”.',
      'ytdlp-limit': 'ytdlp.online ha raggiunto il limite giornaliero di conversioni gratuite (5/IP). Riprova domani o tra qualche ora — i video già scaricati restano in cache.',
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
      'network-err': 'Errore di rete: tutti i server yt-dlp sono irraggiungibili in questo momento. Riprova tra poco.',
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
      'ytdlp-checking': 'checking yt-dlp servers…',
      'ytdlp-none': 'No yt-dlp server reachable right now. Try again soon.',
      'ytdlp-label': 'yt-dlp (ytdlp.online)',
      'searching': 'searching…',
      'no-results': 'no results for \u201c{0}\u201d',
      'search-err': 'search: {0}',
      'formats-err': 'formats: {0}',
      'download-err': 'Download: {0}',
      'widget-open': '🎯 download with ytdown.tools widget',
      'widget-close': 'close widget',
      'open-manually': 'This format opens in a new tab: if the download does not start, right-click and “Save as”.',
      'ytdlp-limit': 'ytdlp.online reached its daily free-conversion limit (5/IP). Try again tomorrow or in a few hours — already-downloaded videos stay cached.',
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
      'network-err': 'Network error: all yt-dlp servers are unreachable right now. Try again soon.',
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
    if (typeof renderEngineStatus === 'function') renderEngineStatus();
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

  /* ---------- engine: YTDLP (yt-dlp server-side via proxy CORS, zero server) ----------
     La pagina NON usa alcun server: parla con ytdlp.online, che gira yt-dlp
     lato server e streama l'output via SSE su /api/v1/stream. Il browser non
     può leggere l'SSE (nessun header CORS), quindi la pagina passa da un
     POOL di proxy CORS pubblici che inoltrano la richiesta e aggiungono gli
     header necessari.

     Perché un pool di proxy? ytdlp.online ha un limite di ~5 task/giorno per
     IP. Ogni proxy ha un IP diverso -> quota separata: ruotando i proxy si
     moltiplica la quota giornaliera. Il tool prova il primo proxy vivo e, se
     è a quota o fallisce, passa al successivo in automatico.

     In più la pagina tiene una cache locale dei formati (localStorage): un
     video già estratto non consuma più task nei download successivi — i
     download ripetuti costano zero.

     I formati hanno URL googlevideo senza CORS: si scaricano aprendoli in
     una scheda (flag direct). */

  /* Pool di proxy CORS pubblici (ognuno = IP diverso = quota separata).
     Aggiungi qui un nuovo proxy per allargare la rete. L'ordine conta:
     i più affidabili in cima. */
  var YTDLP_PROXIES = [
    'https://corsproxy.io/?url=',
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://cors.lol/?url=',
    'https://api.cors.lol/?url=',
    'https://cors.eu.org/?url=',
    'https://whateverorigin.org/get?url=',
    'https://test.cors.workers.dev/?url='
  ];
  var PROXY_TTL = 6 * 60 * 1000;   /* ricontrolla i proxy ogni 6 min */
  var PROXY_KEY = 'ytd.proxy';
  var proxyGood = '';              /* proxy in uso (l'ultimo che ha funzionato) */
  var proxyChecked = 0;
  var proxyChecking = false;

  function proxyLoadCache() {
    try {
      var j = JSON.parse(window.localStorage.getItem(PROXY_KEY) || 'null');
      if (j && j.p && j.at && (Date.now() - j.at) < PROXY_TTL) return j.p;
    } catch (e) { /* ignora */ }
    return '';
  }
  function proxySave(p) {
    try {
      window.localStorage.setItem(PROXY_KEY, JSON.stringify({ p: p, at: Date.now() }));
    } catch (e) { /* ignora */ }
  }

  /* health check di un proxy: gli chiediamo una risorsa innocua (con CORS
     permissivo) — non ytdlp.online, per non consumare la quota di test */
  function proxyProbe(p, cb) {
    var x = new XMLHttpRequest();
    x.open('GET', p + encodeURIComponent('https://api.github.com/zen'), true);
    x.timeout = 10000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      cb(x.status >= 200 && x.status < 400);
    };
    x.onerror = function () { cb(false); };
    x.ontimeout = function () { cb(false); };
    x.send();
  }

  function proxyRefresh(force, cb) {
    if (proxyChecking) { if (cb) setTimeout(function () { cb(proxyGood); }, 300); return; }
    if (!force && proxyGood && proxyChecked && (Date.now() - proxyChecked) < PROXY_TTL) {
      if (cb) cb(proxyGood); return;
    }
    var cached = proxyLoadCache();
    if (!force && cached && !proxyGood) { proxyGood = cached; proxyChecked = Date.now(); if (cb) cb(proxyGood); return; }
    proxyChecking = true;
    var alive = [];
    var pending = YTDLP_PROXIES.length;
    if (!pending) { proxyChecking = false; if (cb) cb(''); return; }
    for (var i = 0; i < YTDLP_PROXIES.length; i++) {
      (function (p) {
        proxyProbe(p, function (ok) {
          if (ok && alive.indexOf(p) === -1) alive.push(p);
          pending--;
          if (pending === 0) {
            proxyChecking = false;
            proxyChecked = Date.now();
            proxyGood = alive.length ? alive[0] : cached;
            if (proxyGood) proxySave(proxyGood);
            if (cb) cb(proxyGood);
          }
        });
      })(YTDLP_PROXIES[i]);
    }
  }

  /* ripulisce il messaggio di errore (traceback multi-riga) */
  function pipedErrMsg(raw) {
    var s = String(raw == null ? '' : raw);
    s = s.split('\n')[0];
    if (s.length > 160) s = s.slice(0, 160);
    return s;
  }

  function retrySeconds(msg) {
    var m = /^RETRY_AFTER_(\d+)$/.exec(String(msg));
    return m ? parseInt(m[1], 10) : 0;
  }

  function friendlyMsg(raw) {
    var s = String(raw == null ? '' : raw);
    if (s === 'interrotto') return t('interrupted');
    if (s === 'network error') return t('network-err');
    if (retrySeconds(s)) return t('bot-blocked');
    if (/not a bot|bot|LOGIN_REQUIRED|sign in|confirm you/i.test(s)) return t('bot-blocked');
    if (/youtube http 403|youtube http 429|errore 403|errore 429/.test(s)) return tF('youtube-refused-status', '403/429');
    if (/403|429|400/.test(s)) return t('youtube-refused');
    return s;
  }

  /* ---------- mapping dati ---------- */

  function fmtViews(n) {
    n = parseInt(n, 10) || 0;
    if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  function byHeight(x, y) { return y.height - x.height; }
  function byKbps(x, y) { return y.kbps - x.kbps; }

  /* migliore stream per anteprima/zip: audio-only, altrimenti muxed, altrimenti video */
  function pickStream(fmts) {
    if (fmts.audio.length) return fmts.audio[0];
    if (fmts.progressive.length) return fmts.progressive[0];
    if (fmts.video.length) return fmts.video[0];
    return null;
  }

  /* ---------- dispatch: unico engine YTDLP ---------- */

  function ytSearch(q, ok, err) { ytdlpSearch(q, ok, err); }
  function ytFormats(id, ok, err) { ytdlpFormats(id, ok, err); }
  function ytPlaylist(list, ok, err) { ytdlpPlaylist(list, ok, err); }

  /* ---------- engine YTDLP: rotazione proxy + cache locale ---------- */

  var YTDLP_STREAM = 'https://ytdlp.online/api/v1/stream';
  var FMT_CACHE_TTL = 6 * 60 * 60 * 1000;   /* i formati di un video valgono 6h */
  var SRCH_CACHE_TTL = 10 * 60 * 1000;      /* la ricerca si aggiorna ogni 10 min */

  function cacheGet(key, ttl) {
    try {
      var j = JSON.parse(window.localStorage.getItem(key) || 'null');
      if (j && j.at && (Date.now() - j.at) < ttl) return j.data;
    } catch (e) { /* ignora */ }
    return null;
  }
  function cacheSet(key, data) {
    try {
      window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), data: data }));
    } catch (e) { /* ignora */ }
  }

  function ytdlpJobId() {
    return 'job-' + Date.now() + '-' + Math.floor(Math.random() * 1e9);
  }

  /* decodifica le entità HTML dell'SSE (yt-dlp esce con &quot; ecc.) */
  function ytdlpHtmlDecode(s) {
    return String(s)
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ');
  }

  /* estrae il JSON di yt-dlp dall'output SSE (righe "data: ") */
  function ytdlpParse(text) {
    var joined = '';
    var lines = String(text || '').split('\n');
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('data: ') === 0) joined += lines[i].substring(6);
    }
    if (/daily launch limit|rate limit|too many/i.test(joined)) return { ytdlpLimit: true };
    var start = joined.indexOf('{');
    if (start === -1) return null;
    for (var end = start + 1; end < joined.length; end++) {
      if (joined.charAt(end) !== '}') continue;
      try {
        var obj = JSON.parse(ytdlpHtmlDecode(joined.substring(start, end + 1)));
        if (obj && typeof obj === 'object' && (obj.formats || obj.entries)) return obj;
      } catch (e) { /* chiude più avanti */ }
    }
    return null;
  }

  /* memoria dei proxy "a quota": quando ytdlp.online dice che il limite
     giornaliero è raggiunto, vale per l'IP di quel proxy — lo saltiamo per
     30 minuti invece di riprovarlo a ogni richiesta. */
  var PROXY_QUOTA_KEY = 'ytd.proxyquota';
  var proxyQuota = {};   /* proxy -> timestamp scadenza */
  function quotaLoad() {
    try { proxyQuota = JSON.parse(window.localStorage.getItem(PROXY_QUOTA_KEY) || '{}'); }
    catch (e) { proxyQuota = {}; }
  }
  function quotaMark(p) {
    proxyQuota[p] = Date.now() + 30 * 60 * 1000;
    try { window.localStorage.setItem(PROXY_QUOTA_KEY, JSON.stringify(proxyQuota)); } catch (e) { /* ignora */ }
  }
  function quotaOk(p) {
    var until = proxyQuota[p];
    return !until || Date.now() > until;
  }
  quotaLoad();

  /* esegue un comando yt-dlp: prova il proxy preferito, poi gli altri del
     pool in ordine (ognuno ha IP diverso -> quota separata). Con "-J" yt-dlp
     stampa il JSON e chiude la connessione da solo in pochi secondi: la
     risposta è breve, quindi il proxy la gestisce (lo streaming lungo no).
     Quando il server dice "limite raggiunto", il limite vale per l'IP di
     quel proxy: si passa subito al successivo (e lo si ricorda per 30 min).
     I proxy rotti (risposta non-JSON) si scartano al volo senza retry. */
  function ytdlpRun(command, ok, err) {
    var tried = {};
    var order = [];
    function add(p) { if (p && !tried[p] && order.indexOf(p) === -1) order.push(p); }
    add(proxyGood);
    for (var i = 0; i < YTDLP_PROXIES.length; i++) add(YTDLP_PROXIES[i]);
    var round = 0;
    (function next(idx, lastMsg) {
      /* salta i proxy a quota (ricordati per 30 min) */
      while (idx < order.length && !quotaOk(order[idx])) idx++;
      if (idx >= order.length) {
        /* un giro completo fallito: riprova tutto un'altra volta (l'anti-bot
           è intermittente, in pochi secondi un proxy può sbloccarsi) */
        round++;
        if (round < 2) { setTimeout(function () { next(0, lastMsg); }, 3000); return; }
        err(lastMsg || t('ytdlp-none'));
        return;
      }
      var p = order[idx];
      var n = 0;
      (function go() {
        n++;
        var url = YTDLP_STREAM + '?command=' + encodeURIComponent(command) +
          '&job_id=' + ytdlpJobId() + '&source=index&engine=stable';
        var x = new XMLHttpRequest();
        x.open('GET', p + encodeURIComponent(url), true);
        x.timeout = 40000;
        x.onreadystatechange = function () {
          if (x.readyState !== 4) return;
          if (x.status >= 200 && x.status < 300) {
            var obj = ytdlpParse(x.responseText || '');
            if (!obj) { next(idx + 1, 'risposta non valida'); return; }
            if (obj.ytdlpLimit) {
              /* proxy vivo ma a quota: ricorda (30 min) e passa avanti */
              quotaMark(p);
              proxyGood = p; proxySave(p);
              next(idx + 1, t('ytdlp-limit'));
              return;
            }
            proxyGood = p; proxySave(p);
            ok(obj);
          } else fail(x.status === 0 ? 'network error' : 'errore ' + x.status);
        };
        x.onerror = function () { fail('network error'); };
        x.ontimeout = function () { fail('timeout'); };
        function fail(msg) {
          if (n < 2) setTimeout(go, 2000 * n); else next(idx + 1, msg);
        }
        x.send();
      })();
    })(0, '');
  }

  /* normalizza un item della ricerca/playlist di yt-dlp (-J --flat-playlist) */
  function ytdlpItem(e) {
    var thumbs = (e && e.thumbnails) || [];
    var t = '';
    for (var i = 0; i < thumbs.length; i++) if (thumbs[i] && thumbs[i].url) { t = thumbs[i].url; break; }
    return {
      id: e.id || '',
      title: e.title || '',
      author: e.channel || e.uploader || '',
      duration: fmtDur(e.duration),
      views: fmtViews(e.view_count),
      thumb: t || thumbFor(e.id)
    };
  }

  function ytdlpSearch(q, ok, err) {
    var key = 'ytd.srch.' + q;
    var cached = cacheGet(key, SRCH_CACHE_TTL);
    if (cached) { ok(cached); return; }
    ytdlpRun('ytsearch8:' + q + ' -J --flat-playlist', function (obj) {
      var entries = (obj && obj.entries) || [];
      var out = [];
      for (var i = 0; i < entries.length; i++) {
        var it = ytdlpItem(entries[i]);
        if (it.id) out.push(it);
      }
      cacheSet(key, out);
      ok(out);
    }, err);
  }

  function ytdlpFormats(id, ok, err) {
    var key = 'ytd.fmt.' + id;
    var cached = cacheGet(key, FMT_CACHE_TTL);
    if (cached) { ok(cached); return; }
    ytdlpRun('https://youtu.be/' + id + ' -J --no-playlist', function (obj) {
      var audio = [], progressive = [], video = [];
      var fmts = (obj && obj.formats) || [];
      for (var i = 0; i < fmts.length; i++) {
        var f = fmts[i];
        if (!f || !f.url) continue;
        var vc = String(f.vcodec || 'none');
        var ac = String(f.acodec || 'none');
        var isAudio = (vc === 'none' && ac !== 'none');
        var isVideo = (ac === 'none' && vc !== 'none');
        var h = parseInt(f.height, 10) || 0;
        var kbps = Math.round(parseFloat(f.abr) || 0);
        var label;
        if (isAudio) label = kbps > 0 ? kbps + ' kbps' : (f.ext || 'audio');
        else label = h > 0 ? h + 'p' : (f.format_note || 'video');
        var fmt = {
          itag: String(f.format_id || i),
          label: label,
          mime: 'video/' + (f.ext || 'mp4'),
          size: parseInt(f.filesize || f.filesize_approx, 10) || 0,
          url: f.url,
          height: h,
          kbps: kbps,
          direct: true
        };
        if (isAudio) audio.push(fmt);
        else if (isVideo) video.push(fmt);
        else progressive.push(fmt);
      }
      audio.sort(byKbps);
      progressive.sort(byHeight);
      video.sort(byHeight);
      var data = {
        info: {
          id: id,
          title: obj.title || '',
          author: obj.channel || obj.uploader || '',
          seconds: obj.duration || 0,
          thumb: ((obj.thumbnails && obj.thumbnails.length) ? obj.thumbnails[obj.thumbnails.length - 1].url : '') || thumbFor(id)
        },
        audio: audio, progressive: progressive, video: video
      };
      cacheSet(key, data);
      ok(data);
    }, err);
  }

  function ytdlpPlaylist(list, ok, err) {
    var key = 'ytd.pl.' + list;
    var cached = cacheGet(key, SRCH_CACHE_TTL);
    if (cached) { ok(cached); return; }
    ytdlpRun('https://www.youtube.com/playlist?list=' + list + ' -J --flat-playlist', function (obj) {
      var entries = (obj && obj.entries) || [];
      var out = [];
      for (var i = 0; i < entries.length; i++) {
        var it = ytdlpItem(entries[i]);
        if (it.id) out.push(it);
      }
      var data = { name: (obj && obj.title) || '', items: out };
      cacheSet(key, data);
      ok(data);
    }, err);
  }

  /* scarica i byte di uno stream (URL con CORS permissivo) */
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

  function renderEngineStatus() {
    var el = $('engine-status');
    if (!el) return;
    if (proxyGood) {
      var host = proxyGood.replace(/^https?:\/\//, '').split('/')[0];
      el.textContent = t('ytdlp-label') + ' \u00B7 ' + host;
    } else {
      el.textContent = t('ytdlp-checking');
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
          ext: extForMime(list[i].mime || ''),
          direct: !!list[i].direct
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

  /* avvia il download di un singolo formato; mostra una
     barra di progresso nel container (il pulsante del picker viene rimosso
     dal DOM quando il picker si chiude, quindi la % sul pulsante non
     sarebbe visibile). */
  function startDownload(item, fmt, label, statusId, container) {
    var title = item.title || item.id;
    if (!fmt || !fmt.url) {
      setStatus(statusId || 'search-status', tF('download-err', t('zip-unavailable')), true);
      return;
    }
    /* formati "direct" (es. gli URL googlevideo dell'engine YTDLP): niente
       CORS per il download via XHR, si aprono in una scheda */
    if (fmt.direct) {
      var w = window.open(fmt.url, '_blank');
      if (!w) setStatus(statusId || 'search-status', t('open-manually'), true);
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

        /* widget ytdown.tools (bestapi.cc): i formati girano dentro il
           widget stesso (frame-ancestors *), niente CORS da gestire —
           funziona anche quando tutti gli engine sono bloccati */
        var wg = document.createElement('button');
        wg.type = 'button';
        wg.className = 'btn';
        wg.textContent = t('widget-open');
        actions.appendChild(wg);
        wg.addEventListener('click', function () {
          if (previewWrap.querySelector('iframe')) {
            previewWrap.innerHTML = '';
            wg.textContent = t('widget-open');
            return;
          }
          var f = document.createElement('iframe');
          f.className = 'widget-frame';
          f.src = 'https://bestapi.cc/widget/panel-plus/' + encodeURIComponent(vid) + '/light';
          f.setAttribute('allowtransparency', 'true');
          f.setAttribute('scrolling', 'no');
          f.style.border = 'none';
          f.style.width = '100%';
          f.style.height = '540px';
          f.style.display = 'block';
          previewWrap.innerHTML = '';
          previewWrap.appendChild(f);
          wg.textContent = t('widget-close');
        });
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
  window.__ytdEngine = {
    base: function () { return proxyGood; },
    refresh: function (cb) { proxyRefresh(true, cb); },
    pool: YTDLP_PROXIES
  };

  /* ---------- init ---------- */

  function init() {
    bindLang();
    applyLang();
    bindTabs();
    bindSelTray();
    renderVersion();
    /* discovery dei proxy CORS (health check sul pool, ognuno quota separata) */
    proxyRefresh(false, function () { renderEngineStatus(); });
    setInterval(function () { proxyRefresh(false, function () { renderEngineStatus(); }); }, PROXY_TTL);
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
