/* ytd. — logica pagina (ES5: niente fetch, arrow o template literal, gira sui browser datati) */
(function () {
  'use strict';

  /* URL dell'engine (worker Cloudflare). Impostato dopo il deploy;
     l'utente puo' cambiarlo dal footer ("cambia"). */

  var ENGINE_CLOUDFLARE = 'https://yt-downloader.scopacasa-vincenzo432.workers.dev';
  var ENGINE_KEY = 'ytd.engine';

  function engineMissingMsg() { return t('engine-missing'); }

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
      'engine-change': 'cambia',
      'engine-not-configured': 'non configurato',
      'disclaimer': 'solo per contenuti di cui hai i diritti.',
      'engine-missing': "Engine non configurato. Apri il worker (deploy) e incolla qui il suo URL con \u201ccambia\u201d in fondo alla pagina.",
      'searching': 'cerco…',
      'no-results': 'nessun risultato per \u201c{0}\u201d',
      'search-err': 'ricerca: {0}',
      'formats-err': 'formati: {0}',
      'download-err': 'Download: {0}',
      'info-err': 'info video: {0}',
      'playlist-err': 'playlist: {0}',
      'link-unrecognized': 'Link non riconosciuto: incolla un URL di YouTube (video o playlist).',
      'loading-tracks': 'carico le tracce…',
      'playlist-empty': 'Playlist vuota o non accessibile.',
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
      'engine-change-prompt': 'URL del worker (engine). Es.: https://yt-downloader.xxxx.workers.dev',
      'engine-change-invalid': 'Inserisci un URL valido che inizia con http:// o https://',
      'bot-blocked': "YouTube ha bloccato temporaneamente l'engine (anti-bot). Riprova tra qualche minuto.",
      'youtube-refused': 'YouTube ha rifiutato la richiesta (blocco temporaneo). Riprova tra poco.',
      'interrupted': 'Download interrotto (rete o annullamento). Riprova.',
      'retry-wait': "YouTube ha bloccato l'engine: riprovo da solo tra {0}s…"
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
      'engine-change': 'change',
      'engine-not-configured': 'not configured',
      'disclaimer': 'only for content you have rights to.',
      'engine-missing': "Engine not configured. Deploy the worker and paste its URL here via \u201cchange\u201d at the bottom of the page.",
      'searching': 'searching…',
      'no-results': 'no results for \u201c{0}\u201d',
      'search-err': 'search: {0}',
      'formats-err': 'formats: {0}',
      'download-err': 'Download: {0}',
      'info-err': 'video info: {0}',
      'playlist-err': 'playlist: {0}',
      'link-unrecognized': 'Link not recognized: paste a YouTube URL (video or playlist).',
      'loading-tracks': 'loading tracks…',
      'playlist-empty': 'Empty or inaccessible playlist.',
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
      'engine-change-prompt': 'Worker (engine) URL. E.g.: https://yt-downloader.xxxx.workers.dev',
      'engine-change-invalid': 'Enter a valid URL starting with http:// or https://',
      'bot-blocked': "YouTube temporarily blocked the engine (anti-bot). Try again in a few minutes.",
      'youtube-refused': 'YouTube refused the request (temporary block). Try again soon.',
      'interrupted': 'Download interrupted (network or cancelled). Try again.',
      'retry-wait': 'YouTube blocked the engine: retrying automatically in {0}s…'
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
    renderEngineUrl();
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

  function engineUrl() {
    var v = storageGet(ENGINE_KEY);
    return (v && v.length) ? v : ENGINE_CLOUDFLARE;
  }

  /* elenco ordinato di engine da provare: custom > Cloudflare > Deno */
  function engines() {
    var list = [];
    var custom = storageGet(ENGINE_KEY);
    if (custom) list.push(custom);
    if (list.indexOf(ENGINE_CLOUDFLARE) === -1) list.push(ENGINE_CLOUDFLARE);
    return list;
  }

  /* se l'engine risponde "bloccato, riprova tra Ns" (worker in backoff
     anti-bot), ripete da solo l'intera sequenza di engine dopo N secondi,
     fino a MAX_AUTO_RETRY volte: l'utente non deve fare nulla. */
  var MAX_AUTO_RETRY = 3;
  function retrySeconds(msg) {
    var m = /^RETRY_AFTER_(\d+)$/.exec(String(msg));
    return m ? parseInt(m[1], 10) : 0;
  }

  /* chiama un endpoint JSON con fallback su piu' engine */
  function callEngine(pathQuery, ok, err, maxAttempts, onRetry) {
    var list = engines();
    var idx = 0;
    var lastErr = null;
    var autoLeft = MAX_AUTO_RETRY;
    (function next() {
      if (idx >= list.length) {
        err(lastErr ? friendlyMsg(lastErr) : 'all engines failed');
        return;
      }
      var engine = list[idx++];
      retryCall(
        function (o, e) { xhrJson(engine + pathQuery, o, e); },
        function (val) { ok(val); },
        function (msg) {
          var rs = retrySeconds(msg);
          if (rs && autoLeft > 0) {
            autoLeft--;
            idx = 0;
            lastErr = null;
            if (onRetry) onRetry(rs);
            setTimeout(next, rs * 1000);
            return;
          }
          lastErr = msg;
          if (shouldRetry(msg)) next(); else err(friendlyMsg(msg));
        },
        maxAttempts || 3, 1500);
    })();
  }

  /* chiama uno stream (blob) con fallback su piu' engine */
  function callEngineStream(pathQuery, ok, err, onProgress, maxAttempts, onRetry) {
    var list = engines();
    var idx = 0;
    var lastErr = null;
    var autoLeft = MAX_AUTO_RETRY;
    (function next() {
      if (idx >= list.length) {
        err((lastErr === 'interrotto') ? 'interrotto' : (lastErr ? friendlyMsg(lastErr) : 'all engines failed'));
        return;
      }
      var engine = list[idx++];
      retryCall(
        function (o, e) { xhrBlob(engine + pathQuery, o, e, onProgress); },
        ok,
        function (msg) {
          var rs = retrySeconds(msg);
          if (rs && autoLeft > 0) {
            autoLeft--;
            idx = 0;
            lastErr = null;
            if (onRetry) onRetry(rs);
            setTimeout(next, rs * 1000);
            return;
          }
          lastErr = msg;
          if (shouldRetry(msg)) next(); else err(friendlyMsg(msg));
        },
        maxAttempts || 3, 1500);
    })();
  }

  function xhrJson(url, ok, err) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status >= 200 && x.status < 300) {
        var data = null;
        try { data = JSON.parse(x.responseText); } catch (e) { err('invalid response'); return; }
        ok(data);
      } else {
        var msg = 'errore ' + x.status;
        try {
          var j = JSON.parse(x.responseText);
          if (j && j.retryAfter) msg = 'RETRY_AFTER_' + Math.max(5, parseInt(j.retryAfter, 10) || 5);
          else if (j && j.message) msg = j.message;
        } catch (e) { /* ignora */ }
        err(msg);
      }
    };
    x.onerror = function () { err('network error'); };
    x.send();
  }

  function friendlyMsg(raw) {
    var s = String(raw == null ? '' : raw);
    if (s === 'interrotto') return t('interrupted');
    if (retrySeconds(s)) return t('bot-blocked');
    if (/not a bot|bot|LOGIN_REQUIRED|sign in|confirm you/i.test(s)) return t('bot-blocked');
    if (/403|429|400/.test(s)) return t('youtube-refused');
    return s;
  }

  function fetchFormats(id, ok, err, onRetry) {
    callEngine('/formats?id=' + encodeURIComponent(id), ok, err, 3, onRetry);
  }

  function xhrBlob(url, ok, err, onProgress) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.responseType = 'blob';
    if (onProgress) x.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded, e.total); };
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status >= 200 && x.status < 300 && x.response) {
        ok(x.response);
        return;
      }
      /* status 0 = richiesta annullata o rete interrotta (blob non leggibile) */
      if (x.status === 0) { err('interrotto'); return; }
      /* errore: prova a estrarre il messaggio dal body (json di errore dell'engine) */
      if (x.response && typeof FileReader !== 'undefined') {
        var r = new FileReader();
        r.onload = function () {
          var msg = 'errore ' + x.status;
          try {
            var j = JSON.parse(r.result);
            if (j && j.retryAfter) msg = 'RETRY_AFTER_' + Math.max(5, parseInt(j.retryAfter, 10) || 5);
            else if (j && j.message) msg = j.message;
          } catch (e) { /* body non json */ }
          err(friendlyMsg(msg));
        };
        r.onerror = function () { err('errore ' + x.status); };
        r.readAsText(x.response);
      } else {
        err('errore ' + x.status);
      }
    };
    x.onerror = function () { err('network error'); };
    x.send();
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

    bindPlay(playBtn, li, item);
    bindDownload(li, dlBtn, item, t('download'), statusId);

    return li;
  }

  function bindPlay(btn, row, item) {
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
      audio.src = engineUrl() + '/stream?id=' + encodeURIComponent(item.id);
      p.appendChild(audio);
      row.appendChild(p);
      btn.textContent = '\u25A0';
      try { audio.play(); } catch (e) { /* browser vecchi: l'utente preme play */ }
    });
  }

  /* "Scarica" apre un picker (audio/video, qualita') e poi avvia il download */
  function bindDownload(container, btn, item, label, statusId) {
    btn.addEventListener('click', function () {
      if (btn.getAttribute('data-busy') === '1') return;
      btn.setAttribute('data-busy', '1');
      btn.textContent = '…';
      fetchFormats(item.id,
        function (fmts) {
          btn.removeAttribute('data-busy');
          btn.textContent = label;
          buildPicker(container, item, fmts, label, statusId);
        },
        function (msg) {
          btn.removeAttribute('data-busy');
          btn.textContent = t('error');
          setStatus(statusId || 'search-status', tF('formats-err', friendlyMsg(msg)), true);
          setTimeout(function () { btn.textContent = label; }, 2200);
        },
        function (secs) {
          setStatus(statusId || 'search-status', tF('retry-wait', secs), false);
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
        o.textContent = list[i].label + (list[i].size ? ' · ' + fmtBytes(list[i].size) : '');
        o.setAttribute('data-mime', list[i].mime || '');
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
      var itag = opt.value;
      var ext = extForMime(opt.getAttribute('data-mime') || '');
      close();
      startDownload(item, itag, ext, go, label, statusId);
    });
  }

  /* avvia il download di un singolo formato (itag) */
  function startDownload(item, itag, ext, btn, label, statusId) {
    var title = item.title || item.id;
    var path = '/stream?id=' + encodeURIComponent(item.id) +
      '&itag=' + encodeURIComponent(itag) +
      '&name=' + encodeURIComponent(title);
    btn.setAttribute('data-busy', '1');
    btn.textContent = '…';
    callEngineStream(
      path,
      function (blob) {
        saveBlob(blob, sanitizeTitle(title) + '.' + ext, statusId);
        btn.textContent = t('saved');
        reset();
      },
      function (msg) {
        btn.textContent = t('error');
        setStatus(statusId || 'search-status', tF('download-err', friendlyMsg(msg)), true);
        reset();
      },
      function (loaded, total) {
        if (total) btn.textContent = Math.round(loaded / total * 100) + '%';
      },
      3,
      function (secs) {
        setStatus(statusId || 'search-status', tF('retry-wait', secs), false);
      });
    function reset() {
      setTimeout(function () {
        btn.removeAttribute('data-busy');
        btn.textContent = label;
      }, 2200);
    }
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

  /* esegue exec(ok, err) con retry: l'anti-bot di YouTube e' intermittente,
     un nuovo tentativo ha buona probabilita' di passare (visitorData fresco). */
  function retryCall(exec, onOk, onErr, maxAttempts, delayMs) {
    var attempts = 0;
    (function go() {
      attempts++;
      exec(function (val) { onOk(val); },
        function (msg) {
          if (attempts < maxAttempts && shouldRetry(msg)) { setTimeout(go, delayMs); }
          else { onErr(msg); }
        });
    })();
  }

  /* Download audio (usato da "Scarica tutte"): itag opzionale, ext = estensione */
  function fetchAudio(item, itag, ext, onProgress, onDone, onErr) {
    var title = item.title || item.id;
    var path = '/stream?id=' + encodeURIComponent(item.id) +
      (itag ? '&itag=' + encodeURIComponent(itag) : '') +
      '&name=' + encodeURIComponent(title);
    callEngineStream(
      path,
      function (blob) { onDone(blob, sanitizeTitle(title) + '.' + (ext || 'm4a')); },
      function (msg) { onErr(friendlyMsg(msg)); },
      onProgress);
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

  /* ---------- ricerca ---------- */

  function doSearch(q) {
    if (!engines().length) { setStatus('search-status', engineMissingMsg(), true); return; }
    clearStatus('search-status');
    var list = $('search-results');
    list.innerHTML = '';
    setStatus('search-status', t('searching'));
    callEngine('/search?q=' + encodeURIComponent(q),
      function (data) {
        clearStatus('search-status');
        var results = (data && data.results) || [];
        if (!results.length) { setStatus('search-status', tF('no-results', q), true); return; }
        for (var i = 0; i < results.length; i++) list.appendChild(buildRow(results[i], 'search-status'));
      },
      function (msg) { setStatus('search-status', tF('search-err', friendlyMsg(msg)), true); });
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

  function oembed(url, cb) {
    xhrJson('https://www.youtube.com/oembed?url=' + encodeURIComponent(url) + '&format=json',
      function (data) { cb(data); },
      function () { cb(null); });
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
    if (!engines().length) { setStatus('link-status', engineMissingMsg(), true); return; }

    if (parsed.list) {
      openPlaylist(parsed.list);
    } else if (parsed.vid) {
      openVideo(parsed.vid);
    }
  }

  function openVideo(vid) {
    var engine = engineUrl();
    var box = $('link-preview');
    var card = buildCard(thumbFor(vid), '\u2026', '\u2026', '', null);
    box.appendChild(card);
    oembed('https://www.youtube.com/watch?v=' + vid, function (o) {
      var title = (o && o.title) || '\u2026';
      var author = (o && o.author_name) || '';
      var sub = author ? author : '\u2026';
      card.querySelector('.card-title').textContent = title;
      card.querySelector('.card-sub').textContent = sub;
      if (o && o.thumbnail_url) card.querySelector('.card-cover').src = o.thumbnail_url;
    });
    /* pulsanti subito visibili (non dipendono da /info) */
    var actions = document.createElement('div');
    actions.className = 'card-actions';
    card.querySelector('.card-body').appendChild(actions);

    var previewWrap = document.createElement('div');
    previewWrap.className = 'card-preview';
    card.appendChild(previewWrap);

    /* anteprima audio */
    var play = document.createElement('button');
    play.type = 'button';
    play.className = 'btn btn-play';
    play.textContent = '\u25B6';
    play.setAttribute('aria-label', t('preview-audio'));
    actions.appendChild(play);
    play.addEventListener('click', function () {
      if (previewWrap.innerHTML) {
        previewWrap.innerHTML = '';
        play.textContent = '\u25B6';
        return;
      }
      var audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'none';
      audio.src = engine + '/stream?id=' + encodeURIComponent(vid);
      previewWrap.appendChild(audio);
      play.textContent = '\u25A0';
      try { audio.play(); } catch (e) { /* ok */ }
    });

    /* pulsante Scarica sempre presente (anche se /info fallisse) */
    var setupDl = function (titleText, authorText) {
      var dl = actions.querySelector('.btn-dl-main');
      if (!dl) {
        dl = document.createElement('button');
        dl.type = 'button';
        dl.className = 'btn btn-primary btn-dl-main';
        actions.appendChild(dl);
      }
      var item = { id: vid, title: titleText || '', author: authorText || '' };
      dl.textContent = t('download');
      bindDownload(card.querySelector('.card-body'), dl, item, t('download'), 'link-status');
    };
    setupDl('', '');

    /* info in background: durata + titolo (fallire non blocca il download) */
    callEngine('/info?id=' + encodeURIComponent(vid),
      function (info) {
        var subEl = card.querySelector('.card-sub');
        var bits = [];
        if (info.author) bits.push(info.author);
        if (info.seconds) bits.push(fmtDur(info.seconds));
        if (info.size) bits.push(fmtBytes(info.size));
        if (bits.length) subEl.textContent = bits.join(' \u00B7 ');
        card.querySelector('.card-title').textContent = info.title || card.querySelector('.card-title').textContent;
        var dl = actions.querySelector('.btn-dl-main');
        bindDownload(card.querySelector('.card-body'), dl, { id: vid, title: info.title || '', author: info.author || '' }, t('download'), 'link-status');
      },
      function () { /* ignora: il download usa /formats, non /info */ });
  }

  function openPlaylist(list) {
    var box = $('link-preview');
    var card = buildCard(thumbFor(''), 'Playlist', '\u2026', '', null);
    box.appendChild(card);
    oembed('https://www.youtube.com/playlist?list=' + list, function (o) {
      if (o && o.title) card.querySelector('.card-title').textContent = o.title;
      if (o && o.thumbnail_url) card.querySelector('.card-cover').src = o.thumbnail_url;
    });
    setStatus('link-status', t('loading-tracks'));
    callEngine('/playlist?list=' + encodeURIComponent(list),
      function (data) {
        clearStatus('link-status');
        if (!data || !data.items || !data.items.length) {
          setStatus('link-status', t('playlist-empty'), true);
          return;
        }
        if (data.title) card.querySelector('.card-title').textContent = data.title;
        var n = data.items.length;
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
        downloadAll(all, data.items, qsel);

        var listEl = $('link-tracks');
        for (var i = 0; i < data.items.length; i++) listEl.appendChild(buildRow(data.items[i], 'link-status'));
      },
      function (msg) { setStatus('link-status', tF('playlist-err', friendlyMsg(msg)), true); });
  }

  function downloadAll(btn, items, qsel) {
    var busy = false;
    btn.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      var itag = null, ext = 'm4a';
      if (qsel) {
        var opt = qsel.options[qsel.selectedIndex];
        itag = opt.value;
        ext = opt.getAttribute('data-ext') || 'm4a';
      }
      btn.textContent = '0/' + items.length;
      var i = 0;
      (function next() {
        if (i >= items.length) {
          btn.textContent = t('done');
          setTimeout(function () { btn.textContent = t('download-all'); busy = false; }, 2500);
          return;
        }
        var item = items[i];
        btn.textContent = (i + 1) + '/' + items.length;
        fetchAudio(item, itag, ext, null,
          function (blob, name) { saveBlob(blob, name); i++; next(); },
          function () { i++; next(); });
      })();
    });
  }

  /* ---------- engine url ---------- */

  function renderEngineUrl() {
    var el = $('engine-url');
    var u = engineUrl();
    el.textContent = u || t('engine-not-configured');
  }

  function bindEngineChange() {
    $('engine-change').addEventListener('click', function () {
      var cur = engineUrl();
      var v = window.prompt(t('engine-change-prompt'), cur);
      if (v === null) return;              /* annullato */
      v = String(v || '').replace(/^\s+|\s+$/g, '');
      if (!v) { storageDel(ENGINE_KEY); renderEngineUrl(); return; }
      if (!/^https?:\/\//.test(v)) { window.alert(t('engine-change-invalid')); return; }
      storageSet(ENGINE_KEY, v);
      renderEngineUrl();
    });
  }

  /* ---------- init ---------- */

  function init() {
    bindLang();
    applyLang();
    bindTabs();
    renderEngineUrl();
    bindEngineChange();

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
