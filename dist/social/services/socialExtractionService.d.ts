import type { Recipe } from "../../domain/types.js";
import { TtlCache } from "../../application/ttlCache.js";
import type { SocialExtractionRequest, SocialRecipeAiProvider, SocialScrapeProvider } from "../domain/contracts.js";
import type { SocialExtractionDiagnostics } from "../domain/types.js";
import { SocialUrlService } from "./socialUrlService.js";
export declare class SocialExtractionService {
    private readonly socialUrlService;
    private readonly scrapeProvider;
    private readonly aiProvider;
    private readonly cache;
    private readonly minConfidence;
    constructor(socialUrlService: SocialUrlService, scrapeProvider: SocialScrapeProvider, aiProvider: SocialRecipeAiProvider, cache: TtlCache<Recipe>, minConfidence: number);
    extractRecipe(request: SocialExtractionRequest): Promise<Recipe>;
    extractRecipeWithDiagnostics(request: SocialExtractionRequest): Promise<{
        recipe: Recipe;
        diagnostics: SocialExtractionDiagnostics;
    }>;
    clearRuntimeState(): void;
}
