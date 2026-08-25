// yt-downloader — entrypoint per Deno Deploy.
// Riutilizza lo stesso codice dell'engine Cloudflare (unica fonte di verita').
// La logica e' standard Web API (fetch/Request/Response/URL): funziona
// identica su entrambe le piattaforme. Avere due deploy su provider diversi
// (Cloudflare + Deno) significa due pool di IP diversi: quando YouTube mette
// in cooldown gli IP di un provider, la pagina passa automaticamente all'altro.
export { default } from "../worker/index.js";
