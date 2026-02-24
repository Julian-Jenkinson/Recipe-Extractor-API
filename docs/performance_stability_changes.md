# Performance and Stability Changes

## Scope
Refactor focused on request throughput, resilience, and memory efficiency in the extraction pipeline.

## Implemented Changes

### 1. Shared Axios client with keep-alive
- Replaced per-request Axios config construction with a shared `axios.create(...)` client.
- Added keep-alive HTTP/HTTPS agents to reuse sockets and reduce connection churn.
- Kept explicit fetch guards:
  - request timeout
  - max response size (`maxContentLength`, `maxBodyLength`)
  - manual redirect mode (`maxRedirects: 0`)

### 2. Retry logic for transient upstream failures
- Added bounded retries (`MAX_FETCH_RETRIES = 2`) with exponential backoff + jitter.
- Retries trigger only for transient conditions:
  - HTTP: `429`, `502`, `503`, `504`
  - network: `ECONNABORTED`, `ECONNRESET`, `EAI_AGAIN`, `ETIMEDOUT`, `ENOTFOUND`
- Non-transient errors fail fast (no unnecessary retry amplification).

### 3. Reduced DOM parsing memory usage
- Introduced a JSON-LD-first path that parses `application/ld+json` blocks directly from raw HTML.
- Added per-script size cap (`MAX_JSON_LD_SCRIPT_BYTES`) to avoid large JSON-LD payload spikes.
- Full Cheerio DOM parsing is now deferred and used only when JSON-LD extraction misses.

### 4. Caching opportunities implemented
- Added in-memory TTL cache keyed by normalized URL.
- Added cache pruning and bounded capacity to prevent unbounded memory growth.
- Cache controls are configurable:
  - `EXTRACTION_CACHE_TTL_MS` (default `60000`)
  - `EXTRACTION_CACHE_MAX_ENTRIES` (default `500`)

### 5. Refactoring for reduced duplicate work
- Added `buildRecipeFromSchemaData(...)` to centralize schema-to-output mapping.
- Added `fetchHtmlWithRetry(...)` and reusable helper utilities for cleaner control flow.

## Files Updated
- `src/index.ts`
- Generated build outputs:
  - `dist/index.js`
  - `dist/index.d.ts`
  - `dist/index.js.map`

## Validation Performed
- `npm run build` (pass)
- `npm test -- --watchman=false tests/security.test.ts` (pass)

## Notes
- Cache is process-local and in-memory. In multi-instance deployments, each instance maintains its own cache.
- Retry count is intentionally small to avoid excessive tail latency under sustained upstream failure.
