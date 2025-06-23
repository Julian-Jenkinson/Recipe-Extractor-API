import axios from "axios";
import * as cheerio from "cheerio";
function normalizeImage(image) {
    if (!image)
        return undefined;
    if (typeof image === "string")
        return image.trim();
    if (Array.isArray(image))
        return normalizeImage(image[0]);
    if (typeof image === "object" && image.url)
        return normalizeImage(image.url);
    return undefined;
}
function normalizeCategory(category) {
    if (!category)
        return "";
    if (typeof category === "string") {
        return category.trim();
    }
    if (Array.isArray(category)) {
        // Take the first category if multiple
        const first = category[0];
        return normalizeCategory(first);
    }
    if (typeof category === "object") {
        // Handle category objects that might have name or text properties
        if (category.name) {
            return String(category.name).trim();
        }
        if (category.text) {
            return String(category.text).trim();
        }
        return "";
    }
    return "";
}
function normalizeNotes(notes) {
    if (!notes)
        return [];
    if (typeof notes === "string") {
        const trimmed = notes.trim();
        return trimmed ? [trimmed] : [];
    }
    if (Array.isArray(notes)) {
        return notes
            .map((note) => {
            if (typeof note === "string") {
                return note.trim();
            }
            if (note && note.text) {
                return note.text.trim();
            }
            return String(note).trim();
        })
            .filter((note) => note.length > 0);
    }
    return [];
}
function normalizeInstructions(instructions) {
    if (!instructions)
        return [];
    if (typeof instructions === "string") {
        const trimmed = instructions.trim();
        return trimmed ? [trimmed] : [];
    }
    if (Array.isArray(instructions)) {
        const result = [];
        instructions.forEach((instruction) => {
            if (typeof instruction === "string") {
                const trimmed = instruction.trim();
                if (trimmed)
                    result.push(trimmed);
            }
            else if (instruction && instruction.text) {
                const trimmed = instruction.text.trim();
                if (trimmed)
                    result.push(trimmed);
            }
            else if (instruction && typeof instruction === "object") {
                // Handle HowToSection objects
                if (instruction["@type"] === "HowToSection" && instruction.itemListElement) {
                    instruction.itemListElement.forEach((step) => {
                        if (step.text) {
                            const trimmed = step.text.trim();
                            if (trimmed)
                                result.push(trimmed);
                        }
                        else if (step.name) {
                            const trimmed = step.name.trim();
                            if (trimmed)
                                result.push(trimmed);
                        }
                    });
                }
                // Handle direct HowToStep objects
                else if (instruction["@type"] === "HowToStep") {
                    if (instruction.text) {
                        const trimmed = instruction.text.trim();
                        if (trimmed)
                            result.push(trimmed);
                    }
                    else if (instruction.name) {
                        const trimmed = instruction.name.trim();
                        if (trimmed)
                            result.push(trimmed);
                    }
                }
                // Try to parse as JSON string if it looks like one
                else if (typeof instruction === "string" && instruction.startsWith("{")) {
                    try {
                        const parsed = JSON.parse(instruction);
                        const nested = normalizeInstructions([parsed]);
                        result.push(...nested);
                    }
                    catch {
                        // If JSON parsing fails, treat as regular string
                        const trimmed = instruction.trim();
                        if (trimmed)
                            result.push(trimmed);
                    }
                }
                else {
                    // Fallback: convert to string but filter out obvious JSON
                    const str = String(instruction).trim();
                    if (str && !str.startsWith("{") && !str.startsWith("[")) {
                        result.push(str);
                    }
                }
            }
        });
        return result;
    }
    return [];
}
function normalizeIngredients(ingredients) {
    if (!ingredients)
        return [];
    if (Array.isArray(ingredients)) {
        return ingredients
            .map((ingredient) => {
            if (typeof ingredient === "string") {
                return ingredient.trim();
            }
            if (ingredient && ingredient.text) {
                return ingredient.text.trim();
            }
            return "";
        })
            .filter((ingredient) => ingredient.length > 0);
    }
    if (typeof ingredients === "string") {
        const trimmed = ingredients.trim();
        return trimmed ? [trimmed] : [];
    }
    return [];
}
function normalizeTimeString(time) {
    if (!time)
        return "";
    if (typeof time === "string") {
        const trimmed = time.trim();
        // Handle ISO 8601 duration format (PT30M, PT1H30M, PT2H, etc.)
        if (trimmed.startsWith("PT")) {
            const duration = trimmed.slice(2); // Remove "PT" prefix
            let totalMinutes = 0;
            // Extract hours (H)
            const hoursMatch = duration.match(/(\d+)H/);
            if (hoursMatch) {
                totalMinutes += parseInt(hoursMatch[1]) * 60;
            }
            // Extract minutes (M)
            const minutesMatch = duration.match(/(\d+)M/);
            if (minutesMatch) {
                totalMinutes += parseInt(minutesMatch[1]);
            }
            return totalMinutes.toString();
        }
        // Handle other common time formats
        // Check for formats like "1h 30m", "2 hours 15 minutes", etc.
        const hoursMatch = trimmed.match(/(\d+)\s*(?:h|hour|hours)/i);
        const minutesMatch = trimmed.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i);
        if (hoursMatch || minutesMatch) {
            let totalMinutes = 0;
            if (hoursMatch)
                totalMinutes += parseInt(hoursMatch[1]) * 60;
            if (minutesMatch)
                totalMinutes += parseInt(minutesMatch[1]);
            return totalMinutes.toString();
        }
        // Fallback: extract numbers only
        const numbersOnly = trimmed.replace(/[^\d]/g, "");
        return numbersOnly || trimmed;
    }
    if (typeof time === "object") {
        // Handle ISO 8601 duration format (PT30M = 30 minutes)
        if (time.duration || time.value) {
            const duration = time.duration || time.value;
            if (typeof duration === "string") {
                return normalizeTimeString(duration); // Recursively handle the string
            }
        }
        // Handle object with minutes/hours properties
        if (time.minutes || time.hours) {
            let totalMinutes = 0;
            if (time.hours)
                totalMinutes += parseInt(time.hours) * 60;
            if (time.minutes)
                totalMinutes += parseInt(time.minutes);
            return totalMinutes.toString();
        }
    }
    // Fallback: extract numbers only
    const str = String(time).trim();
    const numbersOnly = str.replace(/[^\d]/g, "");
    return numbersOnly || str;
}
function normalizeServingSize(servings) {
    if (!servings)
        return "";
    if (typeof servings === "string") {
        return servings.trim();
    }
    if (typeof servings === "number") {
        return String(servings);
    }
    if (Array.isArray(servings)) {
        return String(servings[0] || "").trim();
    }
    return String(servings).trim();
}
function normalizeDifficulty(difficulty) {
    if (!difficulty)
        return "";
    if (typeof difficulty === "string") {
        return difficulty.trim();
    }
    return String(difficulty).trim();
}
function findRecipeObject(obj) {
    if (!obj || typeof obj !== "object")
        return null;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = findRecipeObject(item);
            if (found)
                return found;
        }
    }
    else {
        const type = obj["@type"];
        if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
            return obj;
        }
        if (obj["@graph"]) {
            const found = findRecipeObject(obj["@graph"]);
            if (found)
                return found;
        }
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const found = findRecipeObject(obj[key]);
                if (found)
                    return found;
            }
        }
    }
    return null;
}
function extractNotesFromHtml($) {
    const notes = [];
    // Common selectors for recipe notes/tips
    const noteSelectors = [
        '.recipe-notes',
        '.recipe-tips',
        '.notes',
        '.tips',
        '.chef-notes',
        '.cooking-tips',
        '[class*="note"]',
        '[class*="tip"]'
    ];
    noteSelectors.forEach(selector => {
        $(selector).each((_, el) => {
            const text = $(el).text().trim();
            if (text && !notes.includes(text)) {
                notes.push(text);
            }
        });
    });
    return notes;
}
export async function extractRecipe(url) {
    const { data: html } = await axios.get(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            Referer: url,
        },
    });
    const $ = cheerio.load(html);
    // Extract source from URL
    const source = new URL(url).hostname.replace(/^www\./, '');
    // Step 1: Try JSON-LD
    const jsonLdTags = $('script[type="application/ld+json"]');
    let recipeData = null;
    jsonLdTags.each((_, el) => {
        try {
            const raw = $(el).html();
            if (!raw)
                return;
            const parsed = JSON.parse(raw);
            const foundRecipe = findRecipeObject(parsed);
            if (foundRecipe) {
                recipeData = foundRecipe;
                return false; // break out of each
            }
        }
        catch {
            // ignore JSON parse errors
        }
    });
    if (recipeData) {
        const title = (recipeData.name || recipeData.headline || "").trim();
        const ingredients = normalizeIngredients(recipeData.recipeIngredient);
        const instructions = normalizeInstructions(recipeData.recipeInstructions);
        const image = normalizeImage(recipeData.image) || "";
        const category = normalizeCategory(recipeData.recipeCategory || recipeData.category);
        // Extract notes from JSON-LD only (no description fallback)
        const notes = normalizeNotes(recipeData.notes || recipeData.recipeNotes);
        // Extract new fields
        const difficulty = normalizeDifficulty(recipeData.difficulty || recipeData.recipeDifficulty);
        const cookTime = normalizeTimeString(recipeData.cookTime || recipeData.cookingTime);
        const prepTime = normalizeTimeString(recipeData.prepTime || recipeData.preparationTime);
        const servingSize = normalizeServingSize(recipeData.recipeYield || recipeData.yield || recipeData.serves);
        return {
            title,
            ingredients,
            instructions,
            image,
            source,
            category,
            notes,
            difficulty,
            cookTime,
            prepTime,
            servingSize,
            favourite: false,
        };
    }
    // Step 2: Fallback to Microdata
    const microdataRecipe = $('[itemscope][itemtype="http://schema.org/Recipe"], [itemscope][itemtype="https://schema.org/Recipe"]').first();
    if (microdataRecipe.length === 0) {
        throw new Error("No recipe data found in JSON-LD or Microdata");
    }
    const title = microdataRecipe.find('[itemprop="name"]').first().text().trim();
    const ingredients = microdataRecipe
        .find('[itemprop="recipeIngredient"]')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((ingredient) => ingredient.length > 0);
    const instructionEls = microdataRecipe.find('[itemprop="recipeInstructions"]');
    let instructions = [];
    if (instructionEls.length === 1) {
        const el = instructionEls.first();
        if (el.find("li").length > 0) {
            instructions = el
                .find("li")
                .map((_, li) => $(li).text().trim())
                .get()
                .filter((instruction) => instruction.length > 0);
        }
        else if (el.find("p").length > 0) {
            instructions = el
                .find("p")
                .map((_, p) => $(p).text().trim())
                .get()
                .filter((instruction) => instruction.length > 0);
        }
        else {
            const text = el.text().trim();
            if (text) {
                instructions = [text];
            }
        }
    }
    else {
        instructions = instructionEls
            .map((_, el) => $(el).text().trim())
            .get()
            .filter((instruction) => instruction.length > 0);
    }
    const rawImage = microdataRecipe.find('[itemprop="image"]').first().attr("src");
    const image = normalizeImage(rawImage) || "";
    // Extract category from microdata
    const categoryEl = microdataRecipe.find('[itemprop="recipeCategory"]').first();
    const category = categoryEl.length > 0 ? categoryEl.text().trim() : "";
    // Extract notes from HTML (specific note fields only)
    const noteElements = microdataRecipe.find('[itemprop="recipeNotes"], [itemprop="notes"]');
    const notes = noteElements
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((note) => note.length > 0);
    // Extract new fields from microdata
    const difficultyEl = microdataRecipe.find('[itemprop="difficulty"], [itemprop="recipeDifficulty"]').first();
    const difficulty = difficultyEl.length > 0 ? difficultyEl.text().trim() : "";
    const cookTimeEl = microdataRecipe.find('[itemprop="cookTime"], [itemprop="cookingTime"]').first();
    const cookTime = cookTimeEl.length > 0 ? cookTimeEl.text().trim() : "";
    const prepTimeEl = microdataRecipe.find('[itemprop="prepTime"], [itemprop="preparationTime"]').first();
    const prepTime = prepTimeEl.length > 0 ? prepTimeEl.text().trim() : "";
    const servingSizeEl = microdataRecipe.find('[itemprop="recipeYield"], [itemprop="yield"], [itemprop="serves"]').first();
    const servingSize = servingSizeEl.length > 0 ? servingSizeEl.text().trim() : "";
    return {
        title,
        ingredients,
        instructions,
        image,
        source,
        category,
        notes,
        difficulty,
        cookTime,
        prepTime,
        servingSize,
        favourite: false,
    };
}
//# sourceMappingURL=index.js.map