import { parseIngredientDetail } from "./ingredientDetailParser.js";
function isObject(value) {
    return typeof value === "object" && value !== null;
}
function isIngredientDetail(value) {
    if (!isObject(value))
        return false;
    return typeof value.raw === "string" || typeof value.ingredient === "string";
}
function ensureRawField(value) {
    if (typeof value.raw === "string")
        return value;
    if (typeof value.ingredient === "string" && value.ingredient.trim().length > 0) {
        return { ...value, raw: value.ingredient };
    }
    return { ...value, raw: "" };
}
export function migrateLegacyIngredientItem(item) {
    if (typeof item === "string") {
        return parseIngredientDetail(item);
    }
    if (isIngredientDetail(item)) {
        return ensureRawField(item);
    }
    return parseIngredientDetail(String(item ?? ""));
}
export function migrateLegacyIngredientsToDetails(items) {
    return items.map(migrateLegacyIngredientItem);
}
//# sourceMappingURL=ingredientMigration.js.map