"""
Monkey-patches Python's stdlib networking so yt-dlp's outgoing HTTP
requests are routed through a configurable CORS proxy via the browser's
synchronous XMLHttpRequest (only legal inside a Web Worker).

This patch is only needed for the metadata-extraction step: once yt-dlp
has returned the format URLs, the main thread fetches the actual media
bytes directly from googlevideo (which serves CORS headers).

How it connects Python <-> browser:
  1. yt-dlp calls urllib.request.urlopen / opener.open.
  2. Our patched urlopen reads the URL + headers off the Request,
     hands them to a JS XMLHttpRequest pointed at the proxy, blocks
     until the response arrives, and wraps the bytes in an object
     that quacks like http.client.HTTPResponse.
  3. The proxy unwraps the X-YTDLP-* headers, performs the real
     HTTPS request server-side, and streams bytes back. The browser
     sees an ordinary same-origin (CORS-allowed) response.

(Ported from the MIT-licensed yt-dlp.wasm project by FiLL.)
"""

from __future__ import annotations

import io
import urllib.request
import urllib.error
import urllib.response
from email.message import Message

import js  # provided by Pyodide
import pyodide

_PROXY_URL = ""  # set via install(proxy_url)


class _ProxyResponse(io.BytesIO):
    """Minimum surface area to satisfy urllib + yt-dlp consumers."""

    def __init__(self, body: bytes, status: int, headers: dict, url: str):
        super().__init__(body)
        self.status = status
        self.code = status
        self.reason = ""
        self.url = url
        msg = Message()
        for k, v in headers.items():
            msg[k] = v
        self.headers = msg
        self.msg = msg

    def info(self):
        return self.headers

    def getcode(self):
        return self.status

    def geturl(self):
        return self.url

    def getheader(self, name, default=None):
        return self.headers.get(name, default)

    def getheaders(self):
        return list(self.headers.items())


def _xhr_fetch(url: str, body, headers: dict, method: str):
    """Block on a synchronous XHR routed through the proxy."""
    if not _PROXY_URL:
        raise urllib.error.URLError(
            f"No metadata proxy configured; cannot fetch {url}"
        )

    xhr = js.XMLHttpRequest.new()
    target = f"{_PROXY_URL}/proxy?url={js.encodeURIComponent(url)}"
    xhr.open(method, target, False)  # synchronous — Worker only
    xhr.responseType = "arraybuffer"

    # Forward every original header under an X-YTDLP- prefix so the
    # browser doesn't strip "forbidden" headers like User-Agent / Cookie.
    for k, v in (headers or {}).items():
        try:
            xhr.setRequestHeader(f"X-YTDLP-{k}", str(v))
        except Exception:
            pass

    if body is not None:
        raw = _to_bytes(body)
        try:
            # i body di yt-dlp sono quasi sempre JSON UTF-8: inviali come
            # stringa, che XHR gestisce nativamente in Pyodide
            xhr.send(raw.decode("utf-8"))
        except Exception:
            from pyodide.ffi import to_js
            xhr.send(to_js(raw))
    else:
        xhr.send()

    if xhr.status == 0:
        raise urllib.error.URLError(f"Network error fetching {url}")

    resp = xhr.response
    if resp is None:
        py_bytes = b""
    else:
        arr = js.Uint8Array.new(resp)
        py_bytes = bytes(arr.to_py())

    out_headers: dict[str, str] = {}
    for raw in (xhr.getAllResponseHeaders() or "").splitlines():
        if ":" in raw:
            k, v = raw.split(":", 1)
            out_headers[k.strip()] = v.strip()

    return py_bytes, int(xhr.status), out_headers


def _to_bytes(body):
    """Converte il body in bytes, gestendo i JsProxy (Uint8Array) di Pyodide."""
    if isinstance(body, (bytes, bytearray, memoryview)):
        return bytes(body)
    # JsProxy o altro oggetto: prova a convertirli in bytes Python
    try:
        return bytes(body.to_py())
    except Exception:
        pass
    try:
        return bytes(body)
    except Exception:
        return bytes(str(body), "utf-8")


def patched_urlopen(req, data=None, timeout=None, *, cafile=None, capath=None,
                    cadefault=False, context=None):
    if isinstance(req, str):
        url, headers, method = req, {}, "GET"
        body = data
    else:
        url = req.full_url
        headers = dict(req.header_items()) if hasattr(req, "header_items") else dict(getattr(req, "headers", {}))
        method = req.get_method() if hasattr(req, "get_method") else "GET"
        body = data if data is not None else getattr(req, "data", None)

    body_bytes, status, resp_headers = _xhr_fetch(url, body, headers, method)

    if status >= 400:
        raise urllib.error.HTTPError(url, status, resp_headers.get("status", ""),
                                     _headers_to_message(resp_headers),
                                     io.BytesIO(body_bytes))

    return _ProxyResponse(body_bytes, status, resp_headers, url)


def _headers_to_message(headers: dict) -> Message:
    m = Message()
    for k, v in headers.items():
        m[k] = v
    return m


class _ProxyOpener(urllib.request.OpenerDirector):
    """Replaces every default handler with our single proxy call."""

    def open(self, fullurl, data=None, timeout=None):
        return patched_urlopen(fullurl, data=data, timeout=timeout)


def install(proxy_url: str = "") -> None:
    """Configure the proxy URL and install the urllib monkey-patch.

    proxy_url is the BASE URL of the proxy (e.g. http://localhost:8181);
    the patch will append /proxy?url=... to it. Empty string disables
    networking — callers will get URLError for any outgoing request.
    """
    global _PROXY_URL
    _PROXY_URL = (proxy_url or "").rstrip("/")

    urllib.request.urlopen = patched_urlopen
    urllib.request.install_opener(_ProxyOpener())

    # yt-dlp's modern networking layer instantiates urllib.request.OpenerDirector
    # itself inside UrllibRH; override the class-level open as a backstop.
    urllib.request.OpenerDirector.open = _ProxyOpener.open  # type: ignore[assignment]

    print("[network_patch] urllib routed through", _PROXY_URL or "<disabled>")
