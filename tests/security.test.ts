import { extractRecipe, RecipeExtractionError } from "../src";

describe("security validations", () => {
  test("rejects non-http protocols", async () => {
    await expect(extractRecipe("file:///etc/passwd")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("rejects localhost targets", async () => {
    await expect(extractRecipe("http://localhost:3000/")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("rejects private IP targets", async () => {
    await expect(extractRecipe("http://192.168.1.10/recipe")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("rejects URLs with credentials", async () => {
    await expect(extractRecipe("https://user:pass@example.com/recipe")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("returns typed extraction errors for bad input", async () => {
    try {
      await extractRecipe("not-a-url");
      throw new Error("Expected extractRecipe to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(RecipeExtractionError);
      expect((error as RecipeExtractionError).statusCode).toBe(400);
    }
  });
});
