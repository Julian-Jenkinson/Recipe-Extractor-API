import { RecipeExtractionError } from "../../domain/errors.js";
import type { Recipe } from "../../domain/types.js";
import { TtlCache } from "../../application/ttlCache.js";
import type { SocialExtractionRequest, SocialRecipeAiProvider, SocialScrapeProvider } from "../domain/contracts.js";
import type { SocialExtractionDiagnostics } from "../domain/types.js";
import { isWeakSocialRecipeDraft, normalizeSocialRecipeDraft } from "./socialRecipeNormalizer.js";
import { SocialUrlService } from "./socialUrlService.js";

function hasUsableSocialText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length >= 8;
}

export class SocialExtractionService {
  constructor(
    private readonly socialUrlService: SocialUrlService,
    private readonly scrapeProvider: SocialScrapeProvider,
    private readonly aiProvider: SocialRecipeAiProvider,
    private readonly cache: TtlCache<Recipe>,
    private readonly minConfidence: number
  ) {}

  async extractRecipe(request: SocialExtractionRequest): Promise<Recipe> {
    const result = await this.extractRecipeWithDiagnostics(request);
    return result.recipe;
  }

  async extractRecipeWithDiagnostics(
    request: SocialExtractionRequest
  ): Promise<{ recipe: Recipe; diagnostics: SocialExtractionDiagnostics }> {
    const startedAt = Date.now();
    const diagnostics: SocialExtractionDiagnostics = { normalizedUrl: "" };

    let normalized;
    try {
      normalized = this.socialUrlService.validateAndNormalize(request.url);
      diagnostics.normalizedUrl = normalized.url.toString();
      diagnostics.platform = normalized.platform;
      diagnostics.scraper = request.scraper ?? "auto";
    } catch (error) {
      if (error instanceof RecipeExtractionError) throw error;
      throw new RecipeExtractionError(400, "Invalid social URL", { failurePhase: "validate" });
    }

    const cacheKey = `${normalized.cacheKey}:scraper=${request.scraper ?? "auto"}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        recipe: cached,
        diagnostics: {
          ...diagnostics,
          canonicalUrl: normalized.url.toString(),
          cacheHit: true,
          source: "cache",
          totalMs: Date.now() - startedAt,
        },
      };
    }

    try {
      const scrapeStartedAt = Date.now();
      const evidence = await this.scrapeProvider.scrape({
        url: normalized.url,
        platform: normalized.platform,
        scraper: request.scraper ?? "auto",
      });
      diagnostics.scrapeMs = Date.now() - scrapeStartedAt;
      diagnostics.canonicalUrl = evidence.canonicalUrl;
      diagnostics.source = "live";

      if (!hasUsableSocialText(evidence.caption) && !hasUsableSocialText(evidence.titleHint)) {
        throw new RecipeExtractionError(422, "No usable caption or title was found for this social post", {
          provider: "yt-dlp",
          failurePhase: "scrape",
        });
      }

      const parseStartedAt = Date.now();
      const draft = await this.aiProvider.parse(evidence);
      diagnostics.parseMs = Date.now() - parseStartedAt;
      const isWeakDraft = isWeakSocialRecipeDraft(draft, this.minConfidence);
      const recipe = normalizeSocialRecipeDraft(draft, evidence);
      this.cache.set(cacheKey, recipe);
      diagnostics.totalMs = Date.now() - startedAt;

      if (isWeakDraft) {
        diagnostics.failurePhase = "parse";
      }

      return { recipe, diagnostics };
    } catch (error) {
      if (error instanceof RecipeExtractionError) {
        throw new RecipeExtractionError(error.statusCode, error.publicMessage, {
          ...diagnostics,
          ...(error.debugDetails ?? {}),
          failurePhase: diagnostics.canonicalUrl ? "parse" : "scrape",
          totalMs: Date.now() - startedAt,
        });
      }

      throw new RecipeExtractionError(502, "Social extraction failed", {
        ...diagnostics,
        failurePhase: diagnostics.canonicalUrl ? "parse" : "scrape",
        totalMs: Date.now() - startedAt,
      });
    }
  }

  clearRuntimeState(): void {
    this.cache.clear();
  }
}
