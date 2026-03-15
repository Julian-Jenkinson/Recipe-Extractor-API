import type { IngredientDetail } from "../domain/types.js";
import { parseIngredientDetail } from "./ingredientDetailParser.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIngredientDetail(value: unknown): value is IngredientDetail {
  if (!isObject(value)) return false;
  return typeof value.raw === "string" || typeof value.ingredient === "string";
}

function ensureRawField(value: IngredientDetail): IngredientDetail {
  if (typeof value.raw === "string") return value;
  if (typeof value.ingredient === "string" && value.ingredient.trim().length > 0) {
    return { ...value, raw: value.ingredient };
  }
  return { ...value, raw: "" };
}

export function migrateLegacyIngredientItem(item: unknown): IngredientDetail {
  if (typeof item === "string") {
    return parseIngredientDetail(item);
  }

  if (isIngredientDetail(item)) {
    return ensureRawField(item);
  }

  return parseIngredientDetail(String(item ?? ""));
}

export function migrateLegacyIngredientsToDetails(items: readonly unknown[]): IngredientDetail[] {
  return items.map(migrateLegacyIngredientItem);
}
