# Agent Egress Lab

A small Docker lab that demonstrates default-deny outbound networking for an AI agent runner.

It also includes an offline Playwright E2E Runner. The browser can open a local app on the same internal Docker network, while an external page fails to load and produces a real Chromium error screenshot.

The agent container is attached only to an internal Docker network. It cannot reach the internet directly. A dual-homed CONNECT proxy provides the only outbound path and permits only an explicit host and port allowlist.

## Verified cases

| Path | Expected result |
| --- | --- |
| Agent to internet directly | Blocked |
| Agent to `api.github.com:443` through proxy | Allowed |
| Agent to `example.com:443` through proxy | Denied with HTTP 403 |

Run the verification:

```powershell
./verify.ps1
```

Run the offline browser verification:

```powershell
./verify-offline-e2e.ps1
```

The offline browser check verifies both sides of the boundary:

- `http://local-app/` loads inside the internal Docker network.
- `https://example.com/` fails because the E2E Runner has no internet route.

![Chromium showing No internet from the offline E2E Runner](docs/images/offline-e2e-external-error.png)

The result is saved to `output/verification.log`.

## Architecture

![Offline E2E Runner security boundary](docs/architecture/offline-e2e-security-boundary.jpg)

The diagram's editable source is [`docs/architecture/offline-e2e-security-boundary.drawio`](docs/architecture/offline-e2e-security-boundary.drawio).

```text
agent-runner -- internal sandbox network --> egress-proxy --> internet
                                                |
                                                +-- allow api.github.com:443
                                                +-- deny everything else

Playwright E2E Runner -- internal-only network --> local test app
                     X no route to the internet
```

## Important limitation

An allowlist narrows the outbound surface, but it does not make an allowed destination safe. Data can still be sent through an allowed API. Production systems also need scoped credentials, request-level policy, audit logs, and approval for high-impact actions.

The included proxy is a deliberately small test fixture. Do not use it as a production security boundary.
