# Contributing

Thanks for helping improve Agent Egress Lab.

## Before opening a pull request

1. Keep the repository focused on reproducible AI-agent egress and browser-isolation experiments.
2. Do not include credentials, private hosts, customer data, or unpatched exploit details.
3. Run the relevant verification scripts:

   ```powershell
   ./verify.ps1
   ./verify-offline-e2e.ps1
   ```

4. When docs change, run:

   ```powershell
   cd docs
   npm ci
   npm run docs:build
   ```

5. Explain the security assumption being tested and the residual risk that remains.

## Pull requests

- Prefer small, evidence-backed changes.
- Update English and Japanese documentation together when operator behavior changes.
- Add or update verification when a security-control claim changes.
- Treat generated screenshots and reports as transient unless they are intentionally curated public evidence.

For security-sensitive reports, follow [`SECURITY.md`](./SECURITY.md) instead of opening a public issue.
