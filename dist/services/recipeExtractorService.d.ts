import type { Recipe } from "../domain/types.js";
import { TtlCache } from "../application/ttlCache.js";
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
export declare class RecipeExtractorService {
    private readonly urlGuard;
    private readonly htmlFetcher;
    private readonly parser;
    private readonly cache;
    private readonly negativeCache;
    private readonly blockedDomains;
    private readonly domain403Counts;
    constructor(urlGuard: UrlGuardService, htmlFetcher: HtmlFetchService, parser: RecipeParserService, cache: TtlCache<Recipe>, negativeCache: TtlCache<NegativeCacheEntry>);
    extractRecipe(inputUrl: string): Promise<Recipe>;
    extractRecipeWithDiagnostics(inputUrl: string): Promise<{
        recipe: Recipe;
        diagnostics: ExtractionDiagnostics;
    }>;
    clearRuntimeState(): void;
    private memoizeFailure;
    private clearDomainFailureState;
}
export {};
