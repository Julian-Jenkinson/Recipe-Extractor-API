import type { AxiosResponse } from "axios";
import { RecipeExtractionError, __testUtils, extractRecipe, extractRecipeWithDiagnostics } from "../../src";

function makeAxiosError(status?: number, code?: string): any {
  return {
    isAxiosError: true,
    response: status ? { status } : undefined,
    code,
    message: "axios error",
  };
}

function makeResponse(status: number, data: string, contentType = "text/html"): AxiosResponse<string> {
  return {
    status,
    statusText: String(status),
    data,
    headers: { "content-type": contentType },
    config: {} as any,
  };
}

describe("unit/network behavior, retries, malformed inputs, scraping edges", () => {
  beforeEach(() => {
    __testUtils.clearCache();
    __testUtils.resetNetworkFnsForTests();
    __testUtils.setDnsLookupForTests(async () => [{ address: "93.184.216.34", family: 4 } as any]);
  });

  afterEach(() => {
    __testUtils.resetNetworkFnsForTests();
    __testUtils.clearCache();
  });

  test("assertPublicDestination rejects private DNS results", async () => {
    __testUtils.setDnsLookupForTests(async () => [{ address: "10.0.0.10", family: 4 } as any]);
    await expect(__testUtils.assertPublicDestination(new URL("https://example.com"))).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("fetchHtmlWithRetry retries transient failures and succeeds", async () => {
    let calls = 0;
    __testUtils.setHttpGetForTests(async () => {
      calls += 1;
      if (calls < 3) throw makeAxiosError(503, "ECONNRESET");
      return makeResponse(200, "<html></html>");
    });

    const res = await __testUtils.fetchHtmlWithRetry(new URL("https://example.com"));
    expect(res.status).toBe(200);
    expect(calls).toBe(3);
  });

  test("fetchHtmlWithRetry uses fallback profile for block-like upstream responses", async () => {
    let primaryCalls = 0;
    let fallbackCalls = 0;
    __testUtils.setHttpGetForTests(async () => {
      primaryCalls += 1;
      throw makeAxiosError(403, "ERR_BAD_REQUEST");
    });
    __testUtils.setFallbackHttpGetForTests(async () => {
      fallbackCalls += 1;
      return makeResponse(200, "<html>ok</html>");
    });

    const res = await __testUtils.fetchHtmlWithRetry(new URL("https://example.com"));
    expect(res.status).toBe(200);
    expect(primaryCalls).toBe(1);
    expect(fallbackCalls).toBe(1);
  });

  test("fetchHtmlWithRetry does not retry non-transient failures", async () => {
    let calls = 0;
    __testUtils.setHttpGetForTests(async () => {
      calls += 1;
      throw makeAxiosError(404, "ERR_BAD_REQUEST");
    });

    await expect(__testUtils.fetchHtmlWithRetry(new URL("https://example.com"))).rejects.toBeDefined();
    expect(calls).toBe(1);
  });

  test("fetchHtmlSafely follows redirect chain and returns final html", async () => {
    let calls = 0;
    __testUtils.setHttpGetForTests(async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ...makeResponse(301, ""),
          headers: { location: "https://example.com/final", "content-type": "text/html" },
        } as AxiosResponse<string>;
      }
      return makeResponse(200, "<html><body>ok</body></html>");
    });

    const result = await __testUtils.fetchHtmlSafely(new URL("https://example.com/start"));
    expect(result.finalUrl.toString()).toBe("https://example.com/final");
    expect(result.html).toContain("ok");
  });

  test("fetchHtmlSafely rejects non-html content type", async () => {
    __testUtils.setHttpGetForTests(async () => makeResponse(200, "{}", "application/json"));
    await expect(__testUtils.fetchHtmlSafely(new URL("https://example.com"))).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  test("fetchHtmlSafely rejects invalid redirect response and redirect loops", async () => {
    __testUtils.setHttpGetForTests(async () => ({
      ...makeResponse(302, ""),
      headers: { "content-type": "text/html" },
    }));
    await expect(__testUtils.fetchHtmlSafely(new URL("https://example.com"))).rejects.toMatchObject({
      statusCode: 400,
    });

    let calls = 0;
    __testUtils.setHttpGetForTests(async () => {
      calls += 1;
      return {
        ...makeResponse(302, ""),
        headers: { location: "https://example.com/loop", "content-type": "text/html" },
      } as AxiosResponse<string>;
    });
    await expect(__testUtils.fetchHtmlSafely(new URL("https://example.com/loop"))).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(calls).toBeGreaterThan(5);
  });

  test("extractRecipe parses JSON-LD without DOM fallback and caches result", async () => {
    let calls = 0;
    __testUtils.setHttpGetForTests(async () => {
      calls += 1;
      return makeResponse(
        200,
        `<html><body><script type="application/ld+json">{"@type":"Recipe","name":"Cake","recipeIngredient":["Sugar"],"recipeInstructions":[{"@type":"HowToStep","text":"Bake"}]}</script></body></html>`
      );
    });

    const first = await extractRecipe("https://example.com/cake");
    const second = await extractRecipe("https://example.com/cake");

    expect(first.title).toBe("Cake");
    expect(first.ingredients).toEqual(["Sugar"]);
    expect(second.title).toBe("Cake");
    expect(calls).toBe(1);
  });

  test("extractRecipeWithDiagnostics returns parser and fetch metadata", async () => {
    __testUtils.setHttpGetForTests(async () =>
      makeResponse(
        200,
        `<html><body><script type="application/ld+json">{"@type":"Recipe","name":"Cake","recipeIngredient":["Sugar"],"recipeInstructions":[{"@type":"HowToStep","text":"Bake"}]}</script></body></html>`
      )
    );

    const { recipe, diagnostics } = await extractRecipeWithDiagnostics("https://example.com/cake-diagnostics");
    expect(recipe.title).toBe("Cake");
    expect(diagnostics.parserPath).toBe("json-ld");
    expect(diagnostics.fetchProfile).toBe("primary");
    expect(diagnostics.finalUrl).toBe("https://example.com/cake-diagnostics");
  });

  test("extractRecipe falls back to microdata when JSON-LD is malformed", async () => {
    __testUtils.setHttpGetForTests(async () =>
      makeResponse(
        200,
        `<html><body>
          <script type="application/ld+json">{invalid json</script>
          <div itemscope itemtype="https://schema.org/Recipe">
            <span itemprop="name">Soup</span>
            <span itemprop="recipeIngredient">Water</span>
            <span itemprop="recipeIngredient">Salt</span>
            <div itemprop="recipeInstructions"><p>Boil</p></div>
          </div>
        </body></html>`
      )
    );

    const recipe = await extractRecipe("https://example.com/soup");
    expect(recipe.title).toBe("Soup");
    expect(recipe.ingredients).toEqual(["Water", "Salt"]);
    expect(recipe.instructions).toEqual(["Boil"]);
  });

  test("extractRecipe returns 422 when no recipe schema is found", async () => {
    __testUtils.setHttpGetForTests(async () => makeResponse(200, "<html><body>No schema</body></html>"));
    await expect(extractRecipe("https://example.com/none")).rejects.toMatchObject({ statusCode: 422 });
  });

  test("extractRecipe maps unknown failures to 500", async () => {
    __testUtils.setHttpGetForTests(async () => {
      throw new Error("boom");
    });
    await expect(extractRecipe("https://example.com/fail")).rejects.toMatchObject({ statusCode: 500 });
  });

  test("extractRecipe maps network timeout and upstream status failures", async () => {
    __testUtils.setHttpGetForTests(async () => {
      throw makeAxiosError(undefined, "ECONNABORTED");
    });
    await expect(extractRecipe("https://timeout.example.com/timeout")).rejects.toMatchObject({ statusCode: 504 });

    __testUtils.setHttpGetForTests(async () => {
      throw makeAxiosError(403, "ERR_BAD_REQUEST");
    });
    await expect(extractRecipe("https://blocked.example.com/blocked")).rejects.toMatchObject({ statusCode: 403 });

    __testUtils.setHttpGetForTests(async () => {
      throw makeAxiosError(404, "ERR_BAD_REQUEST");
    });
    await expect(extractRecipe("https://notfound.example.com/notfound")).rejects.toMatchObject({ statusCode: 422 });

    __testUtils.setHttpGetForTests(async () => {
      throw makeAxiosError(500, "ERR_BAD_RESPONSE");
    });
    await expect(extractRecipe("https://upstream.example.com/upstream")).rejects.toMatchObject({ statusCode: 502 });
  });

  test("extractRecipe rejects malformed input early", async () => {
    await expect(extractRecipe("" as unknown as string)).rejects.toBeInstanceOf(RecipeExtractionError);
    await expect(extractRecipe("javascript:alert(1)")).rejects.toMatchObject({ statusCode: 400 });
  });

  test("extractRecipe applies short negative cache for repeated URL failures", async () => {
    let calls = 0;
    __testUtils.setHttpGetForTests(async () => {
      calls += 1;
      throw makeAxiosError(404, "ERR_BAD_REQUEST");
    });
    await expect(extractRecipe("https://negative-cache.example.com/notfound")).rejects.toMatchObject({
      statusCode: 422,
    });

    // Swap to success, but the same URL should still fail from negative cache.
    __testUtils.setHttpGetForTests(async () => {
      calls += 1;
      return makeResponse(200, "<html><body>ok</body></html>");
    });
    await expect(extractRecipe("https://negative-cache.example.com/notfound")).rejects.toMatchObject({
      statusCode: 422,
    });
    expect(calls).toBe(1);
  });

  test("extractRecipe applies per-domain cooldown after repeated 403s", async () => {
    let calls = 0;
    __testUtils.setHttpGetForTests(async () => {
      calls += 1;
      if (calls <= 2) {
        throw makeAxiosError(403, "ERR_BAD_REQUEST");
      }
      return makeResponse(200, "<html><body>ok</body></html>");
    });
    __testUtils.setFallbackHttpGetForTests(async () => {
      throw makeAxiosError(403, "ERR_BAD_REQUEST");
    });
    await expect(extractRecipe("https://blocked-cooldown.example.com/one")).rejects.toMatchObject({
      statusCode: 403,
    });

    await expect(extractRecipe("https://blocked-cooldown.example.com/two")).rejects.toMatchObject({
      statusCode: 403,
    });
    // Third request should fail fast from cooldown (no third network call).
    await expect(extractRecipe("https://blocked-cooldown.example.com/three")).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(calls).toBe(2);
  });
});
