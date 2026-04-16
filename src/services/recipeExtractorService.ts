import axios from "axios";
import { RecipeExtractionError } from "../domain/errors.js";
import type { Recipe } from "../domain/types.js";
import { TtlCache } from "../application/ttlCache.js";
import {
  DOMAIN_BLOCK_CONSECUTIVE_403_THRESHOLD,
  DOMAIN_BLOCK_COOLDOWN_MS,
} from "../application/config.js";
import type { HtmlFetchService } from "./htmlFetchService.js";
import type { RecipeParserService } from "./recipeParserService.js";
import type { UrlGuardService } from "./urlGuardService.js";

type NegativeCacheEntry = {
  statusCode: number;
  publicMessage: string;
};

export type ExtractionDiagnostics = {
  normalizedUrl: string;
  finalUrl?: string;
  sourceDomain?: string;
  fetchProfile?: "primary" | "fallback";
  parserPath?: "json-ld" | "microdata";
  failurePhase?: "validate" | "fetch" | "parse" | "cooldown" | "cache";
  upstreamStatus?: number;
  upstreamCode?: string;
};

export class RecipeExtractorService {
  private readonly blockedDomains = new Map<string, number>();
  private readonly domain403Counts = new Map<string, number>();

  constructor(
    private readonly urlGuard: UrlGuardService,
    private readonly htmlFetcher: HtmlFetchService,
    private readonly parser: RecipeParserService,
    private readonly cache: TtlCache<Recipe>,
    private readonly negativeCache: TtlCache<NegativeCacheEntry>
  ) {}

  async extractRecipe(inputUrl: string): Promise<Recipe> {
    const result = await this.extractRecipeWithDiagnostics(inputUrl);
    return result.recipe;
  }

  async extractRecipeWithDiagnostics(inputUrl: string): Promise<{ recipe: Recipe; diagnostics: ExtractionDiagnostics }> {
    const diagnostics: ExtractionDiagnostics = { normalizedUrl: "" };
    let safeUrl: URL;
    try {
      safeUrl = this.urlGuard.validateAndNormalizeUrl(inputUrl);
      diagnostics.normalizedUrl = safeUrl.toString();
    } catch (error) {
      if (error instanceof RecipeExtractionError) throw error;
      throw new RecipeExtractionError(400, "Invalid URL", { failurePhase: "validate" });
    }

    const cacheKey = safeUrl.toString();
    const domainKey = safeUrl.hostname.toLowerCase();
    const blockedUntil = this.blockedDomains.get(domainKey);
    if (blockedUntil && Date.now() < blockedUntil) {
      throw new RecipeExtractionError(403, "Target site is temporarily blocked. Please retry shortly.", {
        ...diagnostics,
        failurePhase: "cooldown",
      });
    }

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        recipe: cached,
        diagnostics: { ...diagnostics, sourceDomain: safeUrl.hostname.replace(/^www\./, ""), failurePhase: "cache" },
      };
    }

    const cachedFailure = this.negativeCache.get(cacheKey);
    if (cachedFailure) {
      throw new RecipeExtractionError(cachedFailure.statusCode, cachedFailure.publicMessage, {
        ...diagnostics,
        failurePhase: "cache",
      });
    }

    let html: string;
    let finalUrl: URL;
    let fetchProfile: "primary" | "fallback";
    try {
      const fetched = await this.htmlFetcher.fetchHtmlSafely(safeUrl);
      html = fetched.html;
      finalUrl = fetched.finalUrl;
      fetchProfile = fetched.fetchProfile;
      diagnostics.finalUrl = finalUrl.toString();
      diagnostics.fetchProfile = fetchProfile;
    } catch (error: any) {
      if (error instanceof RecipeExtractionError) {
        const wrapped = new RecipeExtractionError(error.statusCode, error.publicMessage, {
          ...diagnostics,
          failurePhase: "fetch",
          ...(error.debugDetails ?? {}),
        });
        this.memoizeFailure(cacheKey, domainKey, wrapped);
        throw wrapped;
      }

      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          const mapped = new RecipeExtractionError(504, "Timed out while fetching target URL", {
            ...diagnostics,
            failurePhase: "fetch",
            upstreamCode: String(error.code),
          });
          this.memoizeFailure(cacheKey, domainKey, mapped);
          throw mapped;
        }
        if (error.response?.status === 403) {
          const mapped = new RecipeExtractionError(403, "Target site blocked this request", {
            ...diagnostics,
            failurePhase: "fetch",
            upstreamStatus: 403,
            upstreamCode: String(error.code ?? ""),
          });
          this.memoizeFailure(cacheKey, domainKey, mapped);
          throw mapped;
        }
        if (error.response?.status === 429 || error.response?.status === 503) {
          const mapped = new RecipeExtractionError(503, "Target site is rate limiting requests", {
            ...diagnostics,
            failurePhase: "fetch",
            upstreamStatus: Number(error.response.status),
            upstreamCode: String(error.code ?? ""),
          });
          this.memoizeFailure(cacheKey, domainKey, mapped);
          throw mapped;
        }
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          const mapped = new RecipeExtractionError(422, "Target URL returned an unexpected response", {
            ...diagnostics,
            failurePhase: "fetch",
            upstreamStatus: Number(error.response.status),
            upstreamCode: String(error.code ?? ""),
          });
          this.memoizeFailure(cacheKey, domainKey, mapped);
          throw mapped;
        }
        const mapped = new RecipeExtractionError(502, "Failed to fetch target URL", {
          ...diagnostics,
          failurePhase: "fetch",
          upstreamStatus: Number(error.response?.status ?? 0) || undefined,
          upstreamCode: String(error.code ?? ""),
        });
        this.memoizeFailure(cacheKey, domainKey, mapped);
        throw mapped;
      }

      const mapped = new RecipeExtractionError(500, "Recipe extraction failed", {
        ...diagnostics,
        failurePhase: "fetch",
      });
      this.memoizeFailure(cacheKey, domainKey, mapped);
      throw mapped;
    }

    let recipe: Recipe;
    try {
      const source = finalUrl.hostname.replace(/^www\./, ""); // keep this
      const fullUrl = finalUrl.href; // add this
      

      const parsed = this.parser.parseWithDiagnostics(html, source);
      recipe = parsed.recipe;

      recipe.source = source;     // ensure consistency
      recipe.finalUrl = fullUrl;  // <-- THIS is missing

      diagnostics.sourceDomain = source;
      diagnostics.finalUrl = fullUrl; // <-- new addition
      diagnostics.parserPath = parsed.parserPath;

    } catch (error) {
      if (error instanceof RecipeExtractionError) {
        const wrapped = new RecipeExtractionError(error.statusCode, error.publicMessage, {
          ...diagnostics,
          failurePhase: "parse",
          ...(error.debugDetails ?? {}),
        });
        this.memoizeFailure(cacheKey, domainKey, wrapped);
        throw wrapped;
      }
      throw error;
    }
    this.cache.set(cacheKey, recipe);
    this.clearDomainFailureState(domainKey);
    return { recipe, diagnostics };
  }

  clearRuntimeState(): void {
    this.blockedDomains.clear();
    this.domain403Counts.clear();
    this.negativeCache.clear();
  }

  private memoizeFailure(cacheKey: string, domainKey: string, error: RecipeExtractionError): void {
    if ([403, 422, 429].includes(error.statusCode)) {
      this.negativeCache.set(cacheKey, {
        statusCode: error.statusCode,
        publicMessage: error.publicMessage,
      });
    }

    if (error.statusCode !== 403) {
      this.clearDomainFailureState(domainKey);
      return;
    }

    // Require repeated 403s before domain cooldown to reduce false positives.
    const count = (this.domain403Counts.get(domainKey) ?? 0) + 1;
    this.domain403Counts.set(domainKey, count);
    if (count >= DOMAIN_BLOCK_CONSECUTIVE_403_THRESHOLD) {
      this.blockedDomains.set(domainKey, Date.now() + DOMAIN_BLOCK_COOLDOWN_MS);
    }
  }

  private clearDomainFailureState(domainKey: string): void {
    this.domain403Counts.delete(domainKey);
    this.blockedDomains.delete(domainKey);
  }
}
