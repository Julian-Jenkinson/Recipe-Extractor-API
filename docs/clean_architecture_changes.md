# Clean Architecture Refactor Summary

## Scope
Refactored the extraction codebase from a monolithic module into layered architecture with clearer separation of concerns, stronger typing, and dependency injection.

## Architectural Changes

### 1. Domain Layer
Added core domain contracts and types:

- `src/domain/types.ts`
  - `Recipe` interface
- `src/domain/errors.ts`
  - `RecipeExtractionError`
- `src/domain/contracts.ts`
  - service-facing abstractions (`HttpGetter`, `HtmlResponse`, parser/guard contracts)

### 2. Application Layer
Added shared configuration and reusable cache component:

- `src/application/config.ts`
  - centralized constants for fetch/retry/cache/url limits
- `src/application/ttlCache.ts`
  - generic TTL cache with bounded-size pruning

### 3. Infrastructure Layer
Introduced infrastructure adapter for HTTP:

- `src/infrastructure/axiosHttpClient.ts`
  - Axios-backed `HttpGetter`
  - keep-alive agents and default request configuration

### 4. Service Layer Separation
Split behavior into dedicated services:

- `src/services/urlGuardService.ts`
  - URL validation + SSRF destination checks
- `src/services/htmlFetchService.ts`
  - retry, redirect handling, content-type enforcement
- `src/services/recipeParserService.ts`
  - JSON-LD + microdata parsing and normalization helpers
- `src/services/recipeExtractorService.ts`
  - orchestration of validation/fetch/parse/cache pipeline

### 5. Composition Root / API Compatibility
Rebuilt `src/index.ts` as composition root wiring the services together.

Preserved external API compatibility:

- `extractRecipe(...)`
- `RecipeExtractionError`
- `Recipe` type export
- `__testUtils` hooks used by test suites

## Dependency Injection Improvements

- URL guard receives injectable DNS lookup function.
- HTML fetch service receives injectable HTTP client.
- Extractor orchestration composes services via constructor injection.
- Test hooks can swap DNS/HTTP dependencies without patching core logic.

## Reusability and Type Clarity Improvements

- Normalization and parser helpers are isolated and reusable.
- Cross-cutting config moved out of business logic.
- Domain contracts reduce implicit coupling between modules.
- Cache utility is generic and reusable for other features.

## Verification

Executed after refactor:

- `npm run build` (pass)
- `npm test -- --watchman=false` (pass)

Coverage remained above configured 80% global thresholds.

## Files Added

- `src/domain/types.ts`
- `src/domain/errors.ts`
- `src/domain/contracts.ts`
- `src/application/config.ts`
- `src/application/ttlCache.ts`
- `src/infrastructure/axiosHttpClient.ts`
- `src/services/urlGuardService.ts`
- `src/services/htmlFetchService.ts`
- `src/services/recipeParserService.ts`
- `src/services/recipeExtractorService.ts`
- `docs/clean_architecture_changes.md`

## Files Updated

- `src/index.ts`
- generated build artifacts under `dist/`
