import type { AxiosResponse } from "axios";
import type { HtmlResponse } from "./domain/contracts.js";
import { RecipeExtractionError } from "./domain/errors.js";
import type { IngredientDetail, Recipe } from "./domain/types.js";
import type { SocialRecipeAiProvider, SocialScrapeProvider } from "./social/domain/contracts.js";
import type { SocialExtractionDiagnostics } from "./social/domain/types.js";
import { parseIngredientDetail, parseIngredientDetails } from "./services/ingredientDetailParser.js";
import { buildRecipeFromSchemaData, extractJsonLdBlocks, extractNotesFromHtml, findRecipeObject, normalizeCategory, normalizeDescription, normalizeDifficulty, normalizeImage, normalizeIngredients, normalizeInstructions, normalizeNotes, normalizeServingSize, normalizeTimeString } from "./services/recipeParserService.js";
import { isPrivateOrReservedAddress, isPrivateOrReservedIPv4, isPrivateOrReservedIPv6, type LookupFn } from "./services/urlGuardService.js";
export declare function extractRecipe(url: string): Promise<Recipe>;
export declare function extractRecipeWithDiagnostics(url: string): Promise<{
    recipe: Recipe;
    diagnostics: Record<string, unknown>;
}>;
export declare function extractSocialRecipe(url: string, options?: {
    scraper?: "auto" | "ytdlp";
}): Promise<Recipe>;
export declare function extractSocialRecipeWithDiagnostics(url: string, options?: {
    scraper?: "auto" | "ytdlp";
}): Promise<{
    recipe: Recipe;
    diagnostics: SocialExtractionDiagnostics;
}>;
export { RecipeExtractionError };
export type { IngredientDetail, Recipe };
export declare const __testUtils: {
    validateAndNormalizeUrl: (inputUrl: string) => URL;
    isPrivateOrReservedIPv4: typeof isPrivateOrReservedIPv4;
    isPrivateOrReservedIPv6: typeof isPrivateOrReservedIPv6;
    isPrivateOrReservedAddress: typeof isPrivateOrReservedAddress;
    normalizeImage: typeof normalizeImage;
    parseIngredientDetail: typeof parseIngredientDetail;
    parseIngredientDetails: typeof parseIngredientDetails;
    normalizeCategory: typeof normalizeCategory;
    normalizeDescription: typeof normalizeDescription;
    normalizeNotes: typeof normalizeNotes;
    normalizeInstructions: typeof normalizeInstructions;
    normalizeIngredients: typeof normalizeIngredients;
    normalizeTimeString: typeof normalizeTimeString;
    normalizeServingSize: typeof normalizeServingSize;
    normalizeDifficulty: typeof normalizeDifficulty;
    findRecipeObject: typeof findRecipeObject;
    extractNotesFromHtml: typeof extractNotesFromHtml;
    extractJsonLdBlocks: typeof extractJsonLdBlocks;
    buildRecipeFromSchemaData: typeof buildRecipeFromSchemaData;
    assertPublicDestination: (url: URL) => Promise<void>;
    fetchHtmlWithRetry: (url: URL) => Promise<HtmlResponse>;
    fetchHtmlSafely: (url: URL) => Promise<{
        html: string;
        finalUrl: URL;
        fetchProfile: "primary" | "fallback";
    }>;
    getCachedRecipe: (url: string) => Recipe | null;
    setCachedRecipe: (url: string, recipe: Recipe) => void;
    pruneCache: () => void;
    validateAndNormalizeSocialUrl: (inputUrl: string) => {
        url: URL;
        platform: import("./social/domain/types.js").SocialPlatform;
        cacheKey: string;
    };
    clearCache: () => void;
    setDnsLookupForTests: (fn: LookupFn) => void;
    setHttpGetForTests: (fn: (url: string) => Promise<AxiosResponse<string>>) => void;
    setFallbackHttpGetForTests: (fn: (url: string) => Promise<AxiosResponse<string>>) => void;
    setSocialScrapeProviderForTests: (provider: SocialScrapeProvider) => void;
    setSocialRecipeAiProviderForTests: (provider: SocialRecipeAiProvider) => void;
    resetNetworkFnsForTests: () => void;
    resetSocialProvidersForTests: () => void;
};
