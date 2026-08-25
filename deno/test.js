// Test locale: importa l'entrypoint Deno e chiama il handler come farebbe
// Deno Deploy. Uso: /tmp/denobin/bin/deno run --allow-net deno/test.js
import handler from "./main.js";

const req = new Request("https://example.test/search?q=never+gonna+give+you+up", {
  headers: { "User-Agent": "deno-test" },
});
const res = await handler.fetch(req);
const body = await res.json();
console.log("status:", res.status);
console.log("results:", body.results ? body.results.length : "n/a");
console.log("primo:", body.results && body.results[0] && body.results[0].title);
console.log("cors:", res.headers.get("access-control-allow-origin"));
