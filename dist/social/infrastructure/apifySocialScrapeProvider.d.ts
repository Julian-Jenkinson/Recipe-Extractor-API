import type { SocialScrapeProvider, SocialScrapeRequest } from "../domain/contracts.js";
import type { SocialEvidence } from "../domain/types.js";
type FetchLike = typeof fetch;
export declare class ApifySocialScrapeProvider implements SocialScrapeProvider {
    private readonly apiToken;
    private readonly fetchImpl;
    constructor(apiToken: string, fetchImpl?: FetchLike);
    scrape(input: SocialScrapeRequest): Promise<SocialEvidence>;
}
export {};
