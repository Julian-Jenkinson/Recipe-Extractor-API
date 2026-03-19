import { __testUtils, extractSocialRecipe, extractSocialRecipeWithDiagnostics } from "../../src";
import type { SocialRecipeAiProvider, SocialScrapeProvider } from "../../src/social/domain/contracts";
import type { SocialEvidence } from "../../src/social/domain/types";
import { UnconfiguredSocialRecipeAiProvider } from "../../src/social/infrastructure/unconfiguredSocialProviders";
import { isWeakSocialRecipeDraft, normalizeSocialRecipeDraft } from "../../src/social/services/socialRecipeNormalizer";

function makeEvidence(overrides: Partial<SocialEvidence> = {}): SocialEvidence {
  return {
    platform: "tiktok",
    url: "https://www.tiktok.com/@recipe.nuts/video/123456789",
    canonicalUrl: "https://www.tiktok.com/@recipe.nuts/video/123456789",
    caption: "Creamy tomato pasta with basil.",
    comments: [],
    authorHandle: "@recipe.nuts",
    titleHint: "Tomato Pasta",
    mediaType: "video",
    metadata: {
      thumbnailUrl: "https://cdn.example.com/thumb.jpg",
    },
    ...overrides,
  };
}

describe("unit/social extraction", () => {
  beforeEach(() => {
    __testUtils.clearCache();
    __testUtils.resetSocialProvidersForTests();
  });

  afterEach(() => {
    __testUtils.resetSocialProvidersForTests();
    __testUtils.clearCache();
  });

  test("validates and canonicalizes supported social URLs", () => {
    const result = __testUtils.validateAndNormalizeSocialUrl(
      "https://www.tiktok.com/@cook/video/123456789?is_from_webapp=1#fragment"
    );

    expect(result.platform).toBe("tiktok");
    expect(result.url.toString()).toBe("https://www.tiktok.com/@cook/video/123456789");
    expect(result.cacheKey).toBe("tiktok:https://www.tiktok.com/@cook/video/123456789");
  });

  test("validates and canonicalizes Instagram reel URLs", () => {
    const result = __testUtils.validateAndNormalizeSocialUrl(
      "https://www.instagram.com/reel/abc123/?utm_source=ig_web_copy_link#fragment"
    );

    expect(result.platform).toBe("instagram");
    expect(result.url.toString()).toBe("https://www.instagram.com/reel/abc123/");
    expect(result.cacheKey).toBe("instagram:https://www.instagram.com/reel/abc123/");
  });

  test("validates and canonicalizes YouTube Shorts URLs", () => {
    const result = __testUtils.validateAndNormalizeSocialUrl(
      "https://youtube.com/shorts/6UuseD5McGE?si=Dr3liFi33gTu0cKD#fragment"
    );

    expect(result.platform).toBe("youtube");
    expect(result.url.toString()).toBe("https://youtube.com/shorts/6UuseD5McGE");
    expect(result.cacheKey).toBe("youtube:https://youtube.com/shorts/6UuseD5McGE");
  });

  test("rejects TikTok URLs that are not direct video links", async () => {
    await expect(extractSocialRecipe("https://www.tiktok.com/@cook")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("rejects unsupported social hosts", async () => {
    await expect(extractSocialRecipe("https://example.com/post/1")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("rejects Instagram URLs that are not direct post links", async () => {
    await expect(extractSocialRecipe("https://www.instagram.com/recipe.nuts/")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("rejects YouTube URLs that are not direct video links", async () => {
    await expect(extractSocialRecipe("https://www.youtube.com/@recipes")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("returns a typed error when the TikTok scraper cannot extract metadata", async () => {
    await expect(extractSocialRecipe("https://www.tiktok.com/@cook/video/123")).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  test("extracts a social recipe with cheap mode only when the draft is strong", async () => {
    const scrapeProvider: SocialScrapeProvider = {
      async scrape(input) {
        return makeEvidence({
          platform: input.platform,
          url: input.url.toString(),
          canonicalUrl: input.url.toString(),
        });
      },
    };
    const aiProvider: SocialRecipeAiProvider = {
      async parse(evidence) {
        return {
          title: "Tomato Pasta",
          description: evidence.caption,
          ingredients: ["200g pasta", "2 tomatoes"],
          ingredientDetails: [{ raw: "200g pasta" }, { raw: "2 tomatoes" }],
          instructions: ["Boil pasta", "Stir through sauce"],
          image: "",
          source: evidence.canonicalUrl,
          category: "Dinner",
          notes: [],
          favourite: false,
          difficulty: "Easy",
          cookTime: "15 minutes",
          prepTime: "5 minutes",
          servingSize: "2",
          confidence: 0.91,
        };
      },
    };

    __testUtils.setSocialScrapeProviderForTests(scrapeProvider);
    __testUtils.setSocialRecipeAiProviderForTests(aiProvider);

    const recipe = await extractSocialRecipe("https://www.tiktok.com/@cook/video/123456789?utm_source=share");

    expect(recipe.title).toBe("Tomato Pasta");
    expect(recipe.ingredients).toEqual(["200g pasta", "2 tomatoes"]);
    expect(recipe.ingredientDetails[0]).toMatchObject({ raw: "200g pasta", quantity: 200, unit: "g", ingredient: "pasta" });
    expect(recipe.ingredientDetails[1]).toMatchObject({ raw: "2 tomatoes", quantity: 2, ingredient: "tomatoes" });
  });

  test("caches the cheap-pass result for repeated TikTok requests", async () => {
    const scrapeProvider: SocialScrapeProvider = {
      async scrape(input) {
        return makeEvidence({
          platform: input.platform,
          url: input.url.toString(),
          canonicalUrl: "https://www.tiktok.com/@cook/video/123456789",
        });
      },
    };

    const aiProvider: SocialRecipeAiProvider = {
      async parse(evidence) {
        return {
          title: "Weeknight Lasagna",
          description: evidence.caption,
          ingredients: ["400g beef", "Lasagna sheets"],
          ingredientDetails: [{ raw: "400g beef" }, { raw: "Lasagna sheets" }],
          instructions: ["Brown the beef", "Layer and bake"],
          image: "",
          source: evidence.canonicalUrl,
          category: "Dinner",
          notes: ["From creator comments"],
          favourite: false,
          difficulty: "Medium",
          cookTime: "20 mins",
          prepTime: "15 mins",
          servingSize: "4",
          confidence: 0.88,
        };
      },
    };

    __testUtils.setSocialScrapeProviderForTests(scrapeProvider);
    __testUtils.setSocialRecipeAiProviderForTests(aiProvider);

    const first = await extractSocialRecipeWithDiagnostics("https://www.tiktok.com/@cook/video/123456789");
    const second = await extractSocialRecipe("https://www.tiktok.com/@cook/video/123456789?is_from_webapp=1");

    expect(first.recipe.title).toBe("Weeknight Lasagna");
    expect(first.diagnostics.cacheHit).toBeUndefined();
    expect(second.title).toBe("Weeknight Lasagna");
  });

  test("returns cache diagnostics clearly on repeated requests", async () => {
    const scrapeProvider: SocialScrapeProvider = {
      async scrape(input) {
        return makeEvidence({
          platform: input.platform,
          url: input.url.toString(),
          canonicalUrl: input.url.toString(),
        });
      },
    };
    const aiProvider: SocialRecipeAiProvider = {
      async parse(evidence) {
        return {
          title: "Quick Pasta",
          description: evidence.caption,
          ingredients: ["200g pasta"],
          ingredientDetails: [{ raw: "200g pasta" }],
          instructions: [],
          image: "",
          source: evidence.canonicalUrl,
          category: "",
          notes: [],
          favourite: false,
          difficulty: "",
          cookTime: "",
          prepTime: "",
          servingSize: "",
          confidence: 0.8,
        };
      },
    };

    __testUtils.setSocialScrapeProviderForTests(scrapeProvider);
    __testUtils.setSocialRecipeAiProviderForTests(aiProvider);

    await extractSocialRecipe("https://www.tiktok.com/@cook/video/123456789");
    const cached = await extractSocialRecipeWithDiagnostics("https://www.tiktok.com/@cook/video/123456789");

    expect(cached.diagnostics.cacheHit).toBe(true);
    expect(cached.diagnostics.source).toBe("cache");
    expect(cached.diagnostics.failurePhase).toBeUndefined();
  });

  test("fails early when scraped social metadata has no usable caption or title", async () => {
    const scrapeProvider: SocialScrapeProvider = {
      async scrape(input) {
        return makeEvidence({
          platform: input.platform,
          url: input.url.toString(),
          canonicalUrl: input.url.toString(),
          caption: "",
          titleHint: "  ",
        });
      },
    };
    const aiProvider: SocialRecipeAiProvider = {
      async parse() {
        throw new Error("should not parse");
      },
    };

    __testUtils.setSocialScrapeProviderForTests(scrapeProvider);
    __testUtils.setSocialRecipeAiProviderForTests(aiProvider);

    await expect(extractSocialRecipe("https://www.tiktok.com/@cook/video/123456789")).rejects.toMatchObject({
      statusCode: 422,
      publicMessage: "No usable caption or title was found for this social post",
    });
  });

  test("returns a sparse recipe even when the extracted draft is weak", async () => {
    const scrapeProvider: SocialScrapeProvider = {
      async scrape(input) {
        return makeEvidence({
          platform: input.platform,
          url: input.url.toString(),
          canonicalUrl: input.url.toString(),
        });
      },
    };
    const aiProvider: SocialRecipeAiProvider = {
      async parse(evidence) {
        return {
          title: "",
          description: evidence.caption,
          ingredients: [],
          ingredientDetails: [],
          instructions: [],
          image: "",
          source: evidence.canonicalUrl,
          category: "",
          notes: [],
          favourite: false,
          difficulty: "",
          cookTime: "",
          prepTime: "",
          servingSize: "",
          confidence: 0.3,
          missingFields: ["ingredients", "instructions"],
        };
      },
    };

    __testUtils.setSocialScrapeProviderForTests(scrapeProvider);
    __testUtils.setSocialRecipeAiProviderForTests(aiProvider);

    const recipe = await extractSocialRecipe("https://www.tiktok.com/@cook/video/weakpost123");

    expect(recipe.title).toBe("Tomato Pasta");
    expect(recipe.ingredients).toEqual([]);
    expect(recipe.ingredientDetails).toEqual([]);
  });

  test("maps unexpected scrape or parse failures to 502", async () => {
    __testUtils.setSocialScrapeProviderForTests({
      async scrape() {
        throw new Error("scrape blew up");
      },
    });
    __testUtils.setSocialRecipeAiProviderForTests({
      async parse() {
        throw new Error("unused");
      },
    });

    await expect(extractSocialRecipe("https://www.tiktok.com/@cook/video/errorcase1")).rejects.toMatchObject({
      statusCode: 502,
    });

    __testUtils.setSocialScrapeProviderForTests({
      async scrape(input) {
        return makeEvidence({
          platform: input.platform,
          url: input.url.toString(),
          canonicalUrl: input.url.toString(),
        });
      },
    });
    __testUtils.setSocialRecipeAiProviderForTests({
      async parse() {
        throw new Error("parse blew up");
      },
    });

    await expect(extractSocialRecipe("https://www.tiktok.com/@cook/video/errorcase2")).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  test("normalizes sparse AI drafts using social evidence fallbacks", async () => {
    const recipe = normalizeSocialRecipeDraft(
      {
        title: " ",
        description: "",
        ingredients: [" basil ", ""],
        ingredientDetails: undefined as any,
        instructions: [" mix "],
        image: "",
        source: "",
        category: "",
        notes: [" note "],
        favourite: false,
        difficulty: "",
        cookTime: "",
        prepTime: "",
        servingSize: "",
        confidence: 0.9,
      },
      makeEvidence({
        titleHint: "Fallback title",
        caption: "Fallback description",
        metadata: { coverUrl: "https://cdn.example.com/cover.jpg" },
      })
    );

    expect(recipe.title).toBe("Fallback title");
    expect(recipe.description).toBe("Fallback description");
    expect(recipe.image).toBe("https://cdn.example.com/cover.jpg");
    expect(recipe.ingredientDetails[0]).toMatchObject({ raw: "basil", ingredient: "basil" });
    expect(isWeakSocialRecipeDraft({ ...recipe, confidence: 0.9 }, 0.6)).toBe(false);
  });

  test("unconfigured social AI provider returns a typed error", async () => {
    const provider = new UnconfiguredSocialRecipeAiProvider();

    await expect(provider.parse()).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});
