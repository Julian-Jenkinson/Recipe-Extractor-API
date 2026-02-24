import type { AxiosResponse } from "axios";
import {
  CACHE_MAX_ENTRIES,
  CACHE_TTL_MS,
  MAX_URL_LENGTH,
  NEGATIVE_CACHE_MAX_ENTRIES,
  NEGATIVE_CACHE_TTL_MS,
} from "./application/config.js";
import { TtlCache } from "./application/ttlCache.js";
import type { HtmlResponse, HttpGetter } from "./domain/contracts.js";
import { RecipeExtractionError } from "./domain/errors.js";
import type { IngredientDetail, Recipe } from "./domain/types.js";
import { createDefaultAxiosHttpClient, createFallbackAxiosHttpClient } from "./infrastructure/axiosHttpClient.js";
import { HtmlFetchService } from "./services/htmlFetchService.js";
import { parseIngredientDetail, parseIngredientDetails } from "./services/ingredientDetailParser.js";
import {
  RecipeParserService,
  buildRecipeFromSchemaData,
  extractJsonLdBlocks,
  extractNotesFromHtml,
  findRecipeObject,
  normalizeCategory,
  normalizeDescription,
  normalizeDifficulty,
  normalizeImage,
  normalizeIngredients,
  normalizeInstructions,
  normalizeNotes,
  normalizeServingSize,
  normalizeTimeString,
} from "./services/recipeParserService.js";
import {
  UrlGuardService,
  defaultDnsLookupFn,
  isPrivateOrReservedAddress,
  isPrivateOrReservedIPv4,
  isPrivateOrReservedIPv6,
  type LookupFn,
} from "./services/urlGuardService.js";
import { RecipeExtractorService } from "./services/recipeExtractorService.js";

const defaultHttpGetter = createDefaultAxiosHttpClient();
const fallbackHttpGetter = createFallbackAxiosHttpClient();

const recipeCache = new TtlCache<Recipe>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);
const negativeCache = new TtlCache<{ statusCode: number; publicMessage: string }>(
  NEGATIVE_CACHE_TTL_MS,
  NEGATIVE_CACHE_MAX_ENTRIES
);

let dnsLookupFn: LookupFn = defaultDnsLookupFn;
let httpGetter: HttpGetter = defaultHttpGetter;
let fallbackGetter: HttpGetter = fallbackHttpGetter;

function buildServices() {
  const urlGuard = new UrlGuardService(MAX_URL_LENGTH, dnsLookupFn);
  const htmlFetcher = new HtmlFetchService(httpGetter, urlGuard, fallbackGetter);
  const parser = new RecipeParserService();
  const extractor = new RecipeExtractorService(urlGuard, htmlFetcher, parser, recipeCache, negativeCache);
  return { urlGuard, htmlFetcher, parser, extractor };
}

let services = buildServices();

export async function extractRecipe(url: string): Promise<Recipe> {
  return services.extractor.extractRecipe(url);
}

export async function extractRecipeWithDiagnostics(
  url: string
): Promise<{ recipe: Recipe; diagnostics: Record<string, unknown> }> {
  return services.extractor.extractRecipeWithDiagnostics(url);
}

export { RecipeExtractionError };
export type { IngredientDetail, Recipe };

export const __testUtils = {
  validateAndNormalizeUrl: (inputUrl: string) => services.urlGuard.validateAndNormalizeUrl(inputUrl),
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
  assertPublicDestination: (url: URL) => services.urlGuard.assertPublicDestination(url),
  fetchHtmlWithRetry: (url: URL) => services.htmlFetcher.fetchHtmlWithRetry(url),
  fetchHtmlSafely: (url: URL) => services.htmlFetcher.fetchHtmlSafely(url),
  getCachedRecipe: (url: string) => recipeCache.get(url),
  setCachedRecipe: (url: string, recipe: Recipe) => recipeCache.set(url, recipe),
  pruneCache: () => recipeCache.prune(),
  clearCache: () => {
    recipeCache.clear();
    negativeCache.clear();
    services.extractor.clearRuntimeState();
  },
  setDnsLookupForTests: (fn: LookupFn) => {
    dnsLookupFn = fn;
    services = buildServices();
  },
  setHttpGetForTests: (fn: (url: string) => Promise<AxiosResponse<string>>) => {
    httpGetter = {
      async get(url: string): Promise<HtmlResponse> {
        const response = await fn(url);
        return {
          status: response.status,
          headers: response.headers as Record<string, unknown>,
          data: response.data,
        };
      },
    };
    services = buildServices();
  },
  setFallbackHttpGetForTests: (fn: (url: string) => Promise<AxiosResponse<string>>) => {
    fallbackGetter = {
      async get(url: string): Promise<HtmlResponse> {
        const response = await fn(url);
        return {
          status: response.status,
          headers: response.headers as Record<string, unknown>,
          data: response.data,
        };
      },
    };
    services = buildServices();
  },
  resetNetworkFnsForTests: () => {
    dnsLookupFn = defaultDnsLookupFn;
    httpGetter = defaultHttpGetter;
    fallbackGetter = fallbackHttpGetter;
    services = buildServices();
  },
};
