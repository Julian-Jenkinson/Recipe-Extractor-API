import { extractRecipe } from '../src';

const urls = [
  "https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/",
  "https://kirbiecravings.com/mochi-brownies/",
  "https://www.bbcgoodfood.com/recipes/chocolate-fudge-cake",
  "https://www.foodnetwork.com/recipes/ina-garten/meat-loaf-recipe-1921718", // known 403 protection
  "https://smittenkitchen.com/2025/05/eggs-florentine/", // missing instruction data - critical
  "https://www.epicurious.com/recipes/food/views/salmon-patties-dill-sauce",
  "https://cookieandkate.com/best-lentil-soup-recipe/",
  "https://www.bonappetit.com/recipe/simple-carbonara",
  "https://minimalistbaker.com/jerk-tofu-roasted-plantain-bowls/",
  "https://www.tasteofhome.com/recipes/banana-bread/",
  "https://www.eatingwell.com/tomato-mozzarella-arugula-sandwich-8657555",
  "https://www.jamieoliver.com/recipes/vegetables/the-ultimate-spring-quiche/",
  "https://www.nigella.com/recipes/chicken-with-lemon-cream-and-parsley-sauce",
  "https://www.delish.com/cooking/recipe-ideas/a19665918/oven-baked-tilapia-recipe/",
  "https://www.seriouseats.com/grilled-smoked-brownie-recipe-7568650",
  "https://www.thekitchn.com/blueberry-poke-cake-recipe-23725361", // known 403 protection
  "https://www.simplyrecipes.com/huli-huli-chicken-recipe-11738859",
  "https://www.foodandwine.com/recipes/watermelon-salad-feta-and-mint",
  "https://www.bbcgoodfood.com/recipes/one-pot-sausage-casserole-with-garlic-breadcrumbs",
  "https://www.rachelphipps.com/2014/07/cookbook-corner-recipe-wheel.html",
];

describe('extractRecipe (successful cases)', () => {
  urls.forEach((url) => {
    test(`should extract recipe from ${url}`, async () => {

      const recipe = await extractRecipe(url);
      expect(recipe).toBeDefined();

      // Title
      expect(recipe.title).toBeDefined();
      expect(typeof recipe.title).toBe("string");
      expect(recipe.title.trim().length).toBeGreaterThan(0);

      // Ingredients
      expect(recipe.ingredients).toBeDefined();
      expect(Array.isArray(recipe.ingredients)).toBe(true);
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      recipe.ingredients.forEach((i) => {
        expect(typeof i).toBe("string");
        expect(i.trim().length).toBeGreaterThan(0);
      });

      // Instructions
      expect(recipe.instructions).toBeDefined();
      expect(Array.isArray(recipe.instructions)).toBe(true);
      expect(recipe.instructions.length).toBeGreaterThan(0);
      recipe.instructions.forEach((step) => {
        expect(typeof step).toBe("string");
        expect(step.trim().length).toBeGreaterThan(0);
      });

      // Image
      if (!url.includes("smittenkitchen.com")) {
        expect(recipe.image).toBeDefined();
        expect(typeof recipe.image).toBe("string");
        expect(recipe.image.trim().length).toBeGreaterThan(0);
      }

      // Favourite
      expect(typeof recipe.favourite).toBe("boolean");
      expect(recipe.favourite).toBe(false);

      // Prep time (optional but should be a string)
      expect(typeof recipe.prepTime).toBe("string");

      // Cook time (optional but should be a string)
      expect(typeof recipe.cookTime).toBe("string");

      // Difficulty (optional string)
      expect(typeof recipe.difficulty).toBe("string");

      // Source (required string)
      expect(recipe.source).toBeDefined();
      expect(typeof recipe.source).toBe("string");
      expect(recipe.source.trim().length).toBeGreaterThan(0);

      // Serving size (optional string)
      expect(typeof recipe.servingSize).toBe("string");

      // Notes (optional array of strings)
      expect(Array.isArray(recipe.notes)).toBe(true);
      recipe.notes.forEach((note) => {
        expect(typeof note).toBe("string");
      });

      // Category (optional string)
      expect(typeof recipe.category).toBe("string");
    });
  });
});
