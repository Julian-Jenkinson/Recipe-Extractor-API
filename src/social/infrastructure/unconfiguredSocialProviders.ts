import { RecipeExtractionError } from "../../domain/errors.js";
import type { SocialRecipeAiProvider, SocialScrapeProvider } from "../domain/contracts.js";

const CONFIG_MESSAGE =
  "Social extraction is not configured. Set social provider credentials before using /extract/social.";

export class UnconfiguredSocialScrapeProvider implements SocialScrapeProvider {
  async scrape(): Promise<never> {
    throw new RecipeExtractionError(503, CONFIG_MESSAGE, {
      provider: "social-scrape",
    });
  }
}

export class UnconfiguredSocialRecipeAiProvider implements SocialRecipeAiProvider {
  async parse(): Promise<never> {
    throw new RecipeExtractionError(503, CONFIG_MESSAGE, {
      provider: "social-ai",
    });
  }
}
