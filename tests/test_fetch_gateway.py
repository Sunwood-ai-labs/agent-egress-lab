import os
import unittest
from unittest.mock import MagicMock, patch

import fetch_gateway


class FetchGatewayPolicyTests(unittest.TestCase):
    def test_allowed_hosts_are_normalized_and_deduplicated(self) -> None:
        with patch.dict(
            os.environ,
            {"ALLOWED_FETCH_HOSTS": " Example.COM,example.com., api.github.com "},
            clear=False,
        ):
            self.assertEqual(fetch_gateway.allowed_hosts(), {"example.com", "api.github.com"})

    def test_https_allowlisted_target_is_accepted(self) -> None:
        target = fetch_gateway.validate_target(
            "https://example.com/path",
            {"example.com"},
        )
        self.assertEqual(target.host, "example.com")
        self.assertEqual(target.port, 443)
        self.assertEqual(target.path, "/path")

    def test_arbitrary_query_is_denied_by_default(self) -> None:
        with patch.dict(os.environ, {"ALLOW_FETCH_QUERY": "0"}, clear=False):
            with self.assertRaises(fetch_gateway.GatewayPolicyError) as raised:
                fetch_gateway.validate_target("https://example.com/?q=CANARY_SECRET", {"example.com"})
        self.assertEqual(raised.exception.code, "query_denied")

    def test_exact_target_allowlist_blocks_path_channel(self) -> None:
        with patch.dict(
            os.environ,
            {
                "ALLOWED_FETCH_HOSTS": "example.com",
                "ALLOWED_FETCH_URLS": "https://example.com/",
                "ALLOW_FETCH_QUERY": "0",
            },
            clear=False,
        ):
            fetch_gateway.validate_target("https://example.com/")
            with self.assertRaises(fetch_gateway.GatewayPolicyError) as raised:
                fetch_gateway.validate_target("https://example.com/CANARY_SECRET")
        self.assertEqual(raised.exception.code, "target_denied")

    def test_http_userinfo_nonstandard_port_and_other_host_are_denied(self) -> None:
        cases = (
            "http://example.com/",
            "https://user:secret@example.com/",
            "https://example.com:8443/",
            "https://api.github.com/",
        )
        for url in cases:
            with self.subTest(url=url):
                with self.assertRaises(fetch_gateway.GatewayPolicyError):
                    fetch_gateway.validate_target(url, {"example.com"})

    def test_only_get_and_head_are_allowed(self) -> None:
        self.assertEqual(fetch_gateway.ALLOWED_METHODS, {"GET", "HEAD"})
        self.assertTrue({"POST", "PUT", "PATCH", "DELETE"} <= fetch_gateway.BLOCKED_METHODS)

    def test_fetch_uses_fixed_headers_without_credentials(self) -> None:
        response = MagicMock()
        response.status = 200
        response.getheader.side_effect = lambda name, default=None: {
            "Location": None,
            "Content-Type": "text/plain; charset=utf-8",
        }.get(name, default)
        response.read.return_value = b"safe research result"
        connection = MagicMock()
        connection.getresponse.return_value = response

        with (
            patch.dict(
                os.environ,
                {"ALLOWED_FETCH_HOSTS": "example.com", "ALLOWED_FETCH_URLS": ""},
                clear=False,
            ),
            patch.object(fetch_gateway, "require_public_dns", return_value=["93.184.216.34"]),
            patch.object(fetch_gateway, "PinnedHTTPSConnection", return_value=connection) as pinned,
        ):
            result = fetch_gateway.fetch_https("https://example.com/research", "GET")

        headers = connection.request.call_args.kwargs["headers"]
        self.assertEqual(set(headers), {"User-Agent", "Accept", "Connection"})
        self.assertFalse(any(name.lower() in {"authorization", "cookie"} for name in headers))
        self.assertFalse(result["forwardedCredentials"])
        self.assertEqual(pinned.call_args.args[2], ["93.184.216.34"])


if __name__ == "__main__":
    unittest.main()
