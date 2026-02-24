export class RecipeExtractionError extends Error {
  statusCode: number;
  publicMessage: string;
  debugDetails?: Record<string, unknown>;

  constructor(statusCode: number, publicMessage: string, debugDetails?: Record<string, unknown>) {
    super(publicMessage);
    this.name = "RecipeExtractionError";
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
    this.debugDetails = debugDetails;
  }
}
