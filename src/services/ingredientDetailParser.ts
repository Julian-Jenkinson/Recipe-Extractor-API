import { decodeHtmlEntities } from "./recipeParserService.js";
import type { IngredientDetail } from "../domain/types.js";

const UNIT_ALIASES: Record<string, string> = {
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tb: "tbsp",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cup: "cup",
  cups: "cup",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  clove: "clove",
  cloves: "clove",
  pinch: "pinch",
  can: "can",
  cans: "can",
  package: "package",
  packages: "package",
  stick: "stick",
  sticks: "stick",
};

const PREP_KEYWORDS = [
  "chopped",
  "diced",
  "minced",
  "sliced",
  "grated",
  "melted",
  "softened",
  "crushed",
  "beaten",
  "peeled",
  "rinsed",
  "drained",
  "divided",
  "optional",
];

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

function parseSimpleFraction(value: string): number | null {
  if (UNICODE_FRACTIONS[value] !== undefined) {
    return UNICODE_FRACTIONS[value];
  }
  const [top, bottom] = value.split("/").map((v) => Number(v));
  if (!top || !bottom) return null;
  return top / bottom;
}

function parseQuantityPrefix(line: string): { quantity?: number; quantityMax?: number; consumed: number } {
  const trimmed = line.trim();

  const range = trimmed.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (range) {
    return {
      quantity: Number(range[1]),
      quantityMax: Number(range[2]),
      consumed: range[0].length,
    };
  }

  const fractionRange = trimmed.match(/^(\d+\/\d+)\s*-\s*(\d+\/\d+)/);
  if (fractionRange) {
    const min = parseSimpleFraction(fractionRange[1]);
    const max = parseSimpleFraction(fractionRange[2]);
    if (min !== null && max !== null) {
      return {
        quantity: min,
        quantityMax: max,
        consumed: fractionRange[0].length,
      };
    }
  }

  const mixedWithAnd = trimmed.match(/^(\d+)\s*(?:&|and)\s*(\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞])/i);
  if (mixedWithAnd) {
    const whole = Number(mixedWithAnd[1]);
    const fraction = parseSimpleFraction(mixedWithAnd[2]);
    if (fraction !== null) {
      return { quantity: whole + fraction, consumed: mixedWithAnd[0].length };
    }
  }

  const mixedFraction = trimmed.match(/^(\d+)\s+(\d+\/\d+)/);
  if (mixedFraction) {
    const whole = Number(mixedFraction[1]);
    const fraction = parseSimpleFraction(mixedFraction[2]);
    if (fraction !== null) {
      return { quantity: whole + fraction, consumed: mixedFraction[0].length };
    }
  }

  const fraction = trimmed.match(/^(\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞])/);
  if (fraction) {
    const parsed = parseSimpleFraction(fraction[1]);
    if (parsed !== null) {
      return { quantity: parsed, consumed: fraction[0].length };
    }
  }

  const decimal = trimmed.match(/^(\d+(?:\.\d+)?)/);
  if (decimal) {
    return { quantity: Number(decimal[1]), consumed: decimal[0].length };
  }

  return { consumed: 0 };
}

function normalizeRaw(raw: string): string {
  return decodeHtmlEntities(raw).replace(/\s+/g, " ").trim();
}

function parseAlternatives(raw: string): string[] {
  const alternatives: string[] = [];
  const parenOr = raw.match(/\(\s*or\s+([^\)]+)\)/i);
  if (parenOr?.[1]) alternatives.push(parenOr[1].trim());
  return alternatives;
}

function extractParentheticalNotes(value: string): string[] {
  const matches = [...value.matchAll(/\(([^)]*)\)/g)];
  return matches
    .map((match) => match[1]?.trim() ?? "")
    .filter((note) => note.length > 0)
    .map((note) => note.replace(/\s+,\s+/g, ", ").replace(/\s+/g, " ").trim());
}

export function parseIngredientDetail(rawInput: string): IngredientDetail {
  const raw = normalizeRaw(rawInput);
  const detail: IngredientDetail = {
    raw,
    optional: /\boptional\b/i.test(raw),
    alternatives: parseAlternatives(raw),
    confidence: 0.4,
  };

  const { quantity, quantityMax, consumed } = parseQuantityPrefix(raw);
  if (quantity !== undefined) {
    detail.quantity = quantity;
    detail.confidence = 0.6;
    if (quantityMax !== undefined) {
      detail.quantityMax = quantityMax;
      detail.confidence = Math.max(detail.confidence, 0.7);
    }
  }

  const tail = raw.slice(consumed).trim();
  const [firstToken = ""] = tail.split(/\s+/);
  const canonicalUnit = UNIT_ALIASES[firstToken.toLowerCase()];

  let ingredientSegment = tail;
  if (canonicalUnit) {
    detail.unit = canonicalUnit;
    detail.unitOriginal = firstToken;
    ingredientSegment = tail.slice(firstToken.length).trim();
    detail.confidence = 0.75;
  }

  const parentheticalNotes = extractParentheticalNotes(ingredientSegment);
  if (parentheticalNotes.length > 0) {
    detail.notes = parentheticalNotes.join("; ");
  }

  const ingredientWithoutParens = ingredientSegment.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  const prepMatch = ingredientWithoutParens.match(new RegExp(`\\b(${PREP_KEYWORDS.join("|")})\\b`, "i"));
  if (prepMatch?.[1]) {
    detail.preparation = prepMatch[1].toLowerCase();
    detail.confidence = Math.max(detail.confidence ?? 0, 0.8);
  }

  const cleanedIngredient = ingredientWithoutParens
    .replace(/^[\-\u2013\u2014,\s]+/, "")
    .replace(/\s+,\s+/g, ", ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanedIngredient) {
    detail.ingredient = cleanedIngredient;
    detail.confidence = Math.max(detail.confidence ?? 0, 0.85);
  }

  if (!detail.quantity && !detail.unit && !detail.ingredient) {
    detail.confidence = 0.2;
  }

  if (!detail.alternatives?.length) {
    delete detail.alternatives;
  }

  return detail;
}

export function parseIngredientDetails(ingredients: string[]): IngredientDetail[] {
  return ingredients.map((raw) => parseIngredientDetail(raw));
}
