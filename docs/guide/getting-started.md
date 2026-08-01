# Getting started

This guide runs both security experiments and explains the evidence they produce.

## Prerequisites

- Docker Engine or Docker Desktop with Docker Compose v2
- PowerShell 7 (`pwsh`)
- Internet access while building images and checking the allowlisted GitHub API target

## Run the agent-egress verification

From the repository root:

```powershell
./verify.ps1
```

The script builds the proxy, then checks three distinct paths:

1. direct access to `api.github.com:443` with proxy bypassed must fail;
2. access to `api.github.com:443` through the configured proxy must succeed;
3. access to `example.com:443` through the proxy must fail, and the proxy log must contain the denial.

Successful output ends with `RESULT: 3/3 controls verified`. The report data is written to `report/results.json`; transient console evidence is written to ignored `output/verification.log`.

## Run the offline browser verification

```powershell
./verify-offline-e2e.ps1
```

The Playwright container loads `http://local-app/` on the same internal Docker network. It then attempts `https://example.com/`, which must fail because that network has no external route. Transient screenshots and JSON evidence are written under ignored `artifacts/`.

## View the report

After running `./verify.ps1`:

```powershell
./serve-report.ps1
```

Open `http://127.0.0.1:4173`. The committed report is a human-readable view of the latest curated verification data, not a monitoring service.

## Clean up

```powershell
docker compose down --remove-orphans
docker compose -f offline-e2e.compose.yaml down --remove-orphans
```

Continue with the [security model](./security-model) before changing targets or using the topology elsewhere.
