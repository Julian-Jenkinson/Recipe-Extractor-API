import type { SocialScrapeProvider, SocialScrapeRequest } from "../domain/contracts.js";
import type { SocialEvidence } from "../domain/types.js";
export declare class YtDlpSocialScrapeProvider implements SocialScrapeProvider {
    private readonly command;
    private readonly timeoutMs;
    constructor(command?: string, timeoutMs?: number);
    scrape(input: SocialScrapeRequest): Promise<SocialEvidence>;
}
