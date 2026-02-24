# Docker and Deployment Changes Summary

## Scope
Production-readiness refactor for container build and deployment setup.

## What Changed

### 1. Dockerfile refactor
- Replaced previous layout with a hardened multi-stage build:
  - `deps` stage: install dev deps for build
  - `build` stage: compile TypeScript to `dist`
  - `prod-deps` stage: install production-only dependencies
  - `runner` stage: minimal runtime image
- Switched runtime to Node Alpine image for smaller footprint.
- Runtime image now only includes:
  - `node_modules` (prod only)
  - `dist/`
  - `server.js`
  - `package.json`
- Runs as non-root (`USER node`).
- Added build cache mounts for npm (`--mount=type=cache,target=/root/.npm`).
- Added safer env defaults in image (`NODE_ENV=production`, disable npm audit/fund/update notifier).

### 2. Build context optimization
- Populated `.dockerignore` to avoid sending unnecessary files in Docker context:
  - `node_modules`, tests, docs, coverage, git metadata, env files, etc.

### 3. Deployment health readiness
- Added `/health` route in the API server for liveness/readiness checks.
- Added Fly health check in `fly.toml`:
  - path: `/health`
  - interval, timeout, and grace period configured.

### 4. README deployment updates
- Added production Docker build/run commands.
- Added health-check smoke commands.
- Added environment variable documentation.
- Added Fly deployment checklist.

## Files Updated
- `Dockerfile`
- `.dockerignore`
- `server.js`
- `fly.toml`
- `README.md`

## Verification
- `npm run build` passed.
- `npm test -- --watchman=false` passed after changes.

## Notes
- Current image uses Node `20.19.5` (LTS-aligned pin in Dockerfile).
- Health endpoint is intentionally lightweight and does not perform external dependency probes.
