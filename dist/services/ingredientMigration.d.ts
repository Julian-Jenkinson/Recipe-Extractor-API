import type { IngredientDetail } from "../domain/types.js";
export declare function migrateLegacyIngredientItem(item: unknown): IngredientDetail;
export declare function migrateLegacyIngredientsToDetails(items: readonly unknown[]): IngredientDetail[];
