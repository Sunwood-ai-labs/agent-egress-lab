import os
import unittest
from unittest.mock import patch

import proxy


class AllowedTargetsTests(unittest.TestCase):
    def test_empty_value_denies_everything(self) -> None:
        with patch.dict(os.environ, {"ALLOWED_CONNECT_TARGETS": ""}, clear=False):
            self.assertEqual(proxy.allowed_targets(), set())

    def test_targets_are_trimmed_normalized_and_deduplicated(self) -> None:
        value = " API.GITHUB.COM:443, example.com:443,api.github.com:443, "
        with patch.dict(os.environ, {"ALLOWED_CONNECT_TARGETS": value}, clear=False):
            self.assertEqual(
                proxy.allowed_targets(),
                {"api.github.com:443", "example.com:443"},
            )


if __name__ == "__main__":
    unittest.main()
