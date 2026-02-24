import type { Recipe } from "./types.js";

export interface HtmlResponse {
  status: number;
  headers: Record<string, unknown>;
  data: string;
}

export interface HttpGetter {
  get(url: string): Promise<HtmlResponse>;
}

export interface UrlGuard {
  validateAndNormalizeUrl(inputUrl: string): URL;
  assertPublicDestination(url: URL): Promise<void>;
}

export interface RecipeParser {
  parse(html: string, source: string): Recipe;
}
