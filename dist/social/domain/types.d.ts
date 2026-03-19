import type { Recipe } from "../../domain/types.js";
export type SocialPlatform = "instagram" | "tiktok" | "youtube";
export interface SocialEvidence {
    platform: SocialPlatform;
    url: string;
    canonicalUrl: string;
    caption: string;
    comments: string[];
    authorHandle: string;
    titleHint: string;
    mediaType: string;
    metadata: Record<string, unknown>;
}
export interface SocialRecipeDraft extends Recipe {
    confidence: number;
    missingFields?: string[];
}
export interface SocialExtractionDiagnostics {
    normalizedUrl: string;
    canonicalUrl?: string;
    platform?: SocialPlatform;
    cacheHit?: boolean;
    source?: "cache" | "live";
    failurePhase?: "validate" | "scrape" | "parse" | "cache";
    provider?: string;
    scraper?: "auto" | "ytdlp";
    scrapeMs?: number;
    parseMs?: number;
    totalMs?: number;
}
