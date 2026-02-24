export const MAX_URL_LENGTH = 2048;
export const MAX_REDIRECTS = 5;
export const FETCH_TIMEOUT_MS = 8000;
export const MAX_HTML_BYTES = 1024 * 1024;
export const MAX_FETCH_RETRIES = 2;
export const RETRY_BASE_DELAY_MS = 200;
export const MAX_JSON_LD_SCRIPT_BYTES = 256 * 1024;
export const CACHE_TTL_MS = Number(process.env.EXTRACTION_CACHE_TTL_MS || 60_000);
export const CACHE_MAX_ENTRIES = Number(process.env.EXTRACTION_CACHE_MAX_ENTRIES || 500);
export const NEGATIVE_CACHE_TTL_MS = Number(process.env.NEGATIVE_CACHE_TTL_MS || 120_000);
export const NEGATIVE_CACHE_MAX_ENTRIES = Number(process.env.NEGATIVE_CACHE_MAX_ENTRIES || 1000);
export const DOMAIN_BLOCK_COOLDOWN_MS = Number(process.env.DOMAIN_BLOCK_COOLDOWN_MS || 60_000);
export const DOMAIN_BLOCK_CONSECUTIVE_403_THRESHOLD = Number(
  process.env.DOMAIN_BLOCK_CONSECUTIVE_403_THRESHOLD || 2
);

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
