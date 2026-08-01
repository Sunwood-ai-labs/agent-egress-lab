# Security Policy

## Supported versions

Agent Egress Lab is an educational test fixture. Security fixes are applied to the latest release and the `main` branch only.

## Reporting a vulnerability

Do not open a public issue for a vulnerability, reachable target, credential exposure, or bypass that has not been patched.

Use GitHub's **Private vulnerability reporting** feature on this repository. Include the affected commit or release, reproduction steps, impact, and any suggested mitigation. If private reporting is unavailable, contact the repository owner through the Sunwood AI Labs organization profile without publishing exploit details.

We will acknowledge a report when it is reviewed and coordinate disclosure after a fix is available. This is a best-effort open-source project and does not provide a response-time SLA.

## Scope and limitations

The included proxies and quarantine worker are intentionally small educational fixtures, not hardened production boundaries. External content remains untrusted after processing. The adversarial suite checks known policy paths, but cannot prove the absence of unknown container, kernel, TLS, parser, dependency, browser, or model vulnerabilities.

The reference read-only Compose topology relies on all of these controls together: no application secrets or action tools in the research worker, an internal-only research network, an exact outbound URL allowlist, GET/HEAD only, arbitrary query rejection, DNS-address pinning, a read-only root filesystem, dropped Linux capabilities, and a separate approval network. Relaxing the exact URL policy to host-only browsing reopens URL path as a potential exfiltration channel.
