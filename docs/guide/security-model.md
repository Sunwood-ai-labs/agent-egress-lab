# Security model

## Goals

Agent Egress Lab demonstrates network-level controls for two narrow workloads:

- the `agent-runner` has no direct external route and must use the egress proxy;
- the `e2e-runner` can reach only services attached to its internal Docker network.

The verification scripts prove these properties for the included Compose topologies and named test targets.

![Offline E2E security boundary](../architecture/offline-e2e-security-boundary.jpg)

## Agent path

The `sandbox` network is declared with `internal: true`. The agent has proxy environment variables pointing to `egress-proxy`, while the proxy is attached to both `sandbox` and `outside`. `proxy.py` accepts only the CONNECT method and compares the requested `host:port` against `ALLOWED_CONNECT_TARGETS`.

This is destination allowlisting, not content inspection. A request to an allowed target can still carry sensitive data.

## Offline browser path

The `offline-e2e` network is also declared with `internal: true`, but it has no dual-homed proxy. Both the Playwright runner and `local-app` share that network, so the internal page loads. Public DNS resolution or routing fails inside the runner, producing browser-level error evidence.

## Threats reduced

- accidental direct outbound requests from the agent container;
- generated E2E code navigating to a public destination from the offline runner;
- access to proxy destinations that are absent from the configured `host:port` allowlist.

## Out of scope

- payload inspection or data-loss prevention;
- trustworthiness of an allowed destination;
- credentials already available to the agent;
- traffic from the Docker host or other networks;
- DNS pinning, advanced proxy hardening, identity-aware policy, or multi-tenant isolation;
- production availability, observability, and incident response.

For a production design, combine network controls with scoped credentials, request-level authorization, approvals for high-impact operations, audit logs, rate limits, and a maintained proxy or gateway.
