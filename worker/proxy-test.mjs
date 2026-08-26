import { getProxyReport } from './proxy-list.js';

const r = await getProxyReport();
console.log('aggiornato:', new Date(r.at).toISOString());
console.log('totale proxy unici:', r.proxies.length);
for (const [name, h] of Object.entries(r.health)) {
  console.log(`  ${name.padEnd(11)} ok=${h.ok} count=${h.count} ${h.error ? 'err=' + h.error : ''}`);
}
console.log('campione:', r.proxies.slice(0, 5).join(', '));
