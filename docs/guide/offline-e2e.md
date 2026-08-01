# Offline Playwright E2E

The offline E2E experiment separates browser execution from the agent process and attaches the runner only to an internal Docker network.

## Topology

`offline-e2e.compose.yaml` defines two services:

- `local-app`: an nginx container serving the interactive Offline Sprint Board sample app;
- `e2e-runner`: a Playwright container that performs the user flow and captures local-success and external-failure evidence.

The shared `offline-e2e` network uses `internal: true`. There is no external bridge or proxy in this topology.

## What the script verifies

`e2e/capture.mjs` opens a 1200×900 Chromium page and navigates to `http://local-app/`. It requires the title `Offline Sprint Board`, rejects a whitespace-only task, creates a task through the visible form, and completes it through the visible checkbox.

The same runner then clicks the sample app's visible link to `https://example.com/`. It races the main navigation request's failure against a real HTTP response instead of relying on the previous page's load state. A successful external response fails the test. The expected `requestfailed` result is recorded in `artifacts/sample-app-e2e/result.json`, and Chromium captures a separate error-page screenshot.

`verify-offline-e2e.ps1` rejects missing artifacts, a failed user flow, unexpected horizontal overflow or viewport clipping, an external response, a failure without error evidence, and screenshots that are not exactly 1200×900.

## Tested user flow

1. Load the sample app through the Docker internal network.
2. Submit whitespace and confirm that no task is created.
3. Add `allowlistの証拠をレビュー` through the form.
4. Complete the created task through its checkbox.
5. Click the external URL control and require the navigation request to fail.

## What this does not isolate

This boundary applies to the E2E Runner container only. It does not restrict `curl`, `git push`, API calls, or other traffic made by the agent process outside this Compose topology. Apply a separate egress policy to the agent itself, as demonstrated by `compose.yaml`.

## Evidence

### Internal application states

![Initial Offline Sprint Board state](../images/sample-app-e2e/01-initial-app.png)

![Task created through Playwright](../images/sample-app-e2e/02-task-created.png)

![Task completed through Playwright](../images/sample-app-e2e/03-task-completed.png)

### External URL blocked

![Chromium No internet error after clicking the external URL](../images/sample-app-e2e/04-external-url-blocked.png)

The architecture diagram is available as [JPG](../architecture/offline-e2e-security-boundary.jpg), [SVG](../architecture/offline-e2e-security-boundary.svg), and editable [draw.io source on GitHub](https://github.com/Sunwood-ai-labs/agent-egress-lab/blob/main/docs/architecture/offline-e2e-security-boundary.drawio).
