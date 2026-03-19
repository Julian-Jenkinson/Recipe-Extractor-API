import type { SocialScrapeProvider, SocialScrapeRequest } from "../domain/contracts.js";
import type { SocialEvidence } from "../domain/types.js";
export declare class HybridSocialScrapeProvider implements SocialScrapeProvider {
    private readonly tiktokProvider;
    private readonly fallbackProvider;
    constructor(tiktokProvider: SocialScrapeProvider, fallbackProvider: SocialScrapeProvider);
    scrape(input: SocialScrapeRequest): Promise<SocialEvidence>;
}
