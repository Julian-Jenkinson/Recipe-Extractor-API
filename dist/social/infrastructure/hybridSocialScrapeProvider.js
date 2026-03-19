import { RecipeExtractionError } from "../../domain/errors.js";
export class HybridSocialScrapeProvider {
    constructor(tiktokProvider, fallbackProvider) {
        this.tiktokProvider = tiktokProvider;
        this.fallbackProvider = fallbackProvider;
    }
    async scrape(input) {
        if (input.platform === "tiktok") {
            if (input.scraper === "apify") {
                return this.fallbackProvider.scrape(input);
            }
            if (input.scraper === "ytdlp") {
                return this.tiktokProvider.scrape(input);
            }
            try {
                return await this.tiktokProvider.scrape(input);
            }
            catch (error) {
                if (error instanceof RecipeExtractionError && error.debugDetails?.provider === "yt-dlp") {
                    return this.fallbackProvider.scrape(input);
                }
                throw error;
            }
        }
        return this.fallbackProvider.scrape(input);
    }
}
//# sourceMappingURL=hybridSocialScrapeProvider.js.map