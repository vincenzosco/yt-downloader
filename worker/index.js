// yt-downloader — engine (Cloudflare Workers)
//
// Endpoint (tutti GET, CORS *):
//   /search?q=...         → { query, results: [{id,title,author,duration,views,published,thumb}] }
//   /info?id=...          → { id,title,author,seconds,thumb,itag,mime,size,url }
//   /playlist?list=...    → { id,title,items: [{id,title,author,duration,thumb}] }
//   /stream?id=...&name=… → audio (bytes), CORS *, supporta Range
//   /                     → { ok:true, name, endpoints }
//
// Nota: YouTube blocca le chiamate che arrivano con header Origin (quindi il
// browser non puo' chiamarlo direttamente). Qui le richieste partono dal
// server, senza Origin, e funzionano.

const YT_API = 'https://www.youtube.com/youtubei/v1';

const UA_WEB =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const UA_ANDROID = 'com.google.android.youtube/20.14.37 (Linux; U; Android 11) gzip';

export const CLIENT_WEB = { clientName: 'WEB', clientVersion: '2.20250605.01.00' };
export const CLIENT_ANDROID = {
  clientName: 'ANDROID',
  clientVersion: '20.14.37',
  androidSdkVersion: 30,
};

// Piccola cache in-isolate del player (videoId → url audio), TTL 5 min.
const playerCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cacheUrl(id, url) {
  if (url) playerCache.set(id, { url, at: Date.now() });
}
function getCachedUrl(id) {
  const c = playerCache.get(id);
  if (!c) return null;
  if (Date.now() - c.at > CACHE_TTL) {
    playerCache.delete(id);
    return null;
  }
  return c.url;
}

export async function innertube(path, client, body) {
  const res = await fetch(YT_API + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': client === CLIENT_ANDROID ? UA_ANDROID : UA_WEB,
    },
    body: JSON.stringify({ context: { client }, ...body }),
  });
  if (res.status !== 200) throw new Error('youtube http ' + res.status);
  return res.json();
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
  // preferisce un'immagine 16:9 con larghezza decente
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
  // preferisce m4a (itag 140/139), poi opus (251/250/249), poi 599/600
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

async function getAudioUrl(id) {
  const cached = getCachedUrl(id);
  if (cached) return cached;
  const data = await innertube('/player', CLIENT_ANDROID, { videoId: id });
  const info = parsePlayer(data);
  if (!info.url) {
    const err = new Error('nessun formato audio disponibile');
    err.code = 'NO_AUDIO';
    throw err;
  }
  cacheUrl(id, info.url);
  return info.url;
}

function sanitizeName(name) {
  const clean = String(name || 'audio')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
  return clean || 'audio';
}

async function streamAudio(id, request) {
  const url = new URL(request.url);
  const name = sanitizeName(url.searchParams.get('name')) + '.m4a';
  const audioUrl = await getAudioUrl(id);
  const headers = { 'User-Agent': UA_ANDROID };
  const range = request.headers.get('Range');
  if (range) headers['Range'] = range;
  const res = await fetch(audioUrl, { headers });
  if (!res.ok && res.status !== 206) throw new Error('stream http ' + res.status);
  const out = new Response(res.body, res);
  out.headers.set('Access-Control-Allow-Origin', '*');
  out.headers.set('Content-Disposition', "attachment; filename=\"" + name + '"');
  return out;
}

const ID_RE = /^[\w-]{6,20}$/;

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
        const data = await innertube('/search', CLIENT_WEB, { query });
        return json({ query, results: parseSearch(data) });
      }
      if (path === '/info') {
        const id = (q.get('id') || '').trim();
        if (!ID_RE.test(id)) return json({ error: 'bad id', message: 'id non valido' }, 400);
        const data = await innertube('/player', CLIENT_ANDROID, { videoId: id });
        const info = parsePlayer(data);
        cacheUrl(id, info.url);
        return json(info);
      }
      if (path === '/playlist') {
        const list = (q.get('list') || '').trim().slice(0, 60);
        if (!list) return json({ error: 'missing', message: 'parametro list mancante' }, 400);
        const data = await innertube('/next', CLIENT_WEB, { playlistId: list });
        const pl = parsePlaylist(data);
        if (!pl) return json({ error: 'not found', message: 'playlist non trovata' }, 404);
        return json(pl);
      }
      if (path === '/stream') {
        const id = (q.get('id') || '').trim();
        if (!ID_RE.test(id)) return json({ error: 'bad id', message: 'id non valido' }, 400);
        return streamAudio(id, request);
      }
      return json({ ok: true, name: 'yt-downloader engine', endpoints: ['/search', '/info', '/playlist', '/stream'] });
    } catch (e) {
      return json({ error: e.code || 'internal', message: e.message || 'errore interno' }, e.code ? 422 : 500);
    }
  },
};
