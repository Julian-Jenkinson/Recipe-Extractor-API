import * as cheerio from "cheerio";
import { MAX_JSON_LD_SCRIPT_BYTES } from "../application/config.js";
import { RecipeExtractionError } from "../domain/errors.js";
import type { Recipe } from "../domain/types.js";
import { parseIngredientDetails } from "./ingredientDetailParser.js";

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
};

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (fullMatch, entity: string) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith("#x")) {
      const codePoint = parseInt(normalized.slice(2), 16);
      return Number.isNaN(codePoint) ? fullMatch : String.fromCodePoint(codePoint);
    }
    if (normalized.startsWith("#")) {
      const codePoint = parseInt(normalized.slice(1), 10);
      return Number.isNaN(codePoint) ? fullMatch : String.fromCodePoint(codePoint);
    }
    return ENTITY_MAP[normalized] ?? fullMatch;
  });
}

function collapseDuplicateParentheses(value: string): string {
  let text = value;
  // Some schema sources wrap notes/weights as double parens, e.g. "((8 oz))".
  while (text.includes("((") || text.includes("))")) {
    text = text.replace(/\(\(/g, "(").replace(/\)\)/g, ")");
  }
  return text;
}

function sanitizeText(value: unknown): string {
  const decoded = decodeHtmlEntities(String(value ?? ""));
  const normalizedParens = collapseDuplicateParentheses(decoded);
  return normalizedParens.trim();
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

export function normalizeDescription(description: any): string {
  if (!description) return "";

  if (typeof description === "string") {
    return sanitizeText(stripHtmlTags(description)).replace(/\s+/g, " ").trim();
  }

  if (Array.isArray(description)) {
    for (const part of description) {
      const normalized = normalizeDescription(part);
      if (normalized) return normalized;
    }
    return "";
  }

  if (typeof description === "object") {
    if (description.text) return normalizeDescription(description.text);
    if (description.name) return normalizeDescription(description.name);
  }

  return sanitizeText(description);
}

export function normalizeImage(image: any): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") {
    const trimmed = sanitizeText(image);
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    return trimmed;
  }
  if (Array.isArray(image)) return normalizeImage(image[0]);
  if (typeof image === "object" && image.url) return normalizeImage(image.url);
  return undefined;
}

export function normalizeCategory(category: any): string {
  if (!category) return "";
  if (typeof category === "string") return sanitizeText(category);
  if (Array.isArray(category)) return normalizeCategory(category[0]);
  if (typeof category === "object") {
    if (category.name) return sanitizeText(category.name);
    if (category.text) return sanitizeText(category.text);
  }
  return "";
}

export function normalizeNotes(notes: any): string[] {
  if (!notes) return [];
  if (typeof notes === "string") {
    const trimmed = sanitizeText(notes);
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(notes)) return [];

  return notes
    .map((note: any) => {
      if (typeof note === "string") return sanitizeText(note);
      if (note && note.text) return sanitizeText(note.text);
      return sanitizeText(note);
    })
    .filter((note: string) => note.length > 0);
}

export function normalizeInstructions(instructions: any): string[] {
  if (!instructions) return [];
  if (typeof instructions === "string") {
    const trimmed = sanitizeText(instructions);
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(instructions)) return [];

  const result: string[] = [];
  instructions.forEach((instruction: any) => {
    if (typeof instruction === "string") {
      const trimmed = sanitizeText(instruction);
      if (trimmed) result.push(trimmed);
      return;
    }

    if (instruction && instruction.text) {
      const trimmed = sanitizeText(instruction.text);
      if (trimmed) result.push(trimmed);
      return;
    }

    if (!instruction || typeof instruction !== "object") return;

    if (instruction["@type"] === "HowToSection" && instruction.itemListElement) {
      instruction.itemListElement.forEach((step: any) => {
        if (step.text) {
          const trimmed = sanitizeText(step.text);
          if (trimmed) result.push(trimmed);
        } else if (step.name) {
          const trimmed = sanitizeText(step.name);
          if (trimmed) result.push(trimmed);
        }
      });
      return;
    }

    if (instruction["@type"] === "HowToStep") {
      if (instruction.text) {
        const trimmed = sanitizeText(instruction.text);
        if (trimmed) result.push(trimmed);
      } else if (instruction.name) {
        const trimmed = sanitizeText(instruction.name);
        if (trimmed) result.push(trimmed);
      }
      return;
    }

    const str = sanitizeText(instruction);
    if (str && !str.startsWith("{") && !str.startsWith("[")) {
      result.push(str);
    }
  });

  return result;
}

export function normalizeIngredients(ingredients: any): string[] {
  if (!ingredients) return [];
  if (Array.isArray(ingredients)) {
    return ingredients
      .map((ingredient: any) => {
        if (typeof ingredient === "string") return sanitizeText(ingredient);
        if (ingredient && ingredient.text) return sanitizeText(ingredient.text);
        return "";
      })
      .filter((ingredient: string) => ingredient.length > 0);
  }
  if (typeof ingredients === "string") {
    const trimmed = sanitizeText(ingredients);
    return trimmed ? [trimmed] : [];
  }
  return [];
}

export function normalizeTimeString(time: any): string {
  if (!time) return "";

  if (typeof time === "string") {
    const trimmed = sanitizeText(time);

    if (trimmed.startsWith("PT")) {
      const duration = trimmed.slice(2);
      let totalMinutes = 0;
      const hoursMatch = duration.match(/(\d+)H/);
      const minutesMatch = duration.match(/(\d+)M/);
      if (hoursMatch) totalMinutes += parseInt(hoursMatch[1], 10) * 60;
      if (minutesMatch) totalMinutes += parseInt(minutesMatch[1], 10);
      return totalMinutes.toString();
    }

    const hoursMatch = trimmed.match(/(\d+)\s*(?:h|hour|hours)/i);
    const minutesMatch = trimmed.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i);
    if (hoursMatch || minutesMatch) {
      let totalMinutes = 0;
      if (hoursMatch) totalMinutes += parseInt(hoursMatch[1], 10) * 60;
      if (minutesMatch) totalMinutes += parseInt(minutesMatch[1], 10);
      return totalMinutes.toString();
    }

    const numbersOnly = trimmed.replace(/[^\d]/g, "");
    return numbersOnly || trimmed;
  }

  if (typeof time === "object") {
    if (time.duration || time.value) {
      const duration = time.duration || time.value;
      if (typeof duration === "string") return normalizeTimeString(duration);
    }
    if (time.minutes || time.hours) {
      let totalMinutes = 0;
      if (time.hours) totalMinutes += parseInt(time.hours, 10) * 60;
      if (time.minutes) totalMinutes += parseInt(time.minutes, 10);
      return totalMinutes.toString();
    }
  }

  const str = sanitizeText(time);
  const numbersOnly = str.replace(/[^\d]/g, "");
  return numbersOnly || str;
}

export function normalizeServingSize(servings: any): string {
  if (!servings) return "";
  if (typeof servings === "string") return sanitizeText(servings);
  if (typeof servings === "number") return String(servings);
  if (Array.isArray(servings)) return sanitizeText(servings[0] || "");
  return sanitizeText(servings);
}

export function normalizeDifficulty(difficulty: any): string {
  if (!difficulty) return "";
  if (typeof difficulty === "string") return sanitizeText(difficulty);
  return sanitizeText(difficulty);
}

export function findRecipeObject(obj: any): any | null {
  if (!obj || typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findRecipeObject(item);
      if (found) return found;
    }
    return null;
  }

  const type = obj["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
    return obj;
  }

  if (obj["@graph"]) {
    const found = findRecipeObject(obj["@graph"]);
    if (found) return found;
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const found = findRecipeObject(obj[key]);
      if (found) return found;
    }
  }

  return null;
}

export function extractNotesFromHtml($: cheerio.CheerioAPI): string[] {
  const notes: string[] = [];
  const selectors = [
    ".recipe-notes",
    ".recipe-tips",
    ".notes",
    ".tips",
    ".chef-notes",
    ".cooking-tips",
    '[class*="note"]',
    '[class*="tip"]',
  ];

  selectors.forEach((selector) => {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text && !notes.includes(text)) {
        notes.push(text);
      }
    });
  });

  return notes;
}

export function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const scriptRegex =
    /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw || raw.length > MAX_JSON_LD_SCRIPT_BYTES) continue;
    blocks.push(raw);
  }

  return blocks;
}

export function buildRecipeFromSchemaData(recipeData: any, source: string): Recipe {
  const ingredients = normalizeIngredients(recipeData.recipeIngredient);
  return {
    title: sanitizeText(recipeData.name || recipeData.headline || ""),
    description: normalizeDescription(recipeData.description),
    ingredients,
    ingredientDetails: parseIngredientDetails(ingredients),
    instructions: normalizeInstructions(recipeData.recipeInstructions),
    image: normalizeImage(recipeData.image) || "",
    source: sanitizeText(source),
    category: normalizeCategory(recipeData.recipeCategory || recipeData.category),
    notes: normalizeNotes(recipeData.notes || recipeData.recipeNotes),
    difficulty: normalizeDifficulty(recipeData.difficulty || recipeData.recipeDifficulty),
    cookTime: normalizeTimeString(recipeData.cookTime || recipeData.cookingTime),
    prepTime: normalizeTimeString(recipeData.prepTime || recipeData.preparationTime),
    servingSize: normalizeServingSize(recipeData.recipeYield || recipeData.yield || recipeData.serves),
    favourite: false,
  };
}

export class RecipeParserService {
  parse(html: string, source: string): Recipe {
    return this.parseWithDiagnostics(html, source).recipe;
  }

  parseWithDiagnostics(html: string, source: string): { recipe: Recipe; parserPath: "json-ld" | "microdata" } {
    const jsonLdBlocks = extractJsonLdBlocks(html);
    for (const rawBlock of jsonLdBlocks) {
      try {
        const parsed = JSON.parse(rawBlock);
        const foundRecipe = findRecipeObject(parsed);
        if (foundRecipe) {
          return { recipe: buildRecipeFromSchemaData(foundRecipe, source), parserPath: "json-ld" };
        }
      } catch {
        // ignore malformed json-ld payloads
      }
    }

    const $ = cheerio.load(html);
    const microdataRecipe =
      $('[itemscope][itemtype="http://schema.org/Recipe"], [itemscope][itemtype="https://schema.org/Recipe"]').first();

    if (microdataRecipe.length === 0) {
      throw new RecipeExtractionError(422, "No recipe data found in JSON-LD or Microdata");
    }

    const title = microdataRecipe.find('[itemprop="name"]').first().text().trim();
    const cleanTitle = sanitizeText(title);
    const ingredients = microdataRecipe
      .find('[itemprop="recipeIngredient"]')
      .map((_, el) => sanitizeText($(el).text()))
      .get()
      .filter((ingredient: string) => ingredient.length > 0);

    const instructionEls = microdataRecipe.find('[itemprop="recipeInstructions"]');
    let instructions: string[] = [];

    if (instructionEls.length === 1) {
      const el = instructionEls.first();
      if (el.find("li").length > 0) {
        instructions = el
          .find("li")
          .map((_, li) => sanitizeText($(li).text()))
          .get()
          .filter((instruction: string) => instruction.length > 0);
      } else if (el.find("p").length > 0) {
        instructions = el
          .find("p")
          .map((_, p) => sanitizeText($(p).text()))
          .get()
          .filter((instruction: string) => instruction.length > 0);
      } else {
        const text = el.text().trim();
        if (text) instructions = [sanitizeText(text)];
      }
    } else {
      instructions = instructionEls
        .map((_, el) => sanitizeText($(el).text()))
        .get()
        .filter((instruction: string) => instruction.length > 0);
    }

    const image = normalizeImage(microdataRecipe.find('[itemprop="image"]').first().attr("src")) || "";
    const categoryEl = microdataRecipe.find('[itemprop="recipeCategory"]').first();
    const category = categoryEl.length > 0 ? sanitizeText(categoryEl.text()) : "";
    const descriptionEl = microdataRecipe.find('[itemprop="description"]').first();
    const descriptionFromMicrodata = descriptionEl.length > 0 ? descriptionEl.text() : "";
    const ogDescription = $('meta[property="og:description"]').attr("content");
    const metaDescription = $('meta[name="description"]').attr("content");
    const description = normalizeDescription(descriptionFromMicrodata || ogDescription || metaDescription || "");
    const notes = microdataRecipe
      .find('[itemprop="recipeNotes"], [itemprop="notes"]')
      .map((_, el) => sanitizeText($(el).text()))
      .get()
      .filter((note: string) => note.length > 0);

    const difficultyEl = microdataRecipe.find('[itemprop="difficulty"], [itemprop="recipeDifficulty"]').first();
    const cookTimeEl = microdataRecipe.find('[itemprop="cookTime"], [itemprop="cookingTime"]').first();
    const prepTimeEl = microdataRecipe.find('[itemprop="prepTime"], [itemprop="preparationTime"]').first();
    const servingSizeEl =
      microdataRecipe.find('[itemprop="recipeYield"], [itemprop="yield"], [itemprop="serves"]').first();

    return {
      recipe: {
        title: cleanTitle,
        description,
        ingredients,
        ingredientDetails: parseIngredientDetails(ingredients),
        instructions,
        image,
        source: sanitizeText(source),
        category,
        notes,
        difficulty: difficultyEl.length > 0 ? sanitizeText(difficultyEl.text()) : "",
        cookTime: cookTimeEl.length > 0 ? sanitizeText(cookTimeEl.text()) : "",
        prepTime: prepTimeEl.length > 0 ? sanitizeText(prepTimeEl.text()) : "",
        servingSize: servingSizeEl.length > 0 ? sanitizeText(servingSizeEl.text()) : "",
        favourite: false,
      },
      parserPath: "microdata",
    };
  }
}
