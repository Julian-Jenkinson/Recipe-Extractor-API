import type { Recipe } from "../domain/types.js";
export declare function decodeHtmlEntities(value: string): string;
export declare function normalizeDescription(description: any): string;
export declare function normalizeImage(image: any): string | undefined;
export declare function normalizeCategory(category: any): string;
export declare function normalizeNotes(notes: any): string[];
export declare function normalizeInstructions(instructions: any): string[];
export declare function normalizeIngredients(ingredients: any): string[];
export declare function normalizeTimeString(time: any): string;
export declare function normalizeServingSize(servings: any): string;
export declare function normalizeDifficulty(difficulty: any): string;
export declare function findRecipeObject(obj: any): any | null;
export declare function extractNotesFromHtml($: cheerio.CheerioAPI): string[];
export declare function extractJsonLdBlocks(html: string): string[];
export declare function buildRecipeFromSchemaData(recipeData: any, source: string): Recipe;
export declare class RecipeParserService {
    parse(html: string, source: string): Recipe;
    parseWithDiagnostics(html: string, source: string): {
        recipe: Recipe;
        parserPath: "json-ld" | "microdata";
    };
}
