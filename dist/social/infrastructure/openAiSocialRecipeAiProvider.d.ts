import type { SocialRecipeAiProvider } from "../domain/contracts.js";
import type { SocialEvidence, SocialRecipeDraft } from "../domain/types.js";
type FetchLike = typeof fetch;
export declare class OpenAiSocialRecipeAiProvider implements SocialRecipeAiProvider {
    private readonly apiKey;
    private readonly model;
    private readonly fetchImpl;
    private readonly timeoutMs;
    constructor(apiKey: string, model: string, fetchImpl?: FetchLike, timeoutMs?: number);
    parse(evidence: SocialEvidence): Promise<SocialRecipeDraft>;
}
export {};
