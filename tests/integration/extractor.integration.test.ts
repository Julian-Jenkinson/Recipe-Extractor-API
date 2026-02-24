import { __testUtils, extractRecipe } from "../../src";

describe("integration/extractor end-to-end", () => {
  beforeEach(() => {
    __testUtils.clearCache();
    __testUtils.resetNetworkFnsForTests();
    __testUtils.setDnsLookupForTests(async () => [{ address: "93.184.216.34", family: 4 }]);
  });

  afterEach(() => {
    __testUtils.clearCache();
    __testUtils.resetNetworkFnsForTests();
  });

  test("extracts from JSON-LD graph structure", async () => {
    __testUtils.setHttpGetForTests(async () => ({
      status: 200,
      statusText: "200",
      data: `<html><body><script type=\"application/ld+json\">{"@graph":[{"@type":"WebPage"},{"@type":"Recipe","name":"Pasta","recipeIngredient":["Noodles"],"recipeInstructions":[{"@type":"HowToStep","name":"Cook"}]}]}</script></body></html>`,
      headers: { "content-type": "text/html" },
      config: {} as any,
    }));

    const recipe = await extractRecipe("https://example.com/pasta");
    expect(recipe.title).toBe("Pasta");
    expect(recipe.ingredients).toEqual(["Noodles"]);
    expect(recipe.ingredientDetails).toHaveLength(recipe.ingredients.length);
    expect(recipe.ingredientDetails[0].raw).toBe("Noodles");
    expect(recipe.instructions).toEqual(["Cook"]);
  });

  test("extracts from microdata with li instructions and optional fields", async () => {
    __testUtils.setHttpGetForTests(async () => ({
      status: 200,
      statusText: "200",
      data: `<html><body>
        <div itemscope itemtype=\"https://schema.org/Recipe\">
          <span itemprop=\"name\">Roast Veg</span>
          <span itemprop=\"recipeIngredient\">Carrot</span>
          <span itemprop=\"recipeIngredient\">Potato</span>
          <ul itemprop=\"recipeInstructions\"><li>Chop</li><li>Roast</li></ul>
          <img itemprop=\"image\" src=\"//cdn.example.com/veg.jpg\" />
          <span itemprop=\"recipeCategory\">Dinner</span>
          <span itemprop=\"notes\">Season well</span>
          <span itemprop=\"difficulty\">Easy</span>
          <span itemprop=\"cookTime\">45</span>
          <span itemprop=\"prepTime\">10</span>
          <span itemprop=\"recipeYield\">2</span>
        </div>
      </body></html>`,
      headers: { "content-type": "text/html" },
      config: {} as any,
    }));

    const recipe = await extractRecipe("https://example.com/veg");
    expect(recipe.title).toBe("Roast Veg");
    expect(recipe.instructions).toEqual(["Chop", "Roast"]);
    expect(recipe.image).toBe("https://cdn.example.com/veg.jpg");
    expect(recipe.category).toBe("Dinner");
    expect(recipe.notes).toEqual(["Season well"]);
    expect(recipe.difficulty).toBe("Easy");
    expect(recipe.cookTime).toBe("45");
    expect(recipe.prepTime).toBe("10");
    expect(recipe.servingSize).toBe("2");
  });

  test("extracts from microdata with multiple instruction nodes", async () => {
    __testUtils.setHttpGetForTests(async () => ({
      status: 200,
      statusText: "200",
      data: `<html><body>
        <div itemscope itemtype=\"https://schema.org/Recipe\">
          <span itemprop=\"name\">Tea</span>
          <span itemprop=\"recipeIngredient\">Water</span>
          <span itemprop=\"recipeInstructions\">Boil</span>
          <span itemprop=\"recipeInstructions\">Steep</span>
        </div>
      </body></html>`,
      headers: { "content-type": "text/html" },
      config: {} as any,
    }));

    const recipe = await extractRecipe("https://example.com/tea");
    expect(recipe.instructions).toEqual(["Boil", "Steep"]);
  });
});
