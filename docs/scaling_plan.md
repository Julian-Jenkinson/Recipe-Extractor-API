# API Scaling Plan

## Scope
Scaling strategy for the Recipe Extractor API across three growth stages:

- 10k users
- 100k users
- 1M users

This plan assumes extraction (external fetch + parse) remains the dominant cost and latency driver.

## Guiding Principles

- Keep API tier stateless and horizontally scalable.
- Isolate scraping workload from request/response path as volume grows.
- Cache aggressively (result cache > metadata cache > infra cache).
- Add backpressure and admission control before bottlenecks become outages.
- Instrument first; scale based on measured bottlenecks.

## Stage 1: ~10k Users

### Target Architecture
- API service (current Express app) on Fly with 1-3 machines.
- In-memory cache + optional Redis for shared cache.
- Synchronous extraction path still acceptable.

### Caching Strategy
- Keep current process TTL cache for hot URLs.
- Add Redis shared cache for multi-instance consistency:
  - key: normalized URL
  - TTL: 10-60 minutes
  - payload: extracted recipe JSON + metadata (`fetched_at`, `status`)
- Add short negative cache (e.g., 2-5 min) for repeated 403/404/422 sources.

### Queue / Worker
- Not required yet for all requests.
- Add optional async mode endpoint:
  - `POST /extract/async` -> returns job ID
  - background worker extracts and stores result

### Scraping Worker Isolation
- Start with same runtime profile; separate process type if possible.
- Add per-domain concurrency limits to prevent bans.

### Database
- Minimal persistence if needed:
  - Postgres table: `extractions`
  - columns: `url_hash`, `url`, `result_json`, `status`, `error`, `created_at`, `updated_at`
- Use DB mainly for audit/history and warm cache seeding.

### Observability / Monitoring
- Metrics:
  - request rate, p50/p95 latency, 4xx/5xx
  - extraction success rate
  - upstream fetch timeout/error rate
  - cache hit ratio
- Logs:
  - structured JSON logs with request ID + URL host only (no sensitive payload)
- Alerts:
  - 5xx > 2%
  - p95 > 3s
  - timeout spikes

## Stage 2: ~100k Users

### Target Architecture
- API tier + dedicated worker tier.
- Redis for cache + queue backend.
- Extraction moved mostly async with optional sync for cache-hit fast path.

### Caching Strategy
- Multi-layer cache:
  - L1: per-instance memory cache (small TTL)
  - L2: Redis shared cache (longer TTL)
  - optional CDN cache for GET requests with normalized query keys
- Introduce stale-while-revalidate behavior:
  - serve stale cached result quickly
  - refresh in background

### Queue System
- Introduce durable queue (BullMQ on Redis, or SQS/RabbitMQ):
  - job payload: normalized URL + priority + retry count
  - retry policy with exponential backoff and dead-letter queue
- Queue-level controls:
  - per-domain throttling
  - global concurrency caps
  - max job age/TTL

### Scraping Worker Isolation
- Separate worker app/process group from API.
- Separate resource class (more CPU/memory for parsing/fetching).
- Network policy hardening for egress (block private ranges already in app, plus infra-level controls).
- Circuit breaker per domain when repeated bans/timeouts occur.

### Database
- Move to managed Postgres (or equivalent) with:
  - partitioning by date if write-heavy
  - indexes on `url_hash`, `status`, `updated_at`
- Optional object storage for large extraction artifacts; DB stores references.
- Add idempotency key table for async requests.

### Observability / Monitoring
- Add tracing (OpenTelemetry):
  - spans: API request, cache lookup, queue enqueue/dequeue, fetch, parse, persist
- SLOs:
  - availability 99.9%
  - async completion under X minutes
- Dashboards:
  - queue depth, job latency, worker utilization
  - domain-level fail/timeout rates

## Stage 3: ~1M Users

### Target Architecture
- Fully decoupled pipeline:
  - API Gateway + stateless API layer
  - distributed queue
  - autoscaled scraping workers
  - dedicated cache cluster
  - managed database + analytics pipeline
- Multi-region read/API presence (workers regionalized where beneficial).

### Caching Strategy
- Strong cache-first model:
  - high cache TTL for stable recipe pages
  - content fingerprinting/versioning to avoid unnecessary re-scrape
- Pre-warming for popular domains/URLs.
- Domain policy registry (TTL/retry/concurrency rules per host).

### Queue System
- Move to high-throughput durable queue platform if needed (SQS/Kafka/Rabbit depending on ops preference).
- Priority lanes:
  - user-triggered interactive jobs
  - background refresh jobs
- Dead-letter processing workflow + automated replay tooling.

### Scraping Worker Isolation
- Dedicated worker pools by domain category/risk profile.
- Sandboxed execution model for parsing/fetching (security + blast-radius control).
- Autoscaling based on queue lag, CPU, memory, and upstream error rate.
- Rate-limit and adaptive scheduler per domain to avoid IP bans.

### Database
- Clear separation of workloads:
  - OLTP (job/results metadata)
  - analytics warehouse (usage/failure trends)
- Read replicas for query-heavy internal dashboards.
- Archival lifecycle policy for old extraction records.

### Observability / Monitoring
- Mature incident model:
  - SLO error budgets
  - on-call runbooks
  - auto-remediation for queue/worker saturation
- Security monitoring:
  - anomaly detection on outbound request patterns
  - abuse detection (API key/user/IP)
- Business-level telemetry:
  - successful extraction rate per domain
  - median time-to-result per user tier

## Cross-Cutting Recommendations

### API Access Control
- Introduce API keys and per-key quotas before 100k scale.
- Add tiered rate limits by plan and endpoint type (sync vs async).

### Contract and Idempotency
- Add job status endpoints:
  - `POST /extract/async`
  - `GET /jobs/:id`
  - `GET /jobs/:id/result`
- Require idempotency keys on async submission to avoid duplicate jobs.

### Capacity Planning Targets
- Track and plan around:
  - cache hit ratio target: >60% at 100k, >80% at 1M for repeated URLs
  - queue lag target: <30s p95 at steady state
  - worker success rate: >95% (excluding blocked/bot-protected domains)

## Suggested Rollout Sequence

1. Add Redis shared cache + negative cache.
2. Add async extraction endpoints and queue-backed workers.
3. Introduce persistent extraction/job store in managed Postgres.
4. Add tracing + queue/worker dashboards + alerting.
5. Introduce API keys/quotas and per-domain scheduling.
6. Expand to multi-region + advanced queue/workload partitioning.
