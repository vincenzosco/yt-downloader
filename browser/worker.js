// browser/worker.js — Pyodide worker che esegue yt-dlp nel browser.
// Ported from the MIT-licensed yt-dlp.wasm project (FiLL/yt-dlp-wasm).
//
// Espone:
//   - configure({ metadataProxy })  → imposta l'URL del proxy CORS (il NAS)
//   - extract(url)                  → info dict completo (JSON) di yt-dlp
//   - mux({ video, audio })         → mux MP4 via ffmpeg.wasm (opzionale)
//
// I byte audio/video vengono scaricati dal MAIN THREAD direttamente dal CDN
// (googlevideo) o tramite lo stesso proxy: qui gira solo l'estrazione dei
// metadata (~10-50KB) e l'eventuale muxing.

importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

const post = (msg) => self.postMessage(msg);
const logToMain = (s) => post({ type: "log", payload: s });

let pyodide;
let pyExtract;
let ffmpeg = null;

let metadataProxy = "";
let bootPromise = null;

// ─── IndexedDB cache ──────────────────────────────────────────────────

const DB_NAME = "ytdlp-wasm-cache";
const STORE = "wheels";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function cacheGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function cachePut(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── yt-dlp wheel install with cache ──────────────────────────────────

async function installYtDlp() {
  const KEY = "yt-dlp-wheel";
  const cached = await cacheGet(KEY);
  let bytes, version;

  if (cached && cached.bytes && cached.version) {
    bytes = cached.bytes;
    version = cached.version;
    logToMain(`Using cached yt-dlp ${version} from IndexedDB`);
  } else {
    logToMain("Looking up latest yt-dlp on PyPI…");
    const meta = await (await fetch("https://pypi.org/pypi/yt-dlp/json")).json();
    version = meta.info.version;
    const wheel = meta.urls.find(
      (u) => u.packagetype === "bdist_wheel" && /py[23]-none-any/.test(u.filename)
    );
    if (!wheel) throw new Error("No yt-dlp wheel on PyPI");
    logToMain(`Downloading yt-dlp ${version} (${(wheel.size / 1e6).toFixed(1)} MB)…`);
    bytes = new Uint8Array(await (await fetch(wheel.url)).arrayBuffer());
    await cachePut(KEY, { bytes, version, url: wheel.url, ts: Date.now() });
    logToMain(`Cached yt-dlp ${version} in IndexedDB`);
  }

  pyodide.FS.writeFile("/tmp/yt_dlp.whl", bytes);
  await pyodide.runPythonAsync(`
import micropip
try:
    await micropip.install("emfs:/tmp/yt_dlp.whl", keep_going=True)
except Exception as e:
    print("emfs install failed, falling back to PyPI:", e)
    await micropip.install("yt-dlp", keep_going=True)
print("yt-dlp ready")
`);
}

// ─── ffmpeg.wasm (lazy, solo per il mux DASH) ─────────────────────────

async function ensureFfmpeg() {
  if (ffmpeg) return ffmpeg;
  logToMain("Loading ffmpeg.wasm (one-time, ~30 MB)…");
  importScripts("https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js");
  importScripts("https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js");
  const { FFmpeg } = self.FFmpegWASM;
  ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
    wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
  });
  logToMain("ffmpeg.wasm ready");
  return ffmpeg;
}

async function muxToMp4(videoBytes, audioBytes) {
  const ff = await ensureFfmpeg();
  const v = "in_v", a = "in_a", out = "out.mp4";
  await ff.writeFile(v, videoBytes);
  await ff.writeFile(a, audioBytes);
  const code = await ff.exec(["-i", v, "-i", a, "-c", "copy", "-movflags", "faststart", out]);
  if (code !== 0) throw new Error("ffmpeg mux failed (non-zero exit)");
  const data = await ff.readFile(out);
  await Promise.all(
    [v, a, out].map((p) => ff.deleteFile(p).catch(() => {}))
  );
  return data;
}

// ─── boot ─────────────────────────────────────────────────────────────

async function boot() {
  logToMain("Loading Pyodide runtime…");
  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
    stdout: logToMain,
    stderr: logToMain,
  });

  // ssl is unvendored from Pyodide's stdlib; yt-dlp imports it.
  await pyodide.loadPackage(["micropip", "ssl"]);
  await installYtDlp();

  logToMain("Applying network monkey-patch…");
  const patchSrc = await (await fetch("./network_patch.py")).text();
  pyodide.FS.writeFile("/home/pyodide/network_patch.py", patchSrc);

  if (!metadataProxy) {
    logToMain("WARN: no metadata proxy configured — yt-dlp extraction will fail on CORS-restricted sites.");
  }

  pyodide.globals.set("__PROXY_URL__", metadataProxy || "");
  await pyodide.runPythonAsync(`
import sys
sys.path.insert(0, "/home/pyodide")
import network_patch
network_patch.install(__PROXY_URL__)
`);

  await pyodide.runPythonAsync(`
import json
import traceback
from yt_dlp import YoutubeDL

def run_extract(url: str) -> str:
    opts = {"quiet": True, "no_warnings": True, "noplaylist": True, "skip_download": True}
    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            info = ydl.sanitize_info(info)
        return json.dumps(info)
    except Exception as e:
        # NoSupportingHandlers nasconde le cause: stampa anche gli errori
        # annidati (unsupported/unexpected) per la diagnosi
        try:
            extra = ""
            if hasattr(e, "unexpected_errors"):
                parts = []
                for ue in e.unexpected_errors:
                    try:
                        parts.append("".join(traceback.format_exception(type(ue), ue, ue.__traceback__)))
                    except Exception:
                        parts.append(repr(ue))
                extra = "\\nUNEXPECTED: " + "\\n".join(parts)
            if hasattr(e, "unsupported_errors"):
                extra += "\\nUNSUPPORTED: " + repr(e.unsupported_errors)
            print(extra)
        except Exception:
            pass
        return json.dumps({"__err__": traceback.format_exc() + extra})
`);

  pyExtract = pyodide.globals.get("run_extract");
  post({ type: "ready" });
}

function ensureBooted() {
  if (!bootPromise) {
    bootPromise = boot().catch((err) => {
      logToMain(`Fatal boot error: ${err && err.stack ? err.stack : err}`);
      throw err;
    });
  }
  return bootPromise;
}

// ─── RPC handlers ─────────────────────────────────────────────────────

async function handleConfigure({ metadataProxy: proxyUrl }) {
  metadataProxy = proxyUrl || "";
  // Trigger boot once configuration is in.
  ensureBooted();
  return { payload: { ok: true } };
}

async function handleExtract({ url }) {
  await ensureBooted();
  const payload = JSON.parse(pyExtract(url));
  if (payload && payload.__err__) {
    throw new Error(payload.__err__);
  }
  return { payload };
}

async function handleMux({ video, audio }) {
  const muxed = await muxToMp4(video, audio);
  return {
    payload: { bytes: muxed },
    transfer: [muxed.buffer],
  };
}

const methods = {
  configure: handleConfigure,
  extract: handleExtract,
  mux: handleMux,
};

self.onmessage = async (e) => {
  const { id, method, args } = e.data;
  try {
    const fn = methods[method];
    if (!fn) throw new Error(`Unknown method: ${method}`);
    const { payload, transfer } = await fn(args);
    if (id === 0) return; // configure() is fire-and-forget
    self.postMessage({ id, type: "result", payload }, transfer || []);
  } catch (err) {
    if (id === 0) return;
    self.postMessage({ id, type: "error", payload: err && err.message ? err.message : String(err) });
  }
};
