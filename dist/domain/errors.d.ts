export declare class RecipeExtractionError extends Error {
    statusCode: number;
    publicMessage: string;
    debugDetails?: Record<string, unknown>;
    constructor(statusCode: number, publicMessage: string, debugDetails?: Record<string, unknown>);
}
