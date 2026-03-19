import type { Recipe } from "../../domain/types.js";
import type { SocialEvidence, SocialPlatform, SocialRecipeDraft } from "./types.js";
export interface SocialScrapeRequest {
    url: URL;
    platform: SocialPlatform;
    scraper?: "auto" | "ytdlp";
}
export interface SocialScrapeProvider {
    scrape(input: SocialScrapeRequest): Promise<SocialEvidence>;
}
export interface SocialRecipeAiProvider {
    parse(evidence: SocialEvidence): Promise<SocialRecipeDraft>;
}
export interface SocialExtractionRequest {
    url: string;
    scraper?: "auto" | "ytdlp";
}
export interface SocialExtractionResult {
    recipe: Recipe;
    diagnostics: Record<string, unknown>;
}
