// Test locale della generazione del PO token dentro il worker.
// Uso (dalla cartella worker): node pot-test.mjs
// Simula l'ambiente Cloudflare minimo: global fetch, niente JSDOM.
import { getPoToken } from './pot.js';

// Il modulo pot.js esegue la generazione all'avvio in maniera asincrona.
// Aspettiamo un attimo e controlliamo se il token è disponibile.
setTimeout(() => {
  const tok = getPoToken();
  console.log('getPoToken() →', tok ? 'OK, len=' + tok.length : '(vuoto)');
  if (tok) console.log('token head:', tok.slice(0, 40) + '…');
}, 4000);