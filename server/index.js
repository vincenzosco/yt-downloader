// server/index.js — esegue l'engine del downloader (worker/index.js) come
// server Node normale, fuori da Cloudflare. Utile per self-hosting su un NAS
// o VPS con IP residenziale (meno flaggato da YouTube rispetto a un IP
// datacenter).
//
// Uso:  node server/index.js            (porta 8787, o PORT=xxxx)
//       PORT=9000 node server/index.js
//
// Nota: pot.js genera il PO token con new Function (BotGuard): nei Cloudflare
// Workers è permesso solo in startup, ma qui siamo in Node quindi va sempre.
// Le variabili d'ambiente POT/PORT vengono lette se presenti.

import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// il server deve restare su (NAS/VPS): un errore isolato non deve ucciderlo
process.on('uncaughtException', (e) => console.error('[server] uncaughtException:', e && e.stack ? e.stack : e));
process.on('unhandledRejection', (e) => console.error('[server] unhandledRejection:', e && e.stack ? e.stack : e));

// rende disponibile POT (token pre-generato, opzionale) al worker
if (process.env.POT) globalThis.POT = process.env.POT;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const worker = await import(path.join(__dirname, '..', 'worker', 'index.js')).then((m) => m.default);

// ---- registrazione del tunnel sul worker Cloudflare ----
// Il NAS registra il suo URL pubblico corrente (trycloudflare, che cambia a
// ogni riavvio) sul worker: la pagina lo scopre via /nas e lo usa come engine
// preferito. La chiave evita che chiunque registri un NAS farlocco.
// Env:  REGISTER_WORKER (URL del worker, es. https://xxx.workers.dev)
//       NAS_REGISTER_KEY  (chiave condivisa col worker)
const REGISTER_WORKER = (process.env.REGISTER_WORKER || '').replace(/\/+$/, '');
const REGISTER_KEY = process.env.NAS_REGISTER_KEY || '';

function tunnelUrlFromLog() {
  try {
    const log = fs.readFileSync(path.join(__dirname, '..', 'server.log.cloudflared'), 'utf8');
    // il log accumula gli URL delle sessioni passate: serve l'ULTIMO
    const m = log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g);
    if (m && m.length) return m[m.length - 1];
  } catch (_e) { /* log non ancora presente */ }
  return null;
}

let lastRegisteredUrl = null;
async function registerTunnel() {
  if (!REGISTER_WORKER || !REGISTER_KEY) return;
  const url = tunnelUrlFromLog();
  if (!url) return;
  // heartbeat: registra sempre (il worker scarta il NAS dopo 3 min di silenzio).
  // Log solo quando l'URL cambia per non sporcare il log ogni 60s.
  try {
    const res = await fetch(REGISTER_WORKER + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, key: REGISTER_KEY }),
    });
    if (res.ok) {
      if (url !== lastRegisteredUrl) {
        lastRegisteredUrl = url;
        console.log('[nas] registrato su worker:', url);
      }
    } else {
      console.error('[nas] registrazione fallita:', res.status, (await res.text()).slice(0, 120));
    }
  } catch (e) {
    console.error('[nas] registrazione errore:', e.message);
  }
}

// registra subito e poi ogni 60s (l'URL del tunnel può cambiare)
registerTunnel();
setInterval(registerTunnel, 60 * 1000);

const PORT = parseInt(process.env.PORT || '8787', 10);

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, 'http://' + host);
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (v !== undefined) headers[k] = v;
    }

    let body = null;
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const chunks = [];
      body = await new Promise((resolve, reject) => {
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
    }

    // endpoint locale: URL pubblico corrente del tunnel (leggi dal log cloudflared)
    if (url.pathname === '/tunnel-url') {
      const logFile = path.join(__dirname, '..', 'server.log.cloudflared');
      let tunnelUrl = null;
      try {
        const log = await import('node:fs/promises').then((fs) => fs.readFile(logFile, 'utf8'));
        const m = log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g);
        if (m && m.length) tunnelUrl = m[m.length - 1];
      } catch (_e) { /* log non ancora presente */ }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ tunnelUrl, local: 'http://' + host }));
      return;
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: body && body.length ? new Uint8Array(body) : null,
    });

    const response = await worker.fetch(request);

    const outHeaders = {};
    response.headers.forEach((v, k) => { outHeaders[k] = v; });
    res.writeHead(response.status, outHeaders);

    if (response.body) {
      for await (const chunk of response.body) res.write(chunk);
    }
    res.end();
  } catch (e) {
    console.error('[server] errore:', e && e.stack ? e.stack : e);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    }
    res.end(JSON.stringify({ error: 'internal', message: e && e.message ? e.message : 'errore interno' }));
  }
});

server.listen(PORT, () => {
  console.log('engine yt-downloader in ascolto su http://0.0.0.0:' + PORT);
});
