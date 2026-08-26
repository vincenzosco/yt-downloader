// worker/proxy-list.js — gestore di liste proxy pubbliche (5 sorgenti).
//
// Cosa fa:
//   1. Scarica le liste proxy da 5 sorgenti verificate attive (lug 2026).
//   2. Per ogni sorgente fa un "check di salute": se l'HTTP fallisce, il
//      JSON/TXT è illeggibile o la lista è vuota, la sorgente è marcata
//      morta (con consecutive failures) e si prova comunque a ripescarla
//      al refresh successivo (auto-refresh, mai "morta per sempre").
//   3. Deduplica per host:porta e tiene una cache in-memory con TTL.
//      Allo scadere del TTL la prossima lettura rifà il refresh in modo
//      lazy (nessun cron necessario sul piano gratuito).
//
// ⚠️ Onestà tecnica (importante):
//   Sul piano gratuito di Cloudflare Workers `fetch()` NON può instradare le
//   richieste attraverso un proxy (non esiste un'opzione "proxy"), e l'API
//   `connect()`/TCP che servirebbe per il tunnel CONNECT richiede un piano a
//   pagamento. Quindi queste liste NON vengono (e non possono essere) usate
//   per far passare le richieste YouTube da un IP diverso dentro il worker.
//   Inoltre i proxy gratuiti sono quasi tutti IP di datacenter — la stessa
//   categoria di IP che YouTube flagga con il bot-challenge. Il modulo è
//   comunque utile come infrastruttura (endpoint /proxies) e per un futuro
//   engine esterno in grado di usarli.

const SOURCES = [
  {
    name: 'proxyscrape',
    url: 'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&protocol=http&proxy_format=ipport&format=text',
    type: 'text',
  },
  {
    name: 'geonode',
    url: 'https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc&protocols=http',
    type: 'geonode',
  },
  {
    name: 'proxifly',
    url: 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt',
    type: 'text',
  },
  {
    name: 'iplocate',
    url: 'https://raw.githubusercontent.com/iplocate/free-proxy-list/main/protocols/http.txt',
    type: 'text',
  },
  {
    name: 'thespeedx',
    url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
    type: 'text',
  },
];

const TTL_MS = 15 * 60 * 1000; // refresh lazy ogni 15 minuti
const FETCH_TIMEOUT_MS = 8000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

let cache = null; // { at, proxies: string[], health: {...} }
let refreshing = null; // promise del refresh in corso

function now() { return Date.now(); }

function parseIpPort(line) {
  const s = String(line || '').trim();
  if (!s) return null;
  // accetta "host:port", "http://host:port", "host\tport"
  const cleaned = s.replace(/^https?:\/\//i, '').replace(/[\s]+/g, ':');
  const m = cleaned.match(/^([^:\/]+):(\d{1,5})/);
  if (!m) return null;
  const port = parseInt(m[2], 10);
  if (!port || port < 1 || port > 65535) return null;
  return m[1] + ':' + m[2];
}

function parseText(body) {
  const out = [];
  const lines = String(body || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const p = parseIpPort(lines[i]);
    if (p) out.push(p);
  }
  return out;
}

function parseGeonode(json) {
  const out = [];
  const data = json && json.data;
  if (!Array.isArray(data)) return out;
  for (let i = 0; i < data.length; i++) {
    const it = data[i];
    if (!it || !it.ip || !it.port) continue;
    const p = parseIpPort(it.ip + ':' + it.port);
    if (p) out.push(p);
  }
  return out;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': '*/*' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSource(src) {
  try {
    const res = await fetchWithTimeout(src.url, FETCH_TIMEOUT_MS);
    if (!res.ok) return { src, proxies: [], err: 'http ' + res.status };
    const body = await res.text();
    const proxies =
      src.type === 'geonode' ? parseGeonode(JSON.parse(body)) : parseText(body);
    if (!proxies.length) return { src, proxies: [], err: 'lista vuota' };
    return { src, proxies, err: null };
  } catch (e) {
    return { src, proxies: [], err: e && e.message ? e.message : 'fetch fallito' };
  }
}

async function doRefresh() {
  const results = await Promise.all(SOURCES.map(fetchSource));
  const seen = new Set();
  const proxies = [];
  const health = {};
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    health[r.src.name] = {
      ok: !r.err,
      error: r.err || null,
      count: r.proxies.length,
    };
    for (let j = 0; j < r.proxies.length; j++) {
      const p = r.proxies[j];
      if (!seen.has(p)) {
        seen.add(p);
        proxies.push(p);
      }
    }
  }
  return { at: now(), proxies, health };
}

export async function getProxyReport() {
  if (cache && now() - cache.at < TTL_MS) return cache;
  if (refreshing) return refreshing;
  refreshing = doRefresh().finally(() => { refreshing = null; });
  const result = await refreshing;
  cache = result;
  return result;
}

export default { getProxyReport };
