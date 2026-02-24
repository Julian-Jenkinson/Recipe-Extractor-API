import { decodeHtmlEntities, normalizeIngredients, normalizeInstructions } from "../../src/services/recipeParserService";

describe("unit/text decoding", () => {
  test("decodes named entities", () => {
    expect(decodeHtmlEntities("A &amp; B &quot;ok&quot; &apos;yes&apos;"))
      .toBe("A & B \"ok\" 'yes'");
  });

  test("decodes numeric entities", () => {
    expect(decodeHtmlEntities("Fish &#38; Chips")).toBe("Fish & Chips");
    expect(decodeHtmlEntities("Hex &#x26; test")).toBe("Hex & test");
  });

  test("keeps unknown or invalid entities unchanged", () => {
    expect(decodeHtmlEntities("hello &unknown; world")).toBe("hello &unknown; world");
    expect(decodeHtmlEntities("bad &#xzz; entity")).toBe("bad &#xzz; entity");
  });

  test("normalizers return decoded strings", () => {
    expect(normalizeIngredients(["Salt &amp; Pepper"]))
      .toEqual(["Salt & Pepper"]);
    expect(normalizeInstructions(["Mix &amp; stir"]))
      .toEqual(["Mix & stir"]);
  });

  test("collapses duplicate schema parentheses artifacts", () => {
    expect(normalizeIngredients(["1 onion ((8.8 oz, 250 g))"]))
      .toEqual(["1 onion (8.8 oz, 250 g)"]);
    expect(normalizeInstructions(["Use 8 pieces ((or green beans))"]))
      .toEqual(["Use 8 pieces (or green beans)"]);
  });
});
