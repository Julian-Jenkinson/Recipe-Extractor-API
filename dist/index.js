import { CACHE_MAX_ENTRIES, CACHE_TTL_MS, MAX_URL_LENGTH, NEGATIVE_CACHE_MAX_ENTRIES, NEGATIVE_CACHE_TTL_MS, } from "./application/config.js";
import { TtlCache } from "./application/ttlCache.js";
import { RecipeExtractionError } from "./domain/errors.js";
import { createDefaultAxiosHttpClient, createFallbackAxiosHttpClient } from "./infrastructure/axiosHttpClient.js";
import { SOCIAL_CACHE_MAX_ENTRIES, SOCIAL_CACHE_TTL_MS, SOCIAL_OPENAI_API_KEY, SOCIAL_OPENAI_MODEL, SOCIAL_RESULT_MIN_CONFIDENCE, SOCIAL_YT_DLP_PATH, } from "./social/application/config.js";
import { OpenAiSocialRecipeAiProvider } from "./social/infrastructure/openAiSocialRecipeAiProvider.js";
import { UnconfiguredSocialRecipeAiProvider, } from "./social/infrastructure/unconfiguredSocialProviders.js";
import { YtDlpSocialScrapeProvider } from "./social/infrastructure/ytDlpSocialScrapeProvider.js";
import { SocialExtractionService } from "./social/services/socialExtractionService.js";
import { SocialUrlService } from "./social/services/socialUrlService.js";
import { HtmlFetchService } from "./services/htmlFetchService.js";
import { parseIngredientDetail, parseIngredientDetails } from "./services/ingredientDetailParser.js";
import { RecipeParserService, buildRecipeFromSchemaData, extractJsonLdBlocks, extractNotesFromHtml, findRecipeObject, normalizeCategory, normalizeDescription, normalizeDifficulty, normalizeImage, normalizeIngredients, normalizeInstructions, normalizeNotes, normalizeServingSize, normalizeTimeString, } from "./services/recipeParserService.js";
import { UrlGuardService, defaultDnsLookupFn, isPrivateOrReservedAddress, isPrivateOrReservedIPv4, isPrivateOrReservedIPv6, } from "./services/urlGuardService.js";
import { RecipeExtractorService } from "./services/recipeExtractorService.js";
const defaultHttpGetter = createDefaultAxiosHttpClient();
const fallbackHttpGetter = createFallbackAxiosHttpClient();
const recipeCache = new TtlCache(CACHE_TTL_MS, CACHE_MAX_ENTRIES);
const negativeCache = new TtlCache(NEGATIVE_CACHE_TTL_MS, NEGATIVE_CACHE_MAX_ENTRIES);
const socialRecipeCache = new TtlCache(SOCIAL_CACHE_TTL_MS, SOCIAL_CACHE_MAX_ENTRIES);
let dnsLookupFn = defaultDnsLookupFn;
let httpGetter = defaultHttpGetter;
let fallbackGetter = fallbackHttpGetter;
function buildSocialScrapeProvider() {
    return new YtDlpSocialScrapeProvider(SOCIAL_YT_DLP_PATH);
}
function buildSocialAiProvider() {
    if (!SOCIAL_OPENAI_API_KEY) {
        return new UnconfiguredSocialRecipeAiProvider();
    }
    return new OpenAiSocialRecipeAiProvider(SOCIAL_OPENAI_API_KEY, SOCIAL_OPENAI_MODEL);
}
let socialScrapeProvider = buildSocialScrapeProvider();
let socialAiProvider = buildSocialAiProvider();
function buildServices() {
    const urlGuard = new UrlGuardService(MAX_URL_LENGTH, dnsLookupFn);
    const htmlFetcher = new HtmlFetchService(httpGetter, urlGuard, fallbackGetter);
    const parser = new RecipeParserService();
    const extractor = new RecipeExtractorService(urlGuard, htmlFetcher, parser, recipeCache, negativeCache);
    const socialUrlService = new SocialUrlService(urlGuard);
    const socialExtractor = new SocialExtractionService(socialUrlService, socialScrapeProvider, socialAiProvider, socialRecipeCache, SOCIAL_RESULT_MIN_CONFIDENCE);
    return { urlGuard, htmlFetcher, parser, extractor, socialUrlService, socialExtractor };
}
let services = buildServices();
export async function extractRecipe(url) {
    return services.extractor.extractRecipe(url);
}
export async function extractRecipeWithDiagnostics(url) {
    return services.extractor.extractRecipeWithDiagnostics(url);
}
export async function extractSocialRecipe(url, options = {}) {
    return services.socialExtractor.extractRecipe({ url, ...options });
}
export async function extractSocialRecipeWithDiagnostics(url, options = {}) {
    return services.socialExtractor.extractRecipeWithDiagnostics({ url, ...options });
}
export { RecipeExtractionError };
export const __testUtils = {
    validateAndNormalizeUrl: (inputUrl) => services.urlGuard.validateAndNormalizeUrl(inputUrl),
    isPrivateOrReservedIPv4,
    isPrivateOrReservedIPv6,
    isPrivateOrReservedAddress,
    normalizeImage,
    parseIngredientDetail,
    parseIngredientDetails,
    normalizeCategory,
    normalizeDescription,
    normalizeNotes,
    normalizeInstructions,
    normalizeIngredients,
    normalizeTimeString,
    normalizeServingSize,
    normalizeDifficulty,
    findRecipeObject,
    extractNotesFromHtml,
    extractJsonLdBlocks,
    buildRecipeFromSchemaData,
    assertPublicDestination: (url) => services.urlGuard.assertPublicDestination(url),
    fetchHtmlWithRetry: (url) => services.htmlFetcher.fetchHtmlWithRetry(url),
    fetchHtmlSafely: (url) => services.htmlFetcher.fetchHtmlSafely(url),
    getCachedRecipe: (url) => recipeCache.get(url),
    setCachedRecipe: (url, recipe) => recipeCache.set(url, recipe),
    pruneCache: () => recipeCache.prune(),
    validateAndNormalizeSocialUrl: (inputUrl) => services.socialUrlService.validateAndNormalize(inputUrl),
    clearCache: () => {
        recipeCache.clear();
        negativeCache.clear();
        socialRecipeCache.clear();
        services.extractor.clearRuntimeState();
        services.socialExtractor.clearRuntimeState();
    },
    setDnsLookupForTests: (fn) => {
        dnsLookupFn = fn;
        services = buildServices();
    },
    setHttpGetForTests: (fn) => {
        httpGetter = {
            async get(url) {
                const response = await fn(url);
                return {
                    status: response.status,
                    headers: response.headers,
                    data: response.data,
                };
            },
        };
        services = buildServices();
    },
    setFallbackHttpGetForTests: (fn) => {
        fallbackGetter = {
            async get(url) {
                const response = await fn(url);
                return {
                    status: response.status,
                    headers: response.headers,
                    data: response.data,
                };
            },
        };
        services = buildServices();
    },
    setSocialScrapeProviderForTests: (provider) => {
        socialScrapeProvider = provider;
        services = buildServices();
    },
    setSocialRecipeAiProviderForTests: (provider) => {
        socialAiProvider = provider;
        services = buildServices();
    },
    resetNetworkFnsForTests: () => {
        dnsLookupFn = defaultDnsLookupFn;
        httpGetter = defaultHttpGetter;
        fallbackGetter = fallbackHttpGetter;
        services = buildServices();
    },
    resetSocialProvidersForTests: () => {
        socialScrapeProvider = buildSocialScrapeProvider();
        socialAiProvider = buildSocialAiProvider();
        services = buildServices();
    },
};
//# sourceMappingURL=index.js.map