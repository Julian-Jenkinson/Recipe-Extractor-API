import axios from "axios";
import { RecipeExtractionError } from "../domain/errors.js";
import { DOMAIN_BLOCK_CONSECUTIVE_403_THRESHOLD, DOMAIN_BLOCK_COOLDOWN_MS, } from "../application/config.js";
export class RecipeExtractorService {
    constructor(urlGuard, htmlFetcher, parser, cache, negativeCache) {
        this.urlGuard = urlGuard;
        this.htmlFetcher = htmlFetcher;
        this.parser = parser;
        this.cache = cache;
        this.negativeCache = negativeCache;
        this.blockedDomains = new Map();
        this.domain403Counts = new Map();
    }
    async extractRecipe(inputUrl) {
        const result = await this.extractRecipeWithDiagnostics(inputUrl);
        return result.recipe;
    }
    async extractRecipeWithDiagnostics(inputUrl) {
        const diagnostics = { normalizedUrl: "" };
        let safeUrl;
        try {
            safeUrl = this.urlGuard.validateAndNormalizeUrl(inputUrl);
            diagnostics.normalizedUrl = safeUrl.toString();
        }
        catch (error) {
            if (error instanceof RecipeExtractionError)
                throw error;
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
        let html;
        let finalUrl;
        let fetchProfile;
        try {
            const fetched = await this.htmlFetcher.fetchHtmlSafely(safeUrl);
            html = fetched.html;
            finalUrl = fetched.finalUrl;
            fetchProfile = fetched.fetchProfile;
            diagnostics.finalUrl = finalUrl.toString();
            diagnostics.fetchProfile = fetchProfile;
        }
        catch (error) {
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
        let recipe;
        try {
            const source = finalUrl.hostname.replace(/^www\./, ""); // keep this
            const fullUrl = finalUrl.href; // add this
            const parsed = this.parser.parseWithDiagnostics(html, source);
            recipe = parsed.recipe;
            recipe.source = source; // ensure consistency
            recipe.finalUrl = fullUrl; // <-- THIS is missing
            diagnostics.sourceDomain = source;
            diagnostics.finalUrl = fullUrl; // <-- new addition
            diagnostics.parserPath = parsed.parserPath;
        }
        catch (error) {
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
    clearRuntimeState() {
        this.blockedDomains.clear();
        this.domain403Counts.clear();
        this.negativeCache.clear();
    }
    memoizeFailure(cacheKey, domainKey, error) {
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
    clearDomainFailureState(domainKey) {
        this.domain403Counts.delete(domainKey);
        this.blockedDomains.delete(domainKey);
    }
}
//# sourceMappingURL=recipeExtractorService.js.map