import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

_events = {}
_lock = threading.Lock()
_server = None
_thread = None


def _get_event(name):
    with _lock:
        if name not in _events:
            _events[name] = threading.Event()
        return _events[name]


class _Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path.startswith("/signal/"):
            name = self.path[len("/signal/"):]
            _get_event(name).set()
            self.send_response(200)
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


class _ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True


def start(port=8765):
    global _server, _thread
    _events.clear()
    _server = _ReusableHTTPServer(("127.0.0.1", port), _Handler)
    _thread = threading.Thread(target=_server.serve_forever, daemon=True)
    _thread.start()
    print(f"[SIGNAL] Listening on 127.0.0.1:{port}")


def wait_for(name, timeout=25):
    got_it = _get_event(name).wait(timeout=timeout)
    print(f"[SIGNAL] '{name}' " + ("received." if got_it else "timed out."))
    return got_it


def wait_for_ready(timeout=25):
    return wait_for("ready", timeout=timeout)