"""Read-only HTTPS fetch gateway for controlled research traffic.

This is an educational test fixture, not a production security boundary.
"""

from __future__ import annotations

import http.client
import ipaddress
import json
import os
import socket
import socketserver
import ssl
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urljoin, urlsplit, urlunsplit


LISTEN_HOST = "0.0.0.0"
LISTEN_PORT = 8080
MAX_URL_CHARS = 2048
MAX_REDIRECTS = 3
DEFAULT_MAX_RESPONSE_BYTES = 512 * 1024
DEFAULT_TIMEOUT_SECONDS = 10.0
ALLOWED_METHODS = frozenset({"GET", "HEAD"})
BLOCKED_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE", "CONNECT", "TRACE"})
ALLOWED_CONTENT_TYPES = (
    "text/",
    "application/json",
    "application/xml",
    "application/xhtml+xml",
)


class GatewayPolicyError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


@dataclass(frozen=True)
class ValidatedTarget:
    url: str
    host: str
    port: int
    path: str
    addresses: tuple[str, ...] = ()


def allowed_hosts() -> set[str]:
    raw = os.environ.get("ALLOWED_FETCH_HOSTS", "")
    return {
        item.strip().rstrip(".").encode("idna").decode("ascii").lower()
        for item in raw.split(",")
        if item.strip()
    }


def allowed_urls() -> set[str]:
    raw = os.environ.get("ALLOWED_FETCH_URLS", "")
    return {canonical_url(item.strip()) for item in raw.split(",") if item.strip()}


def canonical_url(raw_url: str) -> str:
    parsed = urlsplit(raw_url)
    if not parsed.hostname:
        return raw_url
    host = parsed.hostname.rstrip(".").encode("idna").decode("ascii").lower()
    port = parsed.port
    authority = host if port in {None, 443} else f"{host}:{port}"
    return urlunsplit((parsed.scheme.lower(), authority, parsed.path or "/", parsed.query, ""))


def max_response_bytes() -> int:
    return int(os.environ.get("MAX_RESPONSE_BYTES", DEFAULT_MAX_RESPONSE_BYTES))


def upstream_timeout() -> float:
    return float(os.environ.get("UPSTREAM_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS))


def validate_target(raw_url: str, hosts: set[str] | None = None) -> ValidatedTarget:
    if not raw_url or len(raw_url) > MAX_URL_CHARS:
        raise GatewayPolicyError(400, "invalid_url", "URL is missing or too long")

    parsed = urlsplit(raw_url)
    if parsed.scheme.lower() != "https":
        raise GatewayPolicyError(400, "https_required", "Only HTTPS targets are allowed")
    if parsed.username is not None or parsed.password is not None:
        raise GatewayPolicyError(400, "userinfo_forbidden", "URL userinfo is forbidden")
    if not parsed.hostname:
        raise GatewayPolicyError(400, "invalid_host", "URL hostname is required")

    host = parsed.hostname.rstrip(".").encode("idna").decode("ascii").lower()
    try:
        port = parsed.port or 443
    except ValueError as exc:
        raise GatewayPolicyError(400, "invalid_port", "URL port is invalid") from exc
    if port != 443:
        raise GatewayPolicyError(403, "port_denied", "Only HTTPS port 443 is allowed")

    permitted = allowed_hosts() if hosts is None else hosts
    if host not in permitted:
        raise GatewayPolicyError(403, "host_denied", f"Host is not allowlisted: {host}")

    if parsed.fragment:
        raise GatewayPolicyError(400, "fragment_denied", "URL fragments are not accepted")
    if parsed.query and os.environ.get("ALLOW_FETCH_QUERY", "0") != "1":
        raise GatewayPolicyError(403, "query_denied", "Arbitrary query strings are disabled")

    exact_urls = allowed_urls() if hosts is None else set()
    if exact_urls and canonical_url(raw_url) not in exact_urls:
        raise GatewayPolicyError(403, "target_denied", "URL is not in the exact target allowlist")

    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"
    return ValidatedTarget(raw_url, host, port, path)


def require_public_dns(host: str, port: int) -> list[str]:
    try:
        addresses = sorted({
            item[4][0]
            for item in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        })
    except socket.gaierror as exc:
        raise GatewayPolicyError(502, "dns_failed", f"DNS lookup failed for {host}") from exc

    if not addresses:
        raise GatewayPolicyError(502, "dns_empty", f"DNS returned no addresses for {host}")
    for address in addresses:
        if not ipaddress.ip_address(address).is_global:
            raise GatewayPolicyError(403, "non_public_address", "Target resolved to a non-public address")
    return addresses


class PinnedHTTPSConnection(http.client.HTTPSConnection):
    """Connect only to DNS addresses that were validated before the request."""

    def __init__(self, host: str, port: int, addresses: list[str], *, timeout: float) -> None:
        super().__init__(host, port, timeout=timeout)
        self._validated_addresses = tuple(addresses)

    def connect(self) -> None:
        last_error: OSError | ssl.SSLError | None = None
        for address in self._validated_addresses:
            raw_socket = None
            try:
                raw_socket = socket.create_connection(
                    (address, self.port),
                    self.timeout,
                    self.source_address,
                )
                if self._tunnel_host:
                    self.sock = raw_socket
                    self._tunnel()
                    raw_socket = self.sock
                self.sock = self._context.wrap_socket(raw_socket, server_hostname=self.host)
                return
            except (OSError, ssl.SSLError) as exc:
                last_error = exc
                if raw_socket is not None:
                    raw_socket.close()
        raise OSError("No validated address could be reached") from last_error


def decode_body(payload: bytes, content_type: str) -> str:
    charset = "utf-8"
    for parameter in content_type.split(";")[1:]:
        key, _, value = parameter.strip().partition("=")
        if key.lower() == "charset" and value:
            charset = value.strip('"')
    try:
        return payload.decode(charset, "replace")
    except LookupError:
        return payload.decode("utf-8", "replace")


def fetch_https(raw_url: str, method: str) -> dict[str, object]:
    method = method.upper()
    if method not in ALLOWED_METHODS:
        raise GatewayPolicyError(405, "method_denied", "Only GET and HEAD are allowed")

    requested_url = raw_url
    current_url = raw_url
    for redirect_count in range(MAX_REDIRECTS + 1):
        target = validate_target(current_url)
        addresses = require_public_dns(target.host, target.port)
        connection = PinnedHTTPSConnection(
            target.host,
            target.port,
            addresses,
            timeout=upstream_timeout(),
        )
        try:
            connection.request(
                method,
                target.path,
                headers={
                    "User-Agent": "Agent-Egress-Lab-ReadOnly-Fetch/0.1",
                    "Accept": "text/html,application/json,application/xml;q=0.9,text/plain;q=0.8",
                    "Connection": "close",
                },
            )
            response = connection.getresponse()
            location = response.getheader("Location")
            if response.status in {301, 302, 303, 307, 308} and location:
                if redirect_count >= MAX_REDIRECTS:
                    raise GatewayPolicyError(502, "redirect_limit", "Too many redirects")
                current_url = urljoin(current_url, location)
                continue

            content_type = response.getheader("Content-Type", "application/octet-stream")
            media_type = content_type.split(";", 1)[0].strip().lower()
            if method == "GET" and not any(
                media_type.startswith(prefix) for prefix in ALLOWED_CONTENT_TYPES
            ):
                raise GatewayPolicyError(415, "content_type_denied", f"Content type is not allowed: {media_type}")

            payload = b"" if method == "HEAD" else response.read(max_response_bytes() + 1)
            if len(payload) > max_response_bytes():
                raise GatewayPolicyError(413, "response_too_large", "Response exceeded the configured byte limit")

            return {
                "ok": 200 <= response.status < 400,
                "method": method,
                "requestedUrl": requested_url,
                "finalUrl": current_url,
                "upstreamStatus": response.status,
                "contentType": content_type,
                "bytes": len(payload),
                "body": decode_body(payload, content_type) if payload else "",
                "forwardedCredentials": False,
            }
        except (OSError, http.client.HTTPException) as exc:
            raise GatewayPolicyError(502, "upstream_failed", f"Upstream request failed: {exc}") from exc
        finally:
            connection.close()

    raise GatewayPolicyError(502, "redirect_limit", "Too many redirects")


class FetchGatewayHandler(BaseHTTPRequestHandler):
    server_version = "AgentEgressReadOnlyFetch/0.1"

    def send_json(self, status: int, payload: dict[str, object], *, head_only: bool = False) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Allow", "GET, HEAD")
        self.end_headers()
        if not head_only:
            self.wfile.write(body)

    def dispatch_read(self, method: str) -> None:
        parsed = urlsplit(self.path)
        if parsed.path == "/health":
            self.send_json(200, {"ok": True, "policy": "GET_HEAD_ONLY"}, head_only=method == "HEAD")
            return
        if parsed.path != "/fetch":
            self.send_json(404, {"ok": False, "error": "not_found"}, head_only=method == "HEAD")
            return

        target = parse_qs(parsed.query).get("url", [""])[0]
        try:
            result = fetch_https(target, method)
            self.send_json(200, result, head_only=method == "HEAD")
            print(f"ALLOW {method} host={urlsplit(str(result['finalUrl'])).hostname}", flush=True)
        except GatewayPolicyError as exc:
            print(f"DENY {method} host={urlsplit(target).hostname or '-'} reason={exc.code}", flush=True)
            self.send_json(
                exc.status,
                {"ok": False, "error": exc.code, "message": exc.message},
                head_only=method == "HEAD",
            )

    def do_GET(self) -> None:  # noqa: N802
        self.dispatch_read("GET")

    def do_HEAD(self) -> None:  # noqa: N802
        self.dispatch_read("HEAD")

    def reject_write(self) -> None:
        print(f"DENY {self.command} method_denied", flush=True)
        self.send_json(
            405,
            {"ok": False, "error": "method_denied", "message": "Only GET and HEAD are allowed"},
        )

    do_POST = reject_write
    do_PUT = reject_write
    do_PATCH = reject_write
    do_DELETE = reject_write
    do_CONNECT = reject_write
    do_TRACE = reject_write

    def log_message(self, format: str, *args: object) -> None:
        return


class ThreadedGateway(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    print(f"read-only fetch gateway listening on {LISTEN_HOST}:{LISTEN_PORT}", flush=True)
    print(f"allowed_hosts={sorted(allowed_hosts())}", flush=True)
    with ThreadedGateway((LISTEN_HOST, LISTEN_PORT), FetchGatewayHandler) as server:
        server.serve_forever()
