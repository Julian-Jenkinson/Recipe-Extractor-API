// tests/extractor.test.ts
import { extractRecipe } from '../src';

const urls = [
  "https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/",
  "https://kirbiecravings.com/mochi-brownies/",
  "https://www.bbcgoodfood.com/recipes/chocolate-fudge-cake",
  "https://www.foodnetwork.com/recipes/ina-garten/meat-loaf-recipe-1921718", // 403 ERROR - ( I believe the server has bot protection )
  "https://smittenkitchen.com/2025/05/eggs-florentine/", // Missing partial data - no instructions, no image ( mircodata format )
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
  "https://www.thekitchn.com/blueberry-poke-cake-recipe-23725361",
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

      expect(recipe.title).toBeDefined();
      expect(typeof recipe.title).toBe("string");

      expect(recipe.ingredients).toBeDefined();
      if (Array.isArray(recipe.ingredients)) {
        expect(recipe.ingredients.length).toBeGreaterThan(0);
      } else {
        throw new Error("Ingredients should be an array");
      }

      expect(recipe.instructions).toBeDefined();
      if (typeof recipe.instructions === "string") {
        expect(recipe.instructions.trim().length).toBeGreaterThan(0);
      } else if (Array.isArray(recipe.instructions)) {
        expect(recipe.instructions.length).toBeGreaterThan(0);
      } else {
        throw new Error("Instructions should be string or array");
      }

      expect(recipe.image).toBeDefined();
      expect(typeof recipe.image).toBe("string");
    });
  });
});
