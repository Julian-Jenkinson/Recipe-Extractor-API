import type { Recipe } from "../../domain/types.js";
import type { SocialEvidence, SocialRecipeDraft } from "../domain/types.js";
import { parseIngredientDetails } from "../../services/ingredientDetailParser.js";

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
}

export function normalizeSocialRecipeDraft(draft: SocialRecipeDraft, evidence: SocialEvidence): Recipe {
  const ingredients = normalizeStringArray(draft.ingredients);
  const instructions = normalizeStringArray(draft.instructions);
  const notes = normalizeStringArray(draft.notes);
  const image =
    normalizeString(draft.image) || normalizeString(evidence.metadata.thumbnailUrl) || normalizeString(evidence.metadata.coverUrl);

  return {
    title: normalizeString(draft.title) || normalizeString(evidence.titleHint) || "Untitled recipe",
    description: normalizeString(draft.description) || normalizeString(evidence.caption),
    ingredients,
    ingredientDetails: parseIngredientDetails(ingredients),
    instructions,
    image,
    source: evidence.canonicalUrl,
    category: normalizeString(draft.category),
    notes,
    favourite: Boolean(draft.favourite),
    difficulty: normalizeString(draft.difficulty),
    cookTime: normalizeString(draft.cookTime),
    prepTime: normalizeString(draft.prepTime),
    servingSize: normalizeString(draft.servingSize),
  };
}

export function isWeakSocialRecipeDraft(draft: SocialRecipeDraft, minConfidence: number): boolean {
  void draft;
  void minConfidence;
  return false;
}
