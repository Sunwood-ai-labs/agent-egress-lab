"""Quarantined processor for untrusted research content.

It deliberately has no fetch, filesystem-write, credential, or action capability.
The output remains labelled untrusted; this is containment, not sanitization.
"""

from __future__ import annotations

import json
import socketserver
from http.server import BaseHTTPRequestHandler


MAX_INPUT_BYTES = 64 * 1024


class WorkerHandler(BaseHTTPRequestHandler):
    def send_json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self.send_json(200, {"ok": True, "trust": "UNTRUSTED", "actionAuthority": False})
            return
        self.send_json(404, {"ok": False, "error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/execute":
            self.send_json(403, {"ok": False, "error": "no_action_authority"})
            return
        if self.path != "/analyze":
            self.send_json(404, {"ok": False, "error": "not_found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_INPUT_BYTES:
            self.send_json(413, {"ok": False, "error": "input_size_denied"})
            return
        try:
            payload = json.loads(self.rfile.read(length))
            content = str(payload.get("content", ""))
        except (json.JSONDecodeError, AttributeError):
            self.send_json(400, {"ok": False, "error": "invalid_json"})
            return

        suspicious_terms = ("ignore previous", "system prompt", "secret", "post ", "send ", "execute")
        matched = sorted({term for term in suspicious_terms if term in content.lower()})
        self.send_json(200, {
            "ok": True,
            "trust": "UNTRUSTED",
            "tainted": True,
            "actionAuthority": False,
            "instructionSignals": matched,
            "contentPreview": content[:240],
            "notice": "Classification is advisory; the content was not made trustworthy.",
        })

    def log_message(self, format: str, *args: object) -> None:
        return


class ThreadedServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with ThreadedServer(("0.0.0.0", 8081), WorkerHandler) as server:
        server.serve_forever()
