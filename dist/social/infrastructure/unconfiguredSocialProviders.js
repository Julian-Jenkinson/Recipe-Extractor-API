import { RecipeExtractionError } from "../../domain/errors.js";
const CONFIG_MESSAGE = "Social extraction is not configured. Set social provider credentials before using /extract/social.";
export class UnconfiguredSocialScrapeProvider {
    async scrape() {
        throw new RecipeExtractionError(503, CONFIG_MESSAGE, {
            provider: "social-scrape",
        });
    }
}
export class UnconfiguredSocialRecipeAiProvider {
    async parse() {
        throw new RecipeExtractionError(503, CONFIG_MESSAGE, {
            provider: "social-ai",
        });
    }
}
//# sourceMappingURL=unconfiguredSocialProviders.js.map