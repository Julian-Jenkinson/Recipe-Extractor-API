import type { Recipe } from "../../domain/types.js";
import type { SocialEvidence, SocialRecipeDraft } from "../domain/types.js";
export declare function normalizeSocialRecipeDraft(draft: SocialRecipeDraft, evidence: SocialEvidence): Recipe;
export declare function isWeakSocialRecipeDraft(draft: SocialRecipeDraft, minConfidence: number): boolean;
