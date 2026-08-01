# Changelog

All notable changes to this project are documented here.

## Unreleased

### Added

- Interactive Offline Sprint Board sample app for the internal Playwright topology.
- Reproducible create-and-complete task flow with four 1200×900 screenshot artifacts.
- External-link click verification based on the main navigation request outcome.
- Read-only HTTPS fetch gateway with exact-host allowlisting, fixed outbound headers, redirect revalidation, and response limits.
- Research Airlock console and a five-screenshot Playwright policy verification flow.

### Fixed

- Avoided a false positive where the previous page's existing load state could be mistaken for a successful external navigation.

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
