import type { SocialRecipeAiProvider, SocialScrapeProvider } from "../domain/contracts.js";
export declare class UnconfiguredSocialScrapeProvider implements SocialScrapeProvider {
    scrape(): Promise<never>;
}
export declare class UnconfiguredSocialRecipeAiProvider implements SocialRecipeAiProvider {
    parse(): Promise<never>;
}
