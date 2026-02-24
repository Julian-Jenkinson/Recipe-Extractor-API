import * as cheerio from "cheerio";
import { __testUtils } from "../../src";

describe("unit/normalizers and schema helpers", () => {
  test("normalizes image from string/array/object", () => {
    expect(__testUtils.normalizeImage(" //cdn.example.com/image.jpg ")).toBe("https://cdn.example.com/image.jpg");
    expect(__testUtils.normalizeImage(["https://example.com/a.jpg"])).toBe("https://example.com/a.jpg");
    expect(__testUtils.normalizeImage({ url: "https://example.com/b.jpg" })).toBe("https://example.com/b.jpg");
    expect(__testUtils.normalizeImage(undefined)).toBeUndefined();
  });

  test("normalizes category and notes", () => {
    expect(__testUtils.normalizeCategory(" Dinner ")).toBe("Dinner");
    expect(__testUtils.normalizeCategory(["Lunch", "Dinner"])).toBe("Lunch");
    expect(__testUtils.normalizeCategory({ name: "Dessert" })).toBe("Dessert");
    expect(__testUtils.normalizeCategory({ text: "Snack" })).toBe("Snack");
    expect(__testUtils.normalizeCategory({})).toBe("");
    expect(__testUtils.normalizeNotes(" note ")).toEqual(["note"]);
    expect(__testUtils.normalizeNotes([" note 1 ", { text: " tip " }])).toEqual(["note 1", "tip"]);
  });

  test("normalizes ingredients and instructions", () => {
    expect(__testUtils.normalizeIngredients(" salt ")).toEqual(["salt"]);
    expect(__testUtils.normalizeIngredients(null)).toEqual([]);
    expect(__testUtils.normalizeIngredients([" 1 cup flour ", { text: "2 eggs" }])).toEqual([
      "1 cup flour",
      "2 eggs",
    ]);

    const howTo = [
      { "@type": "HowToStep", text: " Mix " },
      {
        "@type": "HowToSection",
        itemListElement: [{ text: "Bake" }, { name: "Serve" }],
      },
      { random: "value" },
    ];

    expect(__testUtils.normalizeInstructions(howTo)).toEqual(["Mix", "Bake", "Serve"]);
    expect(__testUtils.normalizeInstructions("Step one")).toEqual(["Step one"]);
    expect(__testUtils.normalizeInstructions(null)).toEqual([]);
  });

  test("normalizes time, serving size, and difficulty", () => {
    expect(__testUtils.normalizeTimeString("PT1H30M")).toBe("90");
    expect(__testUtils.normalizeTimeString("2 hours 15 minutes")).toBe("135");
    expect(__testUtils.normalizeTimeString({ hours: "1", minutes: "20" })).toBe("80");
    expect(__testUtils.normalizeTimeString({ duration: "PT30M" })).toBe("30");
    expect(__testUtils.normalizeTimeString("about 12 mins")).toBe("12");
    expect(__testUtils.normalizeServingSize([" 4 servings "])).toBe("4 servings");
    expect(__testUtils.normalizeServingSize(3)).toBe("3");
    expect(__testUtils.normalizeServingSize({ value: "2" })).toBe("[object Object]");
    expect(__testUtils.normalizeDifficulty("  easy ")).toBe("easy");
    expect(__testUtils.normalizeDifficulty(2)).toBe("2");
  });

  test("finds recipe object in nested graph and builds recipe", () => {
    const graph = {
      "@graph": [
        { "@type": "WebPage" },
        {
          "@type": "Recipe",
          name: "Tomato Soup",
          recipeIngredient: ["2 tomatoes"],
          recipeInstructions: [{ "@type": "HowToStep", text: "Boil" }],
          image: "https://example.com/soup.jpg",
          recipeCategory: "Dinner",
          recipeYield: "2",
        },
      ],
    };

    const found = __testUtils.findRecipeObject(graph);
    expect(found?.name).toBe("Tomato Soup");
    expect(__testUtils.findRecipeObject(null)).toBeNull();

    const built = __testUtils.buildRecipeFromSchemaData(found, "example.com");
    expect(built.title).toBe("Tomato Soup");
    expect(built.ingredients).toEqual(["2 tomatoes"]);
    expect(built.instructions).toEqual(["Boil"]);
    expect(built.source).toBe("example.com");
  });

  test("extracts JSON-LD script blocks with size guard", () => {
    const html = `
      <html><body>
        <script type=\"application/ld+json\">{"@type":"Recipe","name":"A"}</script>
        <script type=\"application/ld+json\">{"@type":"Recipe","name":"B"}</script>
      </body></html>
    `;

    const blocks = __testUtils.extractJsonLdBlocks(html);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('"name":"A"');
  });

  test("extracts notes from html selectors", () => {
    const $ = cheerio.load(`
      <div class=\"recipe-notes\">Rest for 5 min</div>
      <div class=\"tips\">Use fresh herbs</div>
    `);

    const notes = __testUtils.extractNotesFromHtml($ as any);
    expect(notes).toContain("Rest for 5 min");
    expect(notes).toContain("Use fresh herbs");
  });
});
