# Security Policy

## Supported versions

Agent Egress Lab is an educational test fixture. Security fixes are applied to the latest release and the `main` branch only.

## Reporting a vulnerability

Do not open a public issue for a vulnerability, reachable target, credential exposure, or bypass that has not been patched.

Use GitHub's **Private vulnerability reporting** feature on this repository. Include the affected commit or release, reproduction steps, impact, and any suggested mitigation. If private reporting is unavailable, contact the repository owner through the Sunwood AI Labs organization profile without publishing exploit details.

We will acknowledge a report when it is reviewed and coordinate disclosure after a fix is available. This is a best-effort open-source project and does not provide a response-time SLA.

## Scope and limitations

The included CONNECT proxy is intentionally small and is not hardened for production. The lab demonstrates network topology and allowlisting; it does not provide payload inspection, DLP, identity-aware policy, credential isolation, or protection against exfiltration through an allowed destination.
