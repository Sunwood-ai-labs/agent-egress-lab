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
            "https://example.com/path?q=research",
            {"example.com"},
        )
        self.assertEqual(target.host, "example.com")
        self.assertEqual(target.port, 443)
        self.assertEqual(target.path, "/path?q=research")

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
            patch.dict(os.environ, {"ALLOWED_FETCH_HOSTS": "example.com"}, clear=False),
            patch.object(fetch_gateway, "require_public_dns"),
            patch.object(fetch_gateway.http.client, "HTTPSConnection", return_value=connection),
        ):
            result = fetch_gateway.fetch_https("https://example.com/research", "GET")

        headers = connection.request.call_args.kwargs["headers"]
        self.assertEqual(set(headers), {"User-Agent", "Accept", "Connection"})
        self.assertFalse(any(name.lower() in {"authorization", "cookie"} for name in headers))
        self.assertFalse(result["forwardedCredentials"])


if __name__ == "__main__":
    unittest.main()
