export interface Recipe {
    title?: string;
    ingredients?: string[];
    instructions?: string[] | string;
    image?: string;
    [key: string]: any;
}
export declare function extractRecipe(url: string): Promise<Recipe>;
