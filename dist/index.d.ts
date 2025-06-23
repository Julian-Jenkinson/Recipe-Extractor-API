export interface Recipe {
    title: string;
    ingredients: string[];
    instructions: string[];
    image: string;
    source: string;
    category: string;
    notes: string[];
    favourite: boolean;
    difficulty: string;
    cookTime: string;
    prepTime: string;
    servingSize: string;
    [key: string]: any;
}
export declare function extractRecipe(url: string): Promise<Recipe>;
