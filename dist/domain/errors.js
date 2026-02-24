export class RecipeExtractionError extends Error {
    constructor(statusCode, publicMessage, debugDetails) {
        super(publicMessage);
        this.name = "RecipeExtractionError";
        this.statusCode = statusCode;
        this.publicMessage = publicMessage;
        this.debugDetails = debugDetails;
    }
}
//# sourceMappingURL=errors.js.map