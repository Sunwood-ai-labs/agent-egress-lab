# Changelog

All notable changes to this project are documented here.

## [0.1.0] - 2026-08-01

### Added

- Default-deny Docker network for the agent runner.
- CONNECT-only egress proxy with an explicit `host:port` allowlist.
- Three-control verification for direct, allowed, and denied outbound paths.
- Internal-only Playwright E2E environment with real browser error evidence.
- Editable draw.io security-boundary diagram and exported JPG/SVG assets.
- Bilingual documentation, CI verification, and GitHub Pages deployment.

### Security

- Documented the residual risk of data exfiltration through an allowed destination.
- Clarified that the bundled proxy is a test fixture rather than a production security boundary.

[0.1.0]: https://github.com/Sunwood-ai-labs/agent-egress-lab/releases/tag/v0.1.0
