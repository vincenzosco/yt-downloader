// worker/pot.js — generazione del PO token dentro il Cloudflare Worker.
//
// Strategia (senza account aggiuntivi, nessun deploy nuovo): YouTube manda
// il bot-challenge ("Sign in to confirm you're not a bot") sugli IP dei
// datacenter. Il PO token (Proof of Origin) supera il blocco. Questo modulo
// riproduce il flusso di bgutils-js dentro il worker:
//   1. challenge dalla homepage (ytcfg + ytAtN)
//   2. esecuzione della VM BotGuard via new Function
//   3. GenerateIT via WAA -> token (integrity oppure websafeFallback)
//
// Nota Cloudflare: new Function/eval nell'isolate worker è permesso solo in
// fase di STARTUP. Quindi il token va generato all'avvio del modulo (module
// top-level) e cachato; TTL (10h < validità 12h) garantisce il refresh.
// Il worker stateless può riavviarsi spesso: generiamo il token una sola
// volta per isolate. Se la generazione fallisce, l'engine ripiega su
// visitorData + retry.
//
// La VM BotGuard si aspetta un ambiente browser (window/document/canvas):
// installShim() fornisce dei proxy minimi che la fanno partire. Nel worker
// edge non c'è JSDOM, quindi i get gl'canvas sono stub (l'attestazione
// completa (integrity token) riuscirà solo parzialmente; resta valido il
// websafeFallbackToken, che supera il LOGIN_REQUIRED sugli IP datacenter.

import { BotGuardClient } from "bgutils-js/botguard";
import { getHeaders, buildURL, parseLooseJSON, USER_AGENT } from "bgutils-js/utils";

const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";

let godToken = null;
let godTokenAt = 0;
let generating = null; // promise di generazione in corso

function isFresh(v) {
  return !!v && Date.now() - godTokenAt < 10 * 60 * 60 * 1000; // 10h
}

/* ---------- shim DOM minimale (la VM BotGuard tocca questi globali) ---------- */
function installShim() {
  const g = globalThis;
  if (g.__potShimInstalled) return;
  g.__potShimInstalled = true;

  const makeEl = (tag) => ({
    tagName: String(tag || "").toUpperCase(),
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute() {},
    getAttribute() { return null; },
    addEventListener() {},
    removeEventListener() {},
    appendChild() { return null; },
    removeChild() { return null; },
    insertBefore() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getContext: (type) =>
      type === "2d"
        ? new Proxy({}, {
            get(_t, p) {
              if (p === "canvas") return makeEl("canvas");
              if (typeof p === "string") return () => null;
              return undefined;
            },
            set() { return true; },
          })
        : null,
    toDataURL: () => "",
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }),
    ownerDocument: { cookie: "", documentElement: { getAttribute: () => null } },
    parentNode: null,
    textContent: "",
    innerHTML: "",
    value: "",
    checked: false,
    type: "",
  });

  const doc = {
    cookie: "",
    documentElement: {
      getAttribute: () => null,
      setAttribute() {},
      style: {},
      clientWidth: 1280,
      clientHeight: 720,
    },
    head: { appendChild() {}, insertBefore() {} },
    body: makeEl("body"),
    createElement: (t) => makeEl(t),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    createEvent: () => ({ initEvent() {} }),
    title: "",
    readyState: "complete",
    location: { href: "https://www.youtube.com/", hostname: "www.youtube.com", origin: "https://www.youtube.com" },
  };

  g.window = {
    location: doc.location,
    document: doc,
    navigator: g.navigator,
    screen: { width: 1280, height: 720, availWidth: 1280, availHeight: 720, colorDepth: 24 },
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720,
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    matchMedia: () => ({ matches: false, addListener() {}, removeListener() {} }),
    performance: g.performance,
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    postMessage() {},
    HTMLElement: g.HTMLElement || function () {},
    TextEncoder: g.TextEncoder,
    TextDecoder: g.TextDecoder,
    Uint8Array: g.Uint8Array,
    ArrayBuffer: g.ArrayBuffer,
    Date: g.Date,
    Math: g.Math,
    JSON: g.JSON,
    navigator: g.navigator,
  };
  g.document = doc;
  g.location = doc.location;
  try { g.origin = doc.location.origin; } catch (e) { /* read-only nei worker */ }
  if (!g.navigator) {
    g.navigator = {
      userAgent: USER_AGENT,
      platform: "MacIntel",
      language: "en-US",
      languages: ["en-US", "en"],
      cookieEnabled: true,
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      webdriver: false,
      plugins: { length: 0 },
      mimeTypes: { length: 0 },
      vendor: "Google Inc.",
    };
  }
}

/* ---------- generazione ---------- */

async function fetchHomepageChallenge() {
  const res = await fetch("https://www.youtube.com", {
    headers: { accept: "*/*", "accept-language": "en-US,en;q=0.7", "user-agent": USER_AGENT },
  });
  const html = await res.text();

  const ytcfgMatch = html.match(/ytcfg\.set\(({.+?})\);/s);
  if (ytcfgMatch) globalThis.yt = { config_: JSON.parse(ytcfgMatch[1]) };

  const attMatch = html.match(/window\.ytAtN\(\s*({[\s\S]*?})\s*\)/);
  if (!attMatch) throw new Error("ytAtN non trovato nella homepage");
  const attData = parseLooseJSON(attMatch[1]);
  const bgChallenge = attData?.R?.bgChallenge;
  if (!bgChallenge?.program || !bgChallenge?.interpreterUrl) {
    throw new Error("bgChallenge mancante nella homepage");
  }
  return bgChallenge;
}

async function generateToken() {
  const challenge = await fetchHomepageChallenge();
  const interpreterUrl =
    challenge.interpreterUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;
  const jsRes = await fetch(`https:${interpreterUrl}`);
  const interpreterJS = await jsRes.text();
  new Function(interpreterJS)();

  const bgClient = await BotGuardClient.create({
    program: challenge.program,
    globalName: challenge.globalName,
    globalObject: globalThis,
  });

  const webPoSignalOutput = [];
  const botguardResponse = await bgClient.snapshot({ webPoSignalOutput });

  const itResp = await fetch(buildURL("GenerateIT", false), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify([REQUEST_KEY, botguardResponse]),
  });
  const itData = await itResp.json();

  // [integrityToken, ttl, refreshThreshold, websafeFallbackToken]
  const token = itData?.[3] || itData?.[0] || "";
  if (!token) throw new Error("GenerateIT senza token");
  return token;
}

// Genera all'avvio del modulo e, su richiesta, rigenera se il token è scaduto.
installShim();
function kickGenerate() {
  generating = generateToken()
    .then((t) => { godToken = t; godTokenAt = Date.now(); })
    .catch(() => { /* ignora */ })
    .finally(() => { generating = null; });
}
try { kickGenerate(); } catch (e) { /* ignora */ }

export async function getPoToken() {
  if (isFresh(godToken)) return godToken;
  // Non fresco: rigenera su richiesta (seriale, senza duplicare).
  if (!generating) { try { kickGenerate(); } catch (e) { return ''; } }
  try { await generating; } catch (e) { return ''; }
  return isFresh(godToken) ? godToken : '';
}