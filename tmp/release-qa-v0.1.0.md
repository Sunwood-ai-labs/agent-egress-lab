# Release QA Inventory — v0.1.0

## Release Context

- repository: `Sunwood-ai-labs/agent-egress-lab`
- release tag: `v0.1.0`
- compare range: initial release; empty tree through `d0014bacdd00e8cafb95dab02f0b8879132779e4`
- requested outputs: complete repository polish, bilingual public docs, CI, GitHub Pages, and GitHub Release
- validation commands run: `./verify.ps1`; `./verify-offline-e2e.ps1`; `python -m unittest discover -s tests -v`; `python -m py_compile proxy.py`; both `docker compose config --quiet` checks; `npm run docs:build`; `npm audit --audit-level=high`; `verify-svg-assets.ps1`; `svg-header-layout-lint`; repository payload check; live HTTP checks
- release URLs: `https://github.com/Sunwood-ai-labs/agent-egress-lab/releases/tag/v0.1.0`; English docs `https://sunwood-ai-labs.github.io/agent-egress-lab/releases/v0.1.0`; Japanese docs `https://sunwood-ai-labs.github.io/agent-egress-lab/ja/releases/v0.1.0`

## Claim Matrix

| claim | code refs | validation refs | docs surfaces touched | scope |
| --- | --- | --- | --- | --- |
| The agent has no direct public route and reaches only configured `host:port` targets through the test proxy | `compose.yaml`, `proxy.py`, `verify.ps1` | `./verify.ps1` returned 3/3 controls verified; CI run `30684435377` succeeded | `README.md`, `README.ja.md`, `docs/guide/security-model.md`, `docs/ja/guide/security-model.md` | agent Compose topology only |
| The offline Playwright Runner reaches the internal app while external navigation fails | `offline-e2e.compose.yaml`, `e2e/capture.mjs`, `verify-offline-e2e.ps1` | local page loaded; external navigation failed with `ERR_NAME_NOT_RESOLVED`; CI run `30684435377` succeeded | `README.md`, `README.ja.md`, `docs/guide/offline-e2e.md`, `docs/ja/guide/offline-e2e.md` | offline E2E Compose topology only |
| Allowlisting does not prevent exfiltration through an allowed destination and the bundled proxy is not production hardened | `proxy.py`, topology boundaries | inspected implementation and both integration suites | `README.md`, `README.ja.md`, `SECURITY.md`, `docs/guide/security-model.md`, `docs/ja/guide/security-model.md`, `docs/releases/v0.1.0.md`, `docs/ja/releases/v0.1.0.md`, `docs/guide/articles/v0.1.0-walkthrough.md`, `docs/ja/guide/articles/v0.1.0-walkthrough.md` | steady-state limitation |
| Public docs provide parallel English and Japanese operator paths | `docs/.vitepress/config.mts`, `docs/index.md`, `docs/ja/index.md`, guide/release/article pairs | `npm run docs:build`; Pages run `30684435356`; live HTTP 200 checks | `docs/index.md`, `docs/ja/index.md` | public docs |

## Steady-State Docs Review

| surface | status | evidence |
| --- | --- | --- |
| README.md | pass | Rewritten with quick start, verified outcomes, architecture, limitations, docs, layout, contribution, and release links |
| README.ja.md | pass | Japanese structure mirrors the English operator path and limitations |
| SECURITY.md | pass | Private reporting path and explicit production limitations added |
| CONTRIBUTING.md | pass | Verification, bilingual sync, and sensitive-data expectations added |
| docs/index.md | pass | English landing page inspected in a real browser |
| docs/ja/index.md | pass | Japanese landing page inspected in a real browser |
| docs/guide/getting-started.md | pass | Commands and generated evidence checked against both PowerShell scripts |
| docs/ja/guide/getting-started.md | pass | Japanese command flow mirrors the English guide |
| docs/guide/security-model.md | pass | Claims scoped to the exact Compose topologies and proxy implementation |
| docs/ja/guide/security-model.md | pass | Japanese security model mirrors the scoped English claims |
| docs/guide/offline-e2e.md | pass | Runner-only scope and agent-level residual risk explicitly separated |
| docs/ja/guide/offline-e2e.md | pass | Japanese page preserves the same scope and limitation |
| docs/releases/v0.1.0.md | pass | English release page built, rendered, and returned HTTP 200 |
| docs/ja/releases/v0.1.0.md | pass | Japanese release page built and returned through the deployed locale |
| docs/guide/articles/v0.1.0-walkthrough.md | pass | English walkthrough built and returned HTTP 200 |
| docs/ja/guide/articles/v0.1.0-walkthrough.md | pass | Japanese walkthrough built with matching information architecture |

## QA Inventory

| criterion_id | status | evidence |
| --- | --- | --- |
| compare_range | pass | Release collector found no previous tag and resolved initial-release mode from root commit `2c60cee` through release commit `d0014ba` |
| release_claims_backed | pass | Claim matrix ties every release claim to inspected code and current validation output |
| docs_release_notes | pass | `docs/releases/v0.1.0.md`, `docs/ja/releases/v0.1.0.md` |
| companion_walkthrough | pass | `docs/guide/articles/v0.1.0-walkthrough.md`, `docs/ja/guide/articles/v0.1.0-walkthrough.md` |
| operator_claims_extracted | pass | Claim matrix identifies both implemented boundaries and their shared residual risk |
| impl_sensitive_claims_verified | pass | Both Docker integration suites, proxy unit tests, Python compilation, and Compose model checks passed locally and in CI |
| steady_state_docs_reviewed | pass | README, security policy, contribution guide, and all primary operator guides are recorded above |
| claim_scope_precise | pass | Agent proxy and offline E2E guarantees are described as separate Compose topologies, not repo-wide host controls |
| latest_release_links_updated | pass | README badges, CHANGELOG, docs nav, and release pages point to v0.1.0 |
| svg_assets_validated | pass | `verify-svg-assets.ps1` checked icon and release header; `svg-header-layout-lint` reported zero issues; rendered header inspected |
| docs_assets_committed_before_tag | pass | Docs, release pages, walkthroughs, and header were committed in `d0014ba` before annotated tag `v0.1.0` was pushed |
| docs_deployed_live | pass | Pages workflow `30684435356` succeeded; English, Japanese, release, article, and SVG URLs returned HTTP 200 |
| tag_local_remote | pass | Annotated `v0.1.0` resolves locally and was pushed to origin |
| github_release_verified | pass | Public release is `isDraft: false` and `isPrerelease: false`; complete body and URL were re-read with `gh release view v0.1.0 --json ...` |
| validation_commands_recorded | pass | Release Context lists every local, CI, SVG, dependency, build, and HTTP check used for signoff |
| publish_date_verified | pass | GitHub returned `publishedAt: 2026-08-01T04:46:52Z`; no unverified date is hardcoded in the release body |

## Notes

- blockers: none
- waivers: none
- follow-up docs tasks: none required for v0.1.0
