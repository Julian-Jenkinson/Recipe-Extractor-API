import type { SocialScrapeProvider, SocialScrapeRequest } from "../domain/contracts.js";
import type { SocialEvidence } from "../domain/types.js";
export declare class YtDlpTikTokScrapeProvider implements SocialScrapeProvider {
    private readonly command;
    constructor(command?: string);
    scrape(input: SocialScrapeRequest): Promise<SocialEvidence>;
}
