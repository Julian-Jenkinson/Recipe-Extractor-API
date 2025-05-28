import axios from "axios";
import * as cheerio from "cheerio";
function normalizeImage(image) {
    if (!image)
        return undefined;
    if (typeof image === "string")
        return image;
    if (Array.isArray(image))
        return normalizeImage(image[0]);
    if (typeof image === "object" && image.url)
        return image.url;
    return undefined;
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
export async function extractRecipe(url) {
    //export default async function extractRecipe(url: string) {
    const { data: html } = await axios.get(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            Referer: url,
        },
    });
    const $ = cheerio.load(html);
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
        return {
            title: recipeData.name || recipeData.headline,
            ingredients: recipeData.recipeIngredient,
            instructions: Array.isArray(recipeData.recipeInstructions)
                ? recipeData.recipeInstructions.map((i) => i.text || i)
                : recipeData.recipeInstructions,
            image: normalizeImage(recipeData.image),
        };
    }
    // Step 2: Fallback to Microdata
    const microdataRecipe = $('[itemscope][itemtype="http://schema.org/Recipe"], [itemscope][itemtype="https://schema.org/Recipe"]').first();
    if (microdataRecipe.length === 0) {
        throw new Error("No recipe data found in JSON-LD or Microdata");
    }
    const title = microdataRecipe.find('[itemprop="name"]').first().text().trim();
    const ingredients = microdataRecipe.find('[itemprop="recipeIngredient"]').map((_, el) => $(el).text().trim()).get();
    const instructionEls = microdataRecipe.find('[itemprop="recipeInstructions"]');
    let instructions = "";
    if (instructionEls.length === 1) {
        const el = instructionEls.first();
        if (el.find("li").length > 0) {
            instructions = el.find("li").map((_, li) => $(li).text().trim()).get();
        }
        else if (el.find("p").length > 0) {
            instructions = el.find("p").map((_, p) => $(p).text().trim()).get();
        }
        else {
            instructions = el.text().trim();
        }
    }
    else {
        instructions = instructionEls.map((_, el) => $(el).text().trim()).get();
    }
    const rawImage = microdataRecipe.find('[itemprop="image"]').first().attr("src") || undefined;
    const image = normalizeImage(rawImage);
    return {
        title,
        ingredients,
        instructions,
        image,
    };
}
//# sourceMappingURL=index.js.map