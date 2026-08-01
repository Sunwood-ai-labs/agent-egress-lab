# Offline Playwright E2E

The offline E2E experiment separates browser execution from the agent process and attaches the runner only to an internal Docker network.

## Topology

`offline-e2e.compose.yaml` defines two services:

- `local-app`: an nginx container serving the deterministic demo page;
- `e2e-runner`: a Playwright container that captures local-success and external-failure evidence.

The shared `offline-e2e` network uses `internal: true`. There is no external bridge or proxy in this topology.

## What the script verifies

`e2e/capture.mjs` opens a 1200×900 Chromium page and navigates to `http://local-app/`. It requires the title `Offline E2E Local App` before recording the local page as loaded.

The same runner then attempts `https://example.com/`. A successful external navigation fails the test. An expected navigation error is recorded in `offline-e2e-result.json`, and Chromium captures a separate error-page screenshot.

`verify-offline-e2e.ps1` rejects missing artifacts, a failed local load, an unexpected external load, or a failure without error evidence.

## What this does not isolate

This boundary applies to the E2E Runner container only. It does not restrict `curl`, `git push`, API calls, or other traffic made by the agent process outside this Compose topology. Apply a separate egress policy to the agent itself, as demonstrated by `compose.yaml`.

## Evidence

![Chromium error after external navigation from the offline runner](../images/offline-e2e-external-error.png)

The architecture diagram is available as [JPG](../architecture/offline-e2e-security-boundary.jpg), [SVG](../architecture/offline-e2e-security-boundary.svg), and editable [draw.io source on GitHub](https://github.com/Sunwood-ai-labs/agent-egress-lab/blob/main/docs/architecture/offline-e2e-security-boundary.drawio).
