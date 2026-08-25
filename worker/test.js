// Verifica del worker contro dati reali di YouTube.
// Uso: node worker/test.js  (richiede connessione; stesso flusso del worker)

import { parseSearch, parsePlayer, parsePlaylist, CLIENT_WEB, CLIENT_ANDROID, innertube } from './index.js';

const WEB = [CLIENT_WEB];
const ANDROID = [CLIENT_ANDROID];

let failures = 0;

function check(label, cond, extra) {
  if (cond) {
    console.log('ok   - ' + label);
  } else {
    failures++;
    console.log('FAIL - ' + label + (extra ? ' :: ' + extra : ''));
  }
}

// 1. search
const s = await innertube('/search', WEB, { query: 'never gonna give you up' });
const results = parseSearch(s);
check('search restituisce risultati', results.length > 5, 'got ' + results.length);
check('primo risultato e Rick Astley', results[0] && results[0].id === 'dQw4w9WgXcQ', JSON.stringify(results[0] && results[0].id));
check('search ha titolo/autore/durata/thumb', !!(results[0] && results[0].title && results[0].author && results[0].duration && results[0].thumb));

// 2. player (formato audio senza firme)
const p = await innertube('/player', ANDROID, { videoId: 'dQw4w9WgXcQ' });
const info = parsePlayer(p);
check('player: titolo corretto', /Never Gonna/i.test(info.title || ''), info.title);
check('player: url audio presente', /^https:\/\//.test(info.url || ''), String(info.url).slice(0, 60));
check('player: itag preferito 140 (m4a)', info.itag === 140, 'itag=' + info.itag);
check('player: durata in secondi', info.seconds > 100, String(info.seconds));

// 3. playlist
const n = await innertube('/next', WEB, { playlistId: 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI' });
const pl = parsePlaylist(n);
check('playlist: items trovati', pl && pl.items.length > 20, pl && String(pl.items.length));
check('playlist: titolo presente', !!(pl && pl.title), pl && pl.title);
check('playlist: primo item con id/titolo', !!(pl && pl.items[0] && pl.items[0].id && pl.items[0].title));

// 4. video non valido → errore gestito
try {
  parsePlayer(await innertube('/player', ANDROID, { videoId: 'zzzzzzzzzzz' }));
  check('video non valido: lancia errore', false);
} catch (e) {
  check('video non valido: lancia errore con codice', !!(e.code || e.message), e.code + ' / ' + e.message);
}

console.log(failures === 0 ? '\nTUTTI I TEST PASSANO' : '\n' + failures + ' TEST FALLITI');
process.exit(failures === 0 ? 0 : 1);
