import axios from "axios";
import { MAX_FETCH_RETRIES, MAX_REDIRECTS, RETRY_BASE_DELAY_MS } from "../application/config.js";
import { RecipeExtractionError } from "../domain/errors.js";
import type { HtmlResponse, HttpGetter } from "../domain/contracts.js";
import type { UrlGuardService } from "./urlGuardService.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientAxiosError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  if (status && [429, 502, 503, 504].includes(status)) return true;
  return ["ECONNABORTED", "ECONNRESET", "EAI_AGAIN", "ETIMEDOUT", "ENOTFOUND"].includes(
    String(error.code)
  );
}

function isBlockLikeAxiosError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status !== undefined && [403, 429, 503].includes(status);
}

export class HtmlFetchService {
  constructor(
    private readonly httpGetter: HttpGetter,
    private readonly urlGuard: UrlGuardService,
    private readonly fallbackHttpGetter?: HttpGetter
  ) {}

  async fetchHtmlWithRetry(url: URL): Promise<HtmlResponse> {
    const result = await this.fetchHtmlWithRetryDetailed(url);
    return result.response;
  }

  async fetchHtmlWithRetryDetailed(url: URL): Promise<{ response: HtmlResponse; fetchProfile: "primary" | "fallback" }> {
    let triedFallback = false;

    for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt += 1) {
      try {
        const response = await this.httpGetter.get(url.toString());
        return { response, fetchProfile: "primary" };
      } catch (error) {
        if (isBlockLikeAxiosError(error) && this.fallbackHttpGetter && !triedFallback) {
          triedFallback = true;
          const jitter = Math.floor(Math.random() * 100);
          await sleep(100 + jitter);
          try {
            const fallbackResponse = await this.fallbackHttpGetter.get(url.toString());
            return { response: fallbackResponse, fetchProfile: "fallback" };
          } catch (fallbackError) {
            error = fallbackError;
          }
        }

        if (attempt >= MAX_FETCH_RETRIES || !isTransientAxiosError(error)) {
          throw error;
        }

        const jitter = Math.floor(Math.random() * 100);
        const backoff = RETRY_BASE_DELAY_MS * 2 ** attempt + jitter;
        await sleep(backoff);
      }
    }

    throw new RecipeExtractionError(502, "Failed to fetch target URL");
  }

  async fetchHtmlSafely(initialUrl: URL): Promise<{ html: string; finalUrl: URL; fetchProfile: "primary" | "fallback" }> {
    let currentUrl = initialUrl;
    let fetchProfile: "primary" | "fallback" = "primary";

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      await this.urlGuard.assertPublicDestination(currentUrl);

      const fetched = await this.fetchHtmlWithRetryDetailed(currentUrl);
      const response = fetched.response;
      fetchProfile = fetched.fetchProfile;

      if (response.status >= 300 && response.status < 400) {
        const locationHeader = response.headers.location;
        if (!locationHeader || Array.isArray(locationHeader) || typeof locationHeader !== "string") {
          throw new RecipeExtractionError(400, "Invalid redirect response from target URL");
        }

        currentUrl = this.urlGuard.validateAndNormalizeUrl(new URL(locationHeader, currentUrl).toString());
        continue;
      }

      const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
      if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        throw new RecipeExtractionError(422, "Target URL did not return an HTML document");
      }

      if (typeof response.data !== "string") {
        throw new RecipeExtractionError(422, "Target URL returned invalid HTML content");
      }

      return { html: response.data, finalUrl: currentUrl, fetchProfile };
    }

    throw new RecipeExtractionError(400, "Too many redirects");
  }
}

export { isTransientAxiosError };
