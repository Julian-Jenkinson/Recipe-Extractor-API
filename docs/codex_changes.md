# Codex Changes Summary

## Scope
Security audit and hardening for the recipe extraction API.

## What Was Changed

### 1. SSRF protections
- Added strict URL validation before any outbound request:
  - Only `http`/`https`
  - Reject URL credentials
  - Reject non-standard ports (allow only `80`/`443`)
  - Reject local/internal hostnames (`localhost`, `.local`, `.internal`)
  - Enforce max URL length
- Added DNS/IP destination checks:
  - Reject private/reserved IPv4 and IPv6 ranges
  - Reject unresolved hosts
- Added safe redirect handling:
  - Manual redirect flow with per-hop revalidation
  - Max redirect cap

### 2. Input validation hardening
- Centralized URL extraction/validation for GET and POST paths.
- Added strict JSON body parsing with request size limit (`10kb`).
- Enforced `Content-Type: application/json` for POST requests.

### 3. DoS resistance improvements
- Added outbound fetch timeout.
- Added response size caps for downloaded HTML.
- Restricted parsing to HTML/XHTML content types.

### 4. Rate limiting
- Added in-memory IP-based fixed-window limiter.
- Added rate limit headers:
  - `RateLimit-Limit`
  - `RateLimit-Remaining`
  - `RateLimit-Reset`
- Returns `429` when the limit is exceeded.

### 5. Header hardening
- Disabled `x-powered-by`.
- Added defensive response headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Cross-Origin-Resource-Policy: same-site`
  - `Permissions-Policy`
  - `Content-Security-Policy` for API responses

### 6. CORS hardening
- Replaced open CORS policy with allowlist-based policy via `CORS_ORIGINS` env var.
- Requests without `Origin` remain allowed for server-to-server/curl usage.

### 7. Error handling / leakage reduction
- Introduced `RecipeExtractionError` with explicit status + safe public message.
- Replaced raw internal error reflection with centralized sanitized error responses.
- Mapped common outbound fetch failures to safe API-level errors (timeout, blocked target, bad upstream response).

### 8. Tests
- Added `tests/security.test.ts` covering:
  - non-http URL rejection
  - localhost/private IP rejection
  - credentials-in-URL rejection
  - typed bad-input error handling

## Files Updated
- `src/index.ts`
- `server.js`
- `tests/security.test.ts`
- `dist/index.js`
- `dist/index.d.ts`
- `dist/index.js.map`

## Verification Performed
- `npm run build` (pass)
- `npm test -- --watchman=false tests/security.test.ts` (pass)

## Notes
- Rate limiting is currently in-memory and per-instance. For multi-instance deployments, use a shared store (e.g. Redis) for consistent global enforcement.
