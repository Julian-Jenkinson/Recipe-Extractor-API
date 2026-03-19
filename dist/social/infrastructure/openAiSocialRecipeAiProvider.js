import { RecipeExtractionError } from "../../domain/errors.js";
import { SOCIAL_OPENAI_TIMEOUT_MS } from "../application/config.js";
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function asString(value) {
    return typeof value === "string" ? value.trim() : "";
}
function asStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((entry) => asString(entry)).filter(Boolean);
}
function asNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function asIngredientDetails(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((entry) => isRecord(entry) && typeof entry.raw === "string")
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
function extractOutputText(payload) {
    if (typeof payload.output_text === "string" && payload.output_text.trim()) {
        return payload.output_text;
    }
    if (!Array.isArray(payload.output)) {
        return "";
    }
    for (const item of payload.output) {
        if (!Array.isArray(item.content))
            continue;
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
function buildPrompt(evidence) {
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
export class OpenAiSocialRecipeAiProvider {
    constructor(apiKey, model, fetchImpl = fetch, timeoutMs = SOCIAL_OPENAI_TIMEOUT_MS) {
        this.apiKey = apiKey;
        this.model = model;
        this.fetchImpl = fetchImpl;
        this.timeoutMs = timeoutMs;
    }
    async parse(evidence) {
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
            const payload = (await response.json());
            const outputText = extractOutputText(payload);
            if (!outputText) {
                throw new RecipeExtractionError(502, "OpenAI returned no parse output", {
                    provider: "openai",
                    responsePreview: JSON.stringify(payload).slice(0, 1000),
                });
            }
            let parsed;
            try {
                parsed = JSON.parse(outputText);
            }
            catch {
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
        }
        catch (error) {
            if (error instanceof RecipeExtractionError) {
                throw error;
            }
            if (error instanceof Error &&
                (error.name === "TimeoutError" || error.name === "AbortError")) {
                throw new RecipeExtractionError(504, "OpenAI parse request timed out", {
                    provider: "openai",
                    upstreamTimeoutMs: this.timeoutMs,
                });
            }
            throw error;
        }
    }
}
//# sourceMappingURL=openAiSocialRecipeAiProvider.js.map