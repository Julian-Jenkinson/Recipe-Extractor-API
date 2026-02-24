# Fly.io Optimizations

## What Is Configured Now

Current Fly-specific optimizations in `fly.toml` and runtime:

- `auto_stop_machines = 'suspend'` for faster resume
- `min_machines_running = 1` to reduce cold starts
- Request concurrency caps:
  - `soft_limit = 20`
  - `hard_limit = 40`
- Health checks on `GET /health`
- VM memory set to `512mb`
- Runtime env defaults:
  - `NODE_ENV=production`
  - `PORT=3000`
  - `TRUST_PROXY_HOPS=1`
- Graceful shutdown handling (`SIGTERM`/`SIGINT`) in `server.js`

## Why These Settings

- `suspend` + one warm machine improves p95 latency for sporadic traffic.
- Concurrency caps prevent overload and provide stable tail latency.
- Health checks give safer rollouts and automatic recovery.
- Graceful shutdown prevents dropped in-flight requests during deploy/stop events.

## Tuning Profiles

### Low traffic / latency-sensitive

Use when traffic is bursty and cold starts are noticeable.

Recommended:

- `min_machines_running = 1`
- `auto_stop_machines = 'suspend'`
- `soft_limit = 20`
- `hard_limit = 40`
- `vm.memory = '512mb'`

### Cost-optimized / background usage

Use when occasional startup delay is acceptable.

Recommended:

- `min_machines_running = 0`
- `auto_stop_machines = 'stop'`
- `soft_limit = 15`
- `hard_limit = 30`
- `vm.memory = '256mb'`

### Higher traffic / heavier extraction load

Use when sustained traffic increases and upstream fetch latency dominates.

Recommended starting point:

- `min_machines_running = 1` (or more, based on region demand)
- `auto_stop_machines = 'suspend'`
- `soft_limit = 25`
- `hard_limit = 50`
- `vm.memory = '1gb'`

Then scale horizontally (more machines/regions) before pushing hard limits too high.

## Operational Checks

After deploy:

1. `fly status`
2. `fly logs`
3. `curl https://<your-app>.fly.dev/health`
4. Run a sample extraction request and confirm latency/error rate

## Notes

- `TRUST_PROXY_HOPS=1` is appropriate for Fly’s edge proxy model.
- Keep rate limits (`RATE_LIMIT_*`) aligned with Fly concurrency limits.
- If memory pressure appears, lower extraction cache size (`EXTRACTION_CACHE_MAX_ENTRIES`) or increase VM memory.
