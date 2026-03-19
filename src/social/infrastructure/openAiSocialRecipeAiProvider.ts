import { RecipeExtractionError } from "../../domain/errors.js";
import type { IngredientDetail } from "../../domain/types.js";
import { SOCIAL_OPENAI_TIMEOUT_MS } from "../application/config.js";
import type { SocialRecipeAiProvider } from "../domain/contracts.js";
import type { SocialEvidence, SocialRecipeDraft } from "../domain/types.js";

type FetchLike = typeof fetch;

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type DraftPayload = Omit<SocialRecipeDraft, "ingredientDetails"> & {
  ingredientDetails?: IngredientDetail[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => asString(entry)).filter(Boolean);
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asIngredientDetails(value: unknown): IngredientDetail[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => isRecord(entry) && typeof entry.raw === "string")
    .map((entry) => ({
      raw: asString(entry.raw),
      quantity: typeof entry.quantity === "number" ? entry.quantity : undefined,
      quantityMax: typeof entry.quantityMax === "number" ? entry.quantityMax : undefined,
      unit: asString(entry.unit) || undefined,
      unitOriginal: asString(entry.unitOriginal) || undefined,
      ingredient: asString(entry.ingredient) || undefined,
      preparation: asString(entry.preparation) || undefined,
      notes: asString(entry.notes) || undefined,
      optional: typeof entry.optional === "boolean" ? entry.optional : undefined,
      alternatives: Array.isArray(entry.alternatives) ? asStringArray(entry.alternatives) : undefined,
      confidence: typeof entry.confidence === "number" ? entry.confidence : undefined,
    }));
}

function extractOutputText(payload: OpenAiResponse): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    return "";
  }

  for (const item of payload.output) {
    if (!Array.isArray(item.content)) continue;
    for (const contentItem of item.content) {
      if (contentItem.type === "output_text" && typeof contentItem.text === "string" && contentItem.text.trim()) {
        return contentItem.text;
      }
      if (typeof contentItem.text === "string" && contentItem.text.trim()) {
        return contentItem.text;
      }
    }
  }

  return "";
}

function buildPrompt(evidence: SocialEvidence): string {
  return [
    "Extract a quick recipe draft from this social media caption.",
    "Return JSON only.",
    "Keep it minimal and do not guess.",
    "If a field is not clearly present, leave it empty.",
    "",
    `url: ${evidence.canonicalUrl}`,
    `authorHandle: ${evidence.authorHandle}`,
    `caption: ${evidence.caption}`,
    "",
    "Required JSON shape:",
    JSON.stringify({
      title: "",
      ingredients: [""],
      instructions: [""],
      description: "",
    }),
  ].join("\n");
}

export class OpenAiSocialRecipeAiProvider implements SocialRecipeAiProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = SOCIAL_OPENAI_TIMEOUT_MS
  ) {}

  async parse(evidence: SocialEvidence): Promise<SocialRecipeDraft> {
    try {
      const response = await this.fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: buildPrompt(evidence),
          text: {
            format: {
              type: "json_object",
            },
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");
        throw new RecipeExtractionError(502, "OpenAI parse request failed", {
          provider: "openai",
          upstreamStatus: response.status,
          upstreamBody: responseText.slice(0, 1000),
        });
      }

      const payload = (await response.json()) as OpenAiResponse;
      const outputText = extractOutputText(payload);
      if (!outputText) {
        throw new RecipeExtractionError(502, "OpenAI returned no parse output", {
          provider: "openai",
          responsePreview: JSON.stringify(payload).slice(0, 1000),
        });
      }

      let parsed: DraftPayload;
      try {
        parsed = JSON.parse(outputText) as DraftPayload;
      } catch {
        throw new RecipeExtractionError(502, "OpenAI returned invalid JSON", {
          provider: "openai",
          responsePreview: outputText.slice(0, 1000),
        });
      }

      if (!isRecord(parsed)) {
        throw new RecipeExtractionError(502, "OpenAI returned an invalid recipe payload", {
          provider: "openai",
        });
      }

      return {
        title: asString(parsed.title),
        description: asString(parsed.description),
        ingredients: asStringArray(parsed.ingredients),
        ingredientDetails: asIngredientDetails(parsed.ingredientDetails),
        instructions: asStringArray(parsed.instructions),
        image: "",
        source: asString(parsed.source) || evidence.canonicalUrl,
        category: "",
        notes: [],
        favourite: false,
        difficulty: "",
        cookTime: "",
        prepTime: "",
        servingSize: "",
        confidence: asNumber(parsed.confidence),
        missingFields: asStringArray(parsed.missingFields),
      };
    } catch (error) {
      if (error instanceof RecipeExtractionError) {
        throw error;
      }
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new RecipeExtractionError(504, "OpenAI parse request timed out", {
          provider: "openai",
          upstreamTimeoutMs: this.timeoutMs,
        });
      }
      throw error;
    }
  }
}
