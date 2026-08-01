# Agent Egress Lab

A small Docker lab that demonstrates default-deny outbound networking for an AI agent runner.

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

The result is saved to `output/verification.log`.

## Architecture

```text
agent-runner -- internal sandbox network --> egress-proxy --> internet
                                                |
                                                +-- allow api.github.com:443
                                                +-- deny everything else
```

## Important limitation

An allowlist narrows the outbound surface, but it does not make an allowed destination safe. Data can still be sent through an allowed API. Production systems also need scoped credentials, request-level policy, audit logs, and approval for high-impact actions.

The included proxy is a deliberately small test fixture. Do not use it as a production security boundary.
