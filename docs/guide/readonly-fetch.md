# Read-only research gateway

The Research Airlock demonstrates a narrow outbound lane for web research: an internal browser talks only to a gateway, and the gateway permits HTTPS `GET` and `HEAD` to exact allowlisted hosts.

![Research Console after an allowlisted GET](../images/readonly-fetch/02-get-allowed.png)

## Run the verification

```powershell
./verify-readonly-fetch.ps1
```

The Playwright suite uses the visible console controls and verifies:

- `GET https://example.com/` succeeds through the gateway;
- `POST` is rejected with 405;
- a GET to `api.github.com` is rejected with 403 because the host is not allowlisted;
- direct browser navigation has no external route;
- plain HTTP is rejected; and
- five screenshots are saved at exactly 1200×900 under `artifacts/readonly-fetch/`.

![Write and host policy denials](../images/readonly-fetch/04-host-blocked.png)

## What the gateway fixes

Outbound requests use a fixed `User-Agent`, `Accept`, and `Connection` header set. Incoming `Authorization`, cookies, and other browser headers are not forwarded. Redirect destinations are validated again, response types are limited to text-like content, and the response body has a size limit.

## Important limits

This is an educational fixture, not a production security boundary. Blocking POST does **not** prevent all data exfiltration: query strings can carry data in GET requests, and some servers perform side effects on GET. The DNS check and subsequent connection are also separate operations, leaving a DNS rebinding/time-of-check gap. A production design needs request-aware policy, URL/query filtering, DNS pinning or a hardened proxy, audit logs, rate limits, scoped credentials, and approval for sensitive actions.

![Direct browser egress has no route](../images/readonly-fetch/05-direct-external-blocked.png)
