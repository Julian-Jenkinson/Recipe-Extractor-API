import { extractRecipe } from "./src";

const urls = [
  "https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/",
  "https://kirbiecravings.com/mochi-brownies/",
  "https://www.foodnetwork.com/recipes/ina-garten/meat-loaf-recipe-1921718",// 403
  "https://www.bbcgoodfood.com/recipes/chocolate-fudge-cake",
  "https://smittenkitchen.com/2025/05/eggs-florentine/", // json-ld not found
  "https://www.epicurious.com/recipes/food/views/salmon-patties-dill-sauce",
  "https://cookieandkate.com/best-lentil-soup-recipe/",
  "https://www.bonappetit.com/recipe/simple-carbonara",
  "https://minimalistbaker.com/jerk-tofu-roasted-plantain-bowls/",
  "https://www.tasteofhome.com/recipes/banana-bread/",
  "https://www.eatingwell.com/tomato-mozzarella-arugula-sandwich-8657555",
  "https://www.jamieoliver.com/recipes/vegetables/the-ultimate-spring-quiche/",
  "https://www.nigella.com/recipes/chicken-with-lemon-cream-and-parsley-sauce", //no json-ld
  "https://www.delish.com/cooking/recipe-ideas/a19665918/oven-baked-tilapia-recipe/",
  "https://www.seriouseats.com/grilled-smoked-brownie-recipe-7568650",
  "https://www.thekitchn.com/blueberry-poke-cake-recipe-23725361",
  "https://www.simplyrecipes.com/huli-huli-chicken-recipe-11738859",
  "https://www.foodandwine.com/recipes/watermelon-salad-feta-and-mint",
  "https://www.bbcgoodfood.com/recipes/one-pot-sausage-casserole-with-garlic-breadcrumbs",
];

async function testRecipes() {
  for (const url of urls) {
    try {
      console.log(`\nFetching recipe from: ${url}`);
      const recipe = await extractRecipe(url);
      console.log("Title:", recipe.title);
      console.log("Ingredients:", recipe.ingredients?.slice(0, 5), "..."); // show first 5 ingredients
      console.log("Instructions:", Array.isArray(recipe.instructions) ? recipe.instructions.slice(0, 2) : recipe.instructions);
      console.log("Image:", recipe.image);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error fetching recipe from ${url}:`, error.message);
      } else {
        console.error(`Error fetching recipe from ${url}:`, String(error));
      }
    }
  }
}


testRecipes();
