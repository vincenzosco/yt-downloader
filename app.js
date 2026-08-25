/* ytd. — logica pagina (ES5: niente fetch, arrow o template literal, gira sui browser datati) */
(function () {
  'use strict';

  /* URL dell'engine (worker Cloudflare). Impostato dopo il deploy;
     l'utente puo' cambiarlo dal footer ("cambia"). */

  var DEFAULT_ENGINE = 'https://yt-downloader.scopacasa-vincenzo432.workers.dev';
  var ENGINE_KEY = 'ytd.engine';

  var ENGINE_MISSING = "Engine non configurato. Apri il worker (deploy) e incolla qui il suo URL " +
    "con \u201ccambia\u201d in fondo alla pagina.";

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
    return (v && v.length) ? v : DEFAULT_ENGINE;
  }

  function xhrJson(url, ok, err) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status >= 200 && x.status < 300) {
        var data = null;
        try { data = JSON.parse(x.responseText); } catch (e) { err('risposta non valida'); return; }
        ok(data);
      } else {
        var msg = 'errore ' + x.status;
        try {
          var j = JSON.parse(x.responseText);
          if (j && j.message) msg = j.message;
        } catch (e) { /* ignora */ }
        err(msg);
      }
    };
    x.onerror = function () { err('errore di rete'); };
    x.send();
  }

  function friendlyMsg(raw) {
    var s = String(raw == null ? '' : raw);
    if (/not a bot|bot|LOGIN_REQUIRED|sign in|confirm you/i.test(s)) {
      return "YouTube ha bloccato temporaneamente l'engine (anti-bot). Riprova tra qualche minuto.";
    }
    if (/403|429|400/.test(s)) return 'YouTube ha rifiutato la richiesta (blocco temporaneo). Riprova tra poco.';
    return s;
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
      /* errore: prova a estrarre il messaggio dal body (json di errore dell'engine) */
      if (x.response && typeof FileReader !== 'undefined') {
        var r = new FileReader();
        r.onload = function () {
          var msg = 'errore ' + x.status;
          try { var j = JSON.parse(r.result); if (j && j.message) msg = j.message; } catch (e) { /* body non json */ }
          err(friendlyMsg(msg));
        };
        r.onerror = function () { err('errore ' + x.status); };
        r.readAsText(x.response);
      } else {
        err('errore ' + x.status);
      }
    };
    x.onerror = function () { err('errore di rete'); };
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
    playBtn.setAttribute('aria-label', 'Anteprima audio');
    actions.appendChild(playBtn);

    var dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'btn btn-dl';
    dlBtn.textContent = 'Scarica';
    actions.appendChild(dlBtn);

    li.appendChild(actions);

    var meta = document.createElement('div');
    meta.className = 'meta';
    var t = document.createElement('div');
    t.className = 't-title';
    t.textContent = item.title || '';
    meta.appendChild(t);
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
    bindDownload(dlBtn, item, 'Scarica', statusId);

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

  function bindDownload(btn, item, label, statusId) {
    btn.addEventListener('click', function () {
      if (btn.getAttribute('data-busy') === '1') return;
      btn.setAttribute('data-busy', '1');
      btn.textContent = '…';
      fetchAudio(item,
        function (loaded, total) { btn.textContent = Math.round(loaded / total * 100) + '%'; },
        function (blob, name) {
          saveBlob(blob, name, statusId);
          btn.textContent = 'salvato';
          reset();
        },
        function (msg) {
          btn.textContent = 'errore';
          setStatus(statusId || 'search-status', 'Download: ' + msg, true);
          reset();
        });
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
    return /bloccato|rifiutato|bot|sign in|503|502|500|errore di rete/i.test(String(msg));
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

  /* Download diretto: una sola chiamata all'engine (lo stream restituisce
     l'audio m4a preferito). Il titolo arriva dai risultati di ricerca o
     dalla playlist, quindi non serve la chiamata /info. */
  function fetchAudio(item, onProgress, onDone, onErr) {
    var engine = engineUrl();
    var title = item.title || item.id;
    var url = engine + '/stream?id=' + encodeURIComponent(item.id) + '&name=' + encodeURIComponent(title);
    retryCall(
      function (ok, err) { xhrBlob(url, ok, err, onProgress); },
      function (blob) { onDone(blob, sanitizeTitle(title) + '.m4a'); },
      function (msg) { onErr(friendlyMsg(msg)); },
      3, 1500);
  }

  function saveBlob(blob, name, statusId) {
    var U = window.URL || window.webkitURL;
    if (!U || !U.createObjectURL) {
      setStatus(statusId || 'search-status', 'Il tuo browser non supporta il salvataggio diretto: apri il link e salva con \u201csalva con nome\u201d.', true);
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
    var engine = engineUrl();
    if (!engine) { setStatus('search-status', ENGINE_MISSING, true); return; }
    clearStatus('search-status');
    var list = $('search-results');
    list.innerHTML = '';
    setStatus('search-status', 'cerco\u2026');
    xhrJson(engine + '/search?q=' + encodeURIComponent(q),
      function (data) {
        clearStatus('search-status');
        var results = (data && data.results) || [];
        if (!results.length) { setStatus('search-status', 'nessun risultato per \u201c' + q + '\u201d', true); return; }
        for (var i = 0; i < results.length; i++) list.appendChild(buildRow(results[i], 'search-status'));
      },
      function (msg) { setStatus('search-status', 'ricerca: ' + friendlyMsg(msg), true); });
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
    var t = document.createElement('div');
    t.className = 'card-title';
    t.textContent = title || '';
    body.appendChild(t);
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
    var engine = engineUrl();
    clearStatus('link-status');
    var box = $('link-preview');
    var tracks = $('link-tracks');
    box.innerHTML = '';
    tracks.innerHTML = '';

    var parsed = parseYtUrl(raw);
    if (!parsed) { setStatus('link-status', 'Link non riconosciuto: incolla un URL di YouTube (video o playlist).', true); return; }
    if (!engine) { setStatus('link-status', ENGINE_MISSING, true); return; }

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
    /* info in background: durata + disponibilita' */
    retryCall(
      function (ok, err) { xhrJson(engine + '/info?id=' + encodeURIComponent(vid), ok, err); },
      function (info) {
        var subEl = card.querySelector('.card-sub');
        var bits = [];
        if (info.author) bits.push(info.author);
        if (info.seconds) bits.push(fmtDur(info.seconds));
        if (info.size) bits.push(fmtBytes(info.size));
        if (bits.length) subEl.textContent = bits.join(' \u00B7 ');
        card.querySelector('.card-title').textContent = info.title || card.querySelector('.card-title').textContent;
        var actions = card.querySelector('.card-actions');
        if (!actions) {
          actions = document.createElement('div');
          actions.className = 'card-actions';
          card.querySelector('.card-body').appendChild(actions);
        }
        actions.innerHTML = '';
        var item = { id: vid, title: info.title || '', author: info.author || '' };
        var dl = document.createElement('button');
        dl.type = 'button';
        dl.className = 'btn btn-primary';
        dl.textContent = 'Scarica audio';
        actions.appendChild(dl);
        bindDownload(dl, item, 'Scarica audio', 'link-status');
        var play = document.createElement('button');
        play.type = 'button';
        play.className = 'btn btn-play';
        play.textContent = '\u25B6';
        play.setAttribute('aria-label', 'Anteprima audio');
        actions.appendChild(play);
        var previewWrap = document.createElement('div');
        previewWrap.className = 'card-preview';
        card.appendChild(previewWrap);
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
      },
      function (msg) {
        setStatus('link-status', 'info video: ' + friendlyMsg(msg), true);
      },
      3, 1500);
  }

  function openPlaylist(list) {
    var engine = engineUrl();
    var box = $('link-preview');
    var card = buildCard(thumbFor(''), 'Playlist', '\u2026', '', null);
    box.appendChild(card);
    oembed('https://www.youtube.com/playlist?list=' + list, function (o) {
      if (o && o.title) card.querySelector('.card-title').textContent = o.title;
      if (o && o.thumbnail_url) card.querySelector('.card-cover').src = o.thumbnail_url;
    });
    setStatus('link-status', 'carico le tracce\u2026');
    xhrJson(engine + '/playlist?list=' + encodeURIComponent(list),
      function (data) {
        clearStatus('link-status');
        if (!data || !data.items || !data.items.length) {
          setStatus('link-status', 'Playlist vuota o non accessibile.', true);
          return;
        }
        if (data.title) card.querySelector('.card-title').textContent = data.title;
        var n = data.items.length;
        var subEl = card.querySelector('.card-sub');
        var bits = subEl.textContent ? [subEl.textContent] : [];
        bits.push(n + ' tracce');
        subEl.textContent = bits.join(' \u00B7 ');
        var actions = document.createElement('div');
        actions.className = 'card-actions';
        var all = document.createElement('button');
        all.type = 'button';
        all.className = 'btn btn-primary';
        all.textContent = 'Scarica tutte';
        actions.appendChild(all);
        card.querySelector('.card-body').appendChild(actions);
        downloadAll(all, data.items);

        var listEl = $('link-tracks');
        for (var i = 0; i < data.items.length; i++) listEl.appendChild(buildRow(data.items[i], 'link-status'));
      },
      function (msg) { setStatus('link-status', 'playlist: ' + friendlyMsg(msg), true); });
  }

  function downloadAll(btn, items) {
    var busy = false;
    btn.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      btn.textContent = '0/' + items.length;
      var i = 0;
      (function next() {
        if (i >= items.length) {
          btn.textContent = 'fatto';
          setTimeout(function () { btn.textContent = 'Scarica tutte'; busy = false; }, 2500);
          return;
        }
        var item = items[i];
        btn.textContent = (i + 1) + '/' + items.length;
        fetchAudio(item, null,
          function (blob, name) { saveBlob(blob, name); i++; next(); },
          function () { i++; next(); });
      })();
    });
  }

  /* ---------- engine url ---------- */

  function renderEngineUrl() {
    var el = $('engine-url');
    var u = engineUrl();
    el.textContent = u || 'non configurato';
  }

  function bindEngineChange() {
    $('engine-change').addEventListener('click', function () {
      var cur = engineUrl();
      var v = window.prompt('URL del worker (engine). Es.: https://yt-downloader.xxxx.workers.dev', cur);
      if (v === null) return;              /* annullato */
      v = String(v || '').replace(/^\s+|\s+$/g, '');
      if (!v) { storageDel(ENGINE_KEY); renderEngineUrl(); return; }
      if (!/^https?:\/\//.test(v)) { window.alert('Inserisci un URL valido che inizia con http:// o https://'); return; }
      storageSet(ENGINE_KEY, v);
      renderEngineUrl();
    });
  }

  /* ---------- init ---------- */

  function init() {
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
