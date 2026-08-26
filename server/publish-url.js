// server/publish-url.js — pubblica l'URL corrente del tunnel trycloudflare
// nel repo GitHub (file nas-url.txt). La pagina su GitHub Pages lo legge
// direttamente: l'indirizzo del NAS resta sempre aggiornato, anche dopo un
// riavvio del NAS, senza dipendere dal worker Cloudflare.
//
// Env:
//   GITHUB_TOKEN   fine-grained PAT con "Contents: Read and write" sul repo
//   GITHUB_REPO    default: vincenzosco/yt-downloader
//   GITHUB_FILE    default: nas-url.txt
//
// Scrive SOLO quando l'URL cambia (il tunnel cambia URL a ogni riavvio):
// nessuno spam di commit e nessun problema di rate limit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = process.env.GITHUB_REPO || 'vincenzosco/yt-downloader';
const FILE = process.env.GITHUB_FILE || 'nas-url.txt';
const API = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
// token letto a runtime (testabile; in produzione arriva da server/.env)
const hasToken = () => !!process.env.GITHUB_TOKEN;
// cache locale dell'ultimo URL pubblicato (evita riscritture identiche)
const CACHE = process.env.GITHUB_CACHE_FILE || path.join(__dirname, '.published-url');

let lastPublished = null;
try {
  lastPublished = fs.readFileSync(CACHE, 'utf8').trim() || null;
} catch (_e) { /* primo avvio */ }

export function publishedUrl() {
  return lastPublished;
}

export async function publishTunnelUrl(url) {
  if (!hasToken()) return { ok: false, cached: false, reason: 'GITHUB_TOKEN non impostato' };
  if (!url) return { ok: false, cached: false, reason: 'nessun URL' };
  const clean = String(url).trim();
  if (clean === lastPublished) return { ok: true, cached: true };
  try {
    // la GitHub API richiede lo SHA corrente del file per il PUT
    let sha = null;
    try {
      const cur = await fetch(API, {
        headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, 'User-Agent': 'ytd-nas' },
      });
      if (cur.ok) {
        const j = await cur.json();
        sha = j.sha || null;
      } else if (cur.status !== 404) {
        throw new Error('GET contents: ' + cur.status);
      }
    } catch (e) {
      return { ok: false, cached: false, reason: 'GET: ' + e.message };
    }
    const body = {
      message: 'nas: aggiorna URL tunnel',
      content: Buffer.from(clean + '\n', 'utf8').toString('base64'),
    };
    if (sha) body.sha = sha;
    const res = await fetch(API, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'ytd-nas',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, cached: false, reason: 'PUT: ' + res.status + ' ' + txt.slice(0, 150) };
    }
    try { fs.writeFileSync(CACHE, clean); } catch (_e) { /* non critico */ }
    lastPublished = clean;
    return { ok: true, cached: false };
  } catch (e) {
    return { ok: false, cached: false, reason: e.message };
  }
}
