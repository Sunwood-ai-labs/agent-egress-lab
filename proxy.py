"""Tiny CONNECT-only allowlist proxy for the egress-control lab.

This is intentionally a test fixture, not a production proxy.
"""

from __future__ import annotations

import os
import selectors
import socket
import socketserver


LISTEN_HOST = "0.0.0.0"
LISTEN_PORT = 8080
MAX_HEADER_BYTES = 64 * 1024


def allowed_targets() -> set[str]:
    raw = os.environ.get("ALLOWED_CONNECT_TARGETS", "")
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def read_headers(client: socket.socket) -> bytes:
    data = bytearray()
    while b"\r\n\r\n" not in data:
        chunk = client.recv(4096)
        if not chunk:
            break
        data.extend(chunk)
        if len(data) > MAX_HEADER_BYTES:
            raise ValueError("request headers too large")
    return bytes(data)


def relay(client: socket.socket, upstream: socket.socket) -> None:
    selector = selectors.DefaultSelector()
    selector.register(client, selectors.EVENT_READ, upstream)
    selector.register(upstream, selectors.EVENT_READ, client)
    try:
        while True:
            events = selector.select(timeout=30)
            if not events:
                return
            for key, _ in events:
                source = key.fileobj
                destination = key.data
                payload = source.recv(65536)
                if not payload:
                    return
                destination.sendall(payload)
    finally:
        selector.close()


class ProxyHandler(socketserver.BaseRequestHandler):
    def handle(self) -> None:
        client = self.request
        try:
            raw_headers = read_headers(client)
            request_line = raw_headers.split(b"\r\n", 1)[0].decode("ascii", "replace")
            parts = request_line.split()
            if len(parts) != 3 or parts[0].upper() != "CONNECT":
                client.sendall(b"HTTP/1.1 405 Method Not Allowed\r\nConnection: close\r\n\r\n")
                return

            target = parts[1].lower()
            if target not in allowed_targets():
                print(f"DENY {target}", flush=True)
                client.sendall(b"HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n")
                return

            host, port_text = target.rsplit(":", 1)
            upstream = socket.create_connection((host, int(port_text)), timeout=10)
            try:
                print(f"ALLOW {target}", flush=True)
                client.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
                relay(client, upstream)
            finally:
                upstream.close()
        except (OSError, ValueError) as exc:
            print(f"ERROR {exc}", flush=True)
            try:
                client.sendall(b"HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n")
            except OSError:
                pass


class ThreadedProxy(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    print(f"egress proxy listening on {LISTEN_HOST}:{LISTEN_PORT}", flush=True)
    print(f"allowlist={sorted(allowed_targets())}", flush=True)
    with ThreadedProxy((LISTEN_HOST, LISTEN_PORT), ProxyHandler) as server:
        server.serve_forever()
