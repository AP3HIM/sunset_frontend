# cdp_bridge.py
#
# Talks directly to Chrome DevTools Protocol over a websocket. This replaces
# electron_bridge.py for any upload flow that launches a real, separate
# Chrome.exe (which is what upload.py's "full PAG mode" actually does via
# utils.launch_chrome() — it is NOT an Electron BrowserWindow, so the
# Electron sendInputEvent bridge has no way to reach it).
#
# Requires: pip install websocket-client requests
# (run inside your embeddable python folder's python.exe, same as before)

import json
import time
import requests
import websocket  # from websocket-client, NOT the `websockets` package

DEFAULT_CDP_PORT = 9222


def _log(*args):
    print("[cdp]", *args)


# ---------------------------------------------------------------------------
# Connecting to Chrome
# ---------------------------------------------------------------------------

def wait_for_cdp_ready(port=DEFAULT_CDP_PORT, timeout=15):
    """Poll Chrome's CDP HTTP endpoint until it responds. Chrome needs a
    moment to boot before /json/version answers."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(f"http://127.0.0.1:{port}/json/version", timeout=1)
            if r.status_code == 200:
                _log(f"CDP ready on port {port}")
                return True
        except Exception:
            pass
        time.sleep(0.5)
    _log(f"CDP did not become ready on port {port} within {timeout}s")
    return False


def open_tab(url, port=DEFAULT_CDP_PORT, timeout=10):
    """Opens a new tab at `url` via CDP's HTTP endpoint and returns its
    webSocketDebuggerUrl. This replaces ctrl+t + typing a URL — no keyboard
    race conditions, no dependency on window focus."""
    try:
        r = requests.put(
            f"http://127.0.0.1:{port}/json/new?{url}", timeout=timeout
        )
        data = r.json()
        ws_url = data.get("webSocketDebuggerUrl")
        if ws_url:
            _log(f"opened tab: {url}")
            return ws_url
        _log(f"open_tab: no webSocketDebuggerUrl in response: {data}")
        return None
    except Exception as e:
        _log(f"open_tab failed: {e}")
        return None


def find_tab(url_substring, port=DEFAULT_CDP_PORT, timeout=5):
    """Find an already-open tab whose URL contains `url_substring`, return
    its webSocketDebuggerUrl, or None."""
    try:
        r = requests.get(f"http://127.0.0.1:{port}/json/list", timeout=timeout)
        for tab in r.json():
            if url_substring in tab.get("url", ""):
                return tab.get("webSocketDebuggerUrl")
    except Exception as e:
        _log(f"find_tab failed: {e}")
    return None


# ---------------------------------------------------------------------------
# CDP session — a thin synchronous wrapper over the websocket protocol
# ---------------------------------------------------------------------------

class CDPSession:
    def __init__(self, ws_url, timeout=10):
        self.ws = websocket.create_connection(ws_url, timeout=timeout)
        self._id_counter = 0
        self.ws.settimeout(timeout)

    def _next_id(self):
        self._id_counter += 1
        return self._id_counter

    def send(self, method, params=None, timeout=10):
        """Send a CDP command and block until the matching response arrives.
        Ignores unrelated event messages that may interleave on the socket."""
        msg_id = self._next_id()
        payload = {"id": msg_id, "method": method, "params": params or {}}
        self.ws.send(json.dumps(payload))

        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                raw = self.ws.recv()
            except Exception as e:
                _log(f"send({method}) recv error: {e}")
                return None
            try:
                data = json.loads(raw)
            except Exception:
                continue
            if data.get("id") == msg_id:
                if "error" in data:
                    _log(f"send({method}) CDP error: {data['error']}")
                    return None
                return data.get("result")
            # else: it's an event notification, not our response — keep waiting
        _log(f"send({method}) timed out waiting for response")
        return None

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass


def connect(ws_url):
    session = CDPSession(ws_url)
    session.send("Runtime.enable")
    session.send("Page.enable")
    return session


# ---------------------------------------------------------------------------
# High-level actions — same function names/shapes as electron_bridge.py so
# upload_tiktok_electron.py's tier logic barely has to change.
# ---------------------------------------------------------------------------

_FIND_BY_TEXT_JS = """
(function() {
  const norm = s => (s || "").trim().toLowerCase();
  const target = %s;
  const candidates = Array.from(document.querySelectorAll(
    'button, [role="button"], a, input[type="file"], div[tabindex], span'
  ));
  for (const el of candidates) {
    const text = norm(el.innerText || el.getAttribute('aria-label') || el.getAttribute('title'));
    if (text && text.includes(target)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        return JSON.stringify({x: r.x, y: r.y, width: r.width, height: r.height, matchedText: text.slice(0,60)});
      }
    }
  }
  return null;
})()
"""

_FIND_BY_SELECTOR_JS = """
(function() {
  const el = document.querySelector(%s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return JSON.stringify({x: r.x, y: r.y, width: r.width, height: r.height});
})()
"""

_ACTIVE_ELEMENT_JS = """
(function() {
  const el = document.activeElement;
  if (!el) return null;
  return JSON.stringify({tag: el.tagName, text: (el.innerText||"").slice(0,60), aria: el.getAttribute('aria-label')});
})()
"""

_KEY_MAP = {
    "Tab":    dict(key="Tab", code="Tab", windowsVirtualKeyCode=9),
    "Enter":  dict(key="Enter", code="Enter", windowsVirtualKeyCode=13),
    "Escape": dict(key="Escape", code="Escape", windowsVirtualKeyCode=27),
}


def _evaluate(session, js):
    result = session.send("Runtime.evaluate", {
        "expression": js,
        "returnByValue": True,
    })
    if not result:
        return None
    value = result.get("result", {}).get("value")
    if value is None:
        return None
    try:
        return json.loads(value)
    except Exception:
        return None


def _click_at(session, x, y):
    session.send("Input.dispatchMouseEvent", {
        "type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1
    })
    session.send("Input.dispatchMouseEvent", {
        "type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1
    })


def click_text(session, text, timeout=None):
    """Find an element by visible text/aria-label/title and click its
    center. Mirrors electron_bridge.click_text's signature/behavior."""
    if session is None:
        return False
    rect = _evaluate(session, _FIND_BY_TEXT_JS % json.dumps(text.lower()))
    if not rect:
        _log(f"click_text('{text}') failed: element not found")
        return False
    cx = rect["x"] + rect["width"] / 2
    cy = rect["y"] + rect["height"] / 2
    _click_at(session, cx, cy)
    _log(f"clicked '{text}' -> matched '{rect.get('matchedText')}' at ({cx:.0f},{cy:.0f})")
    return True


def click_selector(session, selector, timeout=None):
    """Click an element by raw CSS selector — for contenteditable rich-text
    boxes (DraftJS/Slate) with no stable visible text."""
    if session is None:
        return False
    rect = _evaluate(session, _FIND_BY_SELECTOR_JS % json.dumps(selector))
    if not rect:
        _log(f"click_selector('{selector}') failed: not found")
        return False
    cx = rect["x"] + rect["width"] / 2
    cy = rect["y"] + rect["height"] / 2
    _click_at(session, cx, cy)
    _log(f"clicked selector '{selector}' at ({cx:.0f},{cy:.0f})")
    return True


def press_key(session, key, timeout=None):
    if session is None:
        return False
    spec = _KEY_MAP.get(key)
    if not spec:
        _log(f"press_key: unsupported key '{key}'")
        return False
    session.send("Input.dispatchKeyEvent", dict(type="keyDown", **spec))
    session.send("Input.dispatchKeyEvent", dict(type="keyUp", **spec))
    return True


def active_element(session, timeout=None):
    if session is None:
        return None
    return _evaluate(session, _ACTIVE_ELEMENT_JS)


def bridge_reachable(session=None, port=DEFAULT_CDP_PORT):
    """Kept for API-shape compatibility with electron_bridge.py. With CDP,
    'reachable' just means we have a live session."""
    return session is not None