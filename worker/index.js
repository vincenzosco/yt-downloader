// yt-downloader — engine (Cloudflare Workers)
//
// Endpoint (tutti GET, CORS *):
//   /search?q=...         → { query, results: [{id,title,author,duration,views,published,thumb}] }
//   /info?id=...          → { id,title,author,seconds,thumb,itag,mime,size,url }
//   /playlist?list=...    → { id,title,items: [{id,title,author,duration,thumb}] }
//   /stream?id=...&name=… → audio (bytes), CORS *, supporta Range
//   /                     → { ok:true, name, endpoints }
//
// Nota: YouTube blocca le chiamate che arrivano con header Origin (il browser
// non puo' chiamarlo direttamente) e blocca a intermittenza alcuni IP di
// datacenter. Qui le richieste partono dal server senza Origin, su piu' host e
// client con retry; per la ricerca c'e' un fallback sulla pagina HTML.
//
// Il PO token (bot-challenge) è generato nel worker stesso (worker/pot.js).

import { getPoToken } from './pot.js';

const YT_HOSTS = [
  'https://www.youtube.com/youtubei/v1',
  'https://youtubei.googleapis.com/youtubei/v1',
];

const UA_WEB =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const UA_ANDROID = 'com.google.android.youtube/20.14.37 (Linux; U; Android 11) gzip';
const UA_IOS = 'com.google.ios.youtube/20.14.4 (iPhone16,2; U; CPU iOS 17_5 like Mac OS X)';

export const CLIENT_WEB = { clientName: 'WEB', clientVersion: '2.20250605.01.00' };
export const CLIENT_ANDROID = {
  clientName: 'ANDROID',
  clientVersion: '20.14.37',
  androidSdkVersion: 30,
};
export const CLIENT_IOS = { clientName: 'IOS', clientVersion: '20.14.4', deviceModel: 'iPhone16,2' };

export async function innertube(path, clients, body) {
  let lastErr = null;
  for (let h = 0; h < YT_HOSTS.length; h++) {
    for (let c = 0; c < clients.length; c++) {
      const client = clients[c];
      try {
        const ua = client === CLIENT_ANDROID ? UA_ANDROID : client === CLIENT_IOS ? UA_IOS : UA_WEB;
        const res = await fetch(YT_HOSTS[h] + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': ua },
          body: JSON.stringify({ context: { client }, ...body }),
        });
        if (res.status !== 200) {
          lastErr = new Error('youtube http ' + res.status);
          continue;
        }
        return res.json();
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr || new Error('youtube unreachable');
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}

function pickThumb(thumbs) {
  if (!Array.isArray(thumbs) || !thumbs.length) return '';
  let best = null;
  let bestScore = -1;
  for (let i = 0; i < thumbs.length; i++) {
    const t = thumbs[i];
    if (!t || !t.url || !t.width || !t.height) continue;
    const ratio = t.width / t.height;
    const score = (ratio > 1.5 && ratio < 1.9 ? 2 : 0) + (t.width >= 160 ? 1 : 0) - (t.width > 1280 ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = t.url;
    }
  }
  return best || (thumbs[thumbs.length - 1] && thumbs[thumbs.length - 1].url) || '';
}

export function parseSearch(data) {
  const out = [];
  const sr = data && data.contents && data.contents.twoColumnSearchResultsRenderer;
  const contents =
    sr && sr.primaryContents && sr.primaryContents.sectionListRenderer && sr.primaryContents.sectionListRenderer.contents;
  if (!Array.isArray(contents)) return out;
  for (let i = 0; i < contents.length; i++) {
    const sec = contents[i] && contents[i].itemSectionRenderer;
    if (!sec || !Array.isArray(sec.contents)) continue;
    for (let j = 0; j < sec.contents.length; j++) {
      const vr = sec.contents[j] && sec.contents[j].videoRenderer;
      if (!vr || !vr.videoId) continue;
      out.push({
        id: vr.videoId,
        title: (vr.title && vr.title.runs && vr.title.runs[0] && vr.title.runs[0].text) || '',
        author: (vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] && vr.ownerText.runs[0].text) || '',
        duration: (vr.lengthText && vr.lengthText.simpleText) || '',
        views: (vr.viewCountText && vr.viewCountText.simpleText) || '',
        published: (vr.publishedTimeText && vr.publishedTimeText.simpleText) || '',
        thumb: pickThumb(vr.thumbnail && vr.thumbnail.thumbnails),
      });
    }
  }
  return out;
}

function pickAudio(fmts) {
  const order = [140, 139, 251, 250, 249, 599, 600];
  const byItag = {};
  const list = [];
  for (let i = 0; i < (fmts || []).length; i++) {
    const f = fmts[i];
    if (f && f.audioChannels && f.url) {
      byItag[f.itag] = f;
      list.push(f);
    }
  }
  for (let i = 0; i < order.length; i++) {
    if (byItag[order[i]]) return byItag[order[i]];
  }
  return list[0] || null;
}

export function parsePlayer(data) {
  const vd = (data && data.videoDetails) || {};
  const play = (data && data.playabilityStatus) || {};
  if (play.status && play.status !== 'OK') {
    const err = new Error(play.reason || play.status);
    err.code = play.status;
    throw err;
  }
  const f = pickAudio(data && data.streamingData && data.streamingData.adaptiveFormats);
  return {
    id: vd.videoId || '',
    title: vd.title || '',
    author: vd.author || '',
    seconds: parseInt(vd.lengthSeconds, 10) || 0,
    thumb: pickThumb(vd.thumbnail && vd.thumbnail.thumbnails),
    itag: f ? f.itag : null,
    mime: f ? (f.mimeType || '').split(';')[0] : '',
    size: f ? parseInt(f.contentLength, 10) || 0 : 0,
    url: f ? f.url : '',
  };
}

// elenca tutti i formati scaricabili (progressive = video+audio, video-only,
// audio-only). Usato da /formats e da /stream quando si sceglie l'itag.
export function parsePlayerFormats(data) {
  const vd = (data && data.videoDetails) || {};
  const play = (data && data.playabilityStatus) || {};
  if (play.status && play.status !== 'OK') {
    const err = new Error(play.reason || play.status);
    err.code = play.status;
    throw err;
  }
  const sd = (data && data.streamingData) || {};
  const formats = [];
  const push = (f, kind) => {
    if (!f || !f.url) return;
    const bitrate = f.bitrate || 0;
    const height = f.height || 0;
    const isWebm = /webm/.test(f.mimeType || '');
    let label = null;
    if (kind === 'audio') {
      // es. "128 kbps AAC" / "opus 160 kbps"
      const codec = isWebm ? 'Opus' : 'AAC';
      label = Math.round(bitrate / 1000) + ' kbps ' + codec;
    } else if (kind === 'video') {
      label = (f.qualityLabel || (height ? height + 'p' : '')) + ' (solo video)';
    } else {
      label = (f.qualityLabel || (height ? height + 'p' : '')) + ' (video + audio)';
    }
    formats.push({
      itag: f.itag,
      url: f.url,
      mime: (f.mimeType || '').split(';')[0],
      label,
      bitrate,
      height,
      size: parseInt(f.contentLength, 10) || 0,
      kind,
    });
  };
  (sd.formats || []).forEach((f) => push(f, 'progressive'));
  (sd.adaptiveFormats || []).forEach((f) => push(f, f.audioChannels ? 'audio' : 'video'));
  return {
    id: vd.videoId || '',
    title: vd.title || '',
    author: vd.author || '',
    seconds: parseInt(vd.lengthSeconds, 10) || 0,
    thumb: pickThumb(vd.thumbnail && vd.thumbnail.thumbnails),
    formats,
  };
}

/* estensione file in base al mime (per il Content-Disposition) */
function extForMime(mime) {
  if (/webm/.test(mime || '')) return 'webm';
  if (/audio\/mp4|m4a|aac|mp4a/.test(mime || '')) return 'm4a';
  if (/video\/mp4|mp4/.test(mime || '')) return 'mp4';
  if (/ogg|opus/.test(mime || '')) return 'ogg';
  return 'bin';
}

export function parsePlaylist(data) {
  const watch = data && data.contents && data.contents.twoColumnWatchNextResults;
  const panel = watch && watch.playlist && watch.playlist.playlist;
  if (!panel || !Array.isArray(panel.contents)) return null;
  const items = [];
  for (let i = 0; i < panel.contents.length; i++) {
    const pv = panel.contents[i] && panel.contents[i].playlistPanelVideoRenderer;
    if (!pv || !pv.videoId) continue;
    let author = '';
    const runs = pv.longBylineText && pv.longBylineText.runs;
    if (runs) for (let k = 0; k < runs.length; k++) author += runs[k].text;
    let dur = (pv.lengthText && pv.lengthText.simpleText) || '';
    if (!dur && pv.lengthText && pv.lengthText.accessibility && pv.lengthText.accessibility.accessibilityData) {
      dur = pv.lengthText.accessibility.accessibilityData.label || '';
    }
    items.push({
      id: pv.videoId,
      title: (pv.title && pv.title.simpleText) || '',
      author,
      duration: dur,
      thumb: pickThumb(pv.thumbnail && pv.thumbnail.thumbnails),
    });
  }
  return { id: panel.playlistId || '', title: panel.title || '', items };
}

/* ---------- fallback HTML per la ricerca ---------- */

function extractInitialData(html) {
  const idx = html.indexOf('ytInitialData');
  if (idx < 0) return null;
  const start = html.indexOf('{', idx);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  return null;
}

async function searchHtmlFallback(query) {
  const res = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), {
    headers: { 'User-Agent': UA_WEB },
  });
  if (!res.ok) throw new Error('search html http ' + res.status);
  const html = await res.text();
  const data = extractInitialData(html);
  if (!data) throw new Error('search html: ytInitialData non trovato');
  return parseSearch(data);
}

async function doSearch(query) {
  try {
    const data = await innertube('/search', [CLIENT_WEB], { query });
    const results = parseSearch(data);
    if (results.length) return results;
    // risposta vuota (es. bot-challenge): ripiega sulla pagina HTML
  } catch (e) {
    /* ripiega sulla pagina HTML */
  }
  return searchHtmlFallback(query);
}

/* ---------- audio ---------- */

const CLIENTS_PLAYER = [CLIENT_ANDROID, CLIENT_IOS];

// visitorData fresco dalle pagine HTML (non challenge): aiuta a superare
// i bot-challenge intermittenti di YouTube sugli IP di datacenter.
let vdCache = null;
let vdAt = 0;
async function getVisitorData(force) {
  if (!force && vdCache && Date.now() - vdAt < 2 * 60 * 1000) return vdCache;
  try {
    const res = await fetch('https://www.youtube.com/results?search_query=youtube', {
      headers: { 'User-Agent': UA_WEB },
    });
    if (!res.ok) return vdCache || null;
    const html = await res.text();
    const m = html.match(/"visitorData":"([^"]+)"/);
    vdCache = m ? m[1] : (vdCache || null);
    vdAt = Date.now();
  } catch (e) {
    /* usa l'ultimo visitorData se presente */
  }
  return vdCache;
}


// esegue fn con ogni client (2 giri, visitorData fresco al secondo) finche'
// non restituisce un valore; raccoglie anche le risposte parziali.
// Se pot (PO token) è presente, lo inietta nel context del client: è il
// meccanismo che YouTube usa per i client Web; per ANDROID aiuta a superare
// il bot-challenge (token generato offline con un client fidato).
async function withClients(fn, pot) {
  let lastErr = null;
  const results = [];
  for (let round = 0; round < 2; round++) {
    const vd = await getVisitorData(round === 1);
    let clients = vd ? CLIENTS_PLAYER.map((c) => ({ ...c, visitorData: vd })) : CLIENTS_PLAYER;
    if (pot) clients = clients.map((c) => ({ ...c, poToken: pot }));
    for (let c = 0; c < clients.length; c++) {
      try {
        const value = await fn(clients[c]);
        if (value) results.push(value);
      } catch (e) {
        lastErr = e; // playability errata o http: prova il client successivo
      }
    }
    if (results.length) break;
  }
  if (!results.length) throw lastErr || new Error('nessun formato disponibile');
  return results;
}

async function getAudioInfo(id, pot) {
  const infos = await withClients(async (client) => {
    const data = await innertube('/player', [client], { videoId: id });
    const info = parsePlayer(data);
    return info.url ? info : null;
  }, pot);
  return infos[0];
}

async function getFormats(id, pot) {
  const parsed = await withClients(async (client) => {
    const data = await innertube('/player', [client], { videoId: id });
    return parsePlayerFormats(data);
  }, pot);
  // unisce i formati di tutti i client (dedup per itag, preferisce chi ha size)
  const byItag = {};
  for (let i = 0; i < parsed.length; i++) {
    for (let j = 0; j < parsed[i].formats.length; j++) {
      const f = parsed[i].formats[j];
      const prev = byItag[f.itag];
      if (!prev || (f.size && !prev.size)) byItag[f.itag] = f;
    }
  }
  const formats = Object.keys(byItag).map((k) => byItag[k]);
  return { info: parsed[0], formats };
}

function sanitizeName(name) {
  const clean = String(name || 'audio')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
  return clean || 'audio';
}

async function streamAudio(id, itag, request, pot) {
  const url = new URL(request.url);
  const base = sanitizeName(url.searchParams.get('name')) || 'download';

  // raccoglie gli URL del formato richiesto da tutti i client e prova
  // ciascuno: se uno solo passa, il download funziona
  const candidates = [];
  let mime = '';
  let lastErr = null;
  await withClients(async (client) => {
    const data = await innertube('/player', [client], { videoId: id });
    const parsed = parsePlayerFormats(data);
    const all = parsed.formats;
    const match = itag ? all.find((f) => String(f.itag) === String(itag)) : pickAudioFmt(all);
    if (match && match.url) {
      if (!mime) mime = match.mime;
      candidates.push(match.url);
      return match;
    }
    return null;
  }, pot);

  const headers = { 'User-Agent': UA_ANDROID };
  const range = request.headers.get('Range');
  if (range) headers['Range'] = range;
  for (let i = 0; i < candidates.length; i++) {
    try {
      const res = await fetch(candidates[i], { headers });
      if (res.ok || res.status === 206) {
        const out = new Response(res.body, res);
        out.headers.set('Access-Control-Allow-Origin', '*');
        out.headers.set('Content-Disposition', 'attachment; filename="' + base + '.' + extForMime(mime) + '"');
        return out;
      }
      lastErr = new Error('stream http ' + res.status);
    } catch (e) {
      lastErr = e;
    }
  }
  const err = new Error(lastErr && lastErr.message ? lastErr.message : 'stream non riuscito');
  err.code = lastErr && lastErr.code ? lastErr.code : 'STREAM_FAILED';
  throw err;
}

function pickAudioFmt(formats) {
  const order = [140, 139, 251, 250, 249, 599, 600];
  for (let i = 0; i < order.length; i++) {
    const f = formats.find((x) => x.itag === order[i] && x.kind === 'audio');
    if (f) return f;
  }
  return formats.find((x) => x.kind === 'audio') || null;
}

const ID_RE = /^[\w-]{6,20}$/;

/* PO token, in ordine:
   1. parametro ?pot= (override, utile per test)
   2. variabile d'ambiente POT (generato offline con un client fidato)
   3. generazione locale nel worker (worker/pot.js): il token supera il
      bot-challenge sugli IP datacenter (vedi pot.selfhost). */
async function potFrom(q) {
  const fromQuery = (q.get('pot') || '').trim().slice(0, 2048);
  if (fromQuery) return fromQuery;
  try {
    const env = (typeof POT !== 'undefined' && POT) || '';
    if (env) return env;
  } catch (e) { /* ignora */ }
  try {
    return getPoToken();
  } catch (e) { /* ignora */ }
  return '';
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    const q = url.searchParams;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    try {
      if (path === '/search') {
        const query = (q.get('q') || '').trim().slice(0, 100);
        if (!query) return json({ error: 'missing', message: 'parametro q mancante' }, 400);
        return json({ query, results: await doSearch(query) });
      }
      if (path === '/info') {
        const id = (q.get('id') || '').trim();
        if (!ID_RE.test(id)) return json({ error: 'bad id', message: 'id non valido' }, 400);
        return json(await getAudioInfo(id, await potFrom(q)));
      }
      if (path === '/formats') {
        const id = (q.get('id') || '').trim();
        if (!ID_RE.test(id)) return json({ error: 'bad id', message: 'id non valido' }, 400);
        const { info, formats } = await getFormats(id, await potFrom(q));
        // raggruppa per tipo, ordinati per qualita'
        const audio = formats.filter((f) => f.kind === 'audio').sort((a, b) => b.bitrate - a.bitrate);
        const progressive = formats.filter((f) => f.kind === 'progressive').sort((a, b) => b.height - a.height);
        const video = formats.filter((f) => f.kind === 'video').sort((a, b) => b.height - a.height);
        return json({
          id: info.id,
          title: info.title,
          author: info.author,
          seconds: info.seconds,
          thumb: info.thumb,
          audio,
          progressive,
          video,
        });
      }
      if (path === '/playlist') {
        const list = (q.get('list') || '').trim().slice(0, 60);
        if (!list) return json({ error: 'missing', message: 'parametro list mancante' }, 400);
        const data = await innertube('/next', [CLIENT_WEB], { playlistId: list });
        const pl = parsePlaylist(data);
        if (!pl) return json({ error: 'not found', message: 'playlist non trovata' }, 404);
        return json(pl);
      }
      if (path === '/stream') {
        const id = (q.get('id') || '').trim();
        if (!ID_RE.test(id)) return json({ error: 'bad id', message: 'id non valido' }, 400);
        const itag = (q.get('itag') || '').trim();
        return streamAudio(id, itag || null, request, await potFrom(q));
      }
      return json({ ok: true, name: 'yt-downloader engine', endpoints: ['/search', '/info', '/formats', '/playlist', '/stream'] });
    } catch (e) {
      return json({ error: e.code || 'internal', message: e.message || 'errore interno' }, e.code ? 422 : 500);
    }
  },
};
