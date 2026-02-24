# Changelog

## 2026-02-24

- Added blocked-site resilience with a fallback HTTP fetch profile for block-like upstream responses (`403`, `429`, `503`).
- Added extraction diagnostics support via `extractRecipeWithDiagnostics(...)` in the core module.
- Added optional API debug mode (`debug=1` / `debug=true`) to return `_debug` metadata in success and error responses.
- Added structured failure context on extraction errors (phase, fetch profile, parser path, final URL, upstream status/code).
- Added parser diagnostics to distinguish extraction path (`json-ld` vs `microdata`).
- Tuned domain cooldown behavior to reduce false positives:
  - cooldown now requires repeated `403` responses
  - shorter default cooldown window
- Expanded unit coverage for:
  - fallback fetch behavior
  - diagnostics payloads
  - repeated-`403` cooldown behavior
- Updated README usage with correct debug-mode request examples and query format notes.
