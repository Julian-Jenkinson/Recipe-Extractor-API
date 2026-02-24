import { parseIngredientDetail, parseIngredientDetails } from "../../src/services/ingredientDetailParser";

describe("unit/ingredient detail parsing", () => {
  test("parses quantity and canonical unit", () => {
    const parsed = parseIngredientDetail("1 1/2 tablespoons olive oil");
    expect(parsed.raw).toBe("1 1/2 tablespoons olive oil");
    expect(parsed.quantity).toBeCloseTo(1.5);
    expect(parsed.unit).toBe("tbsp");
    expect(parsed.unitOriginal?.toLowerCase()).toBe("tablespoons");
    expect(parsed.ingredient).toBe("olive oil");
  });

  test("captures optional and alternatives notes", () => {
    const parsed = parseIngredientDetail("8 pieces snow peas ((or use green beans or green peas)) optional");
    expect(parsed.optional).toBe(true);
    expect(parsed.alternatives).toContain("use green beans or green peas");
    expect(parsed.ingredient).toContain("snow peas");
    expect(parsed.notes).toContain("or use green beans or green peas");
  });

  test("keeps fallback values for freeform ingredients", () => {
    const parsed = parseIngredientDetail("salt to taste");
    expect(parsed.raw).toBe("salt to taste");
    expect(parsed.ingredient).toBe("salt to taste");
    expect(parsed.unit).toBeUndefined();
  });

  test("parses list in order", () => {
    const details = parseIngredientDetails(["2 cups flour", "1 tsp salt"]);
    expect(details).toHaveLength(2);
    expect(details[0].unit).toBe("cup");
    expect(details[1].unit).toBe("tsp");
  });

  test("parses quantity ranges and keeps clean ingredient", () => {
    const parsed = parseIngredientDetail("3-4 tablespoons cream ( 45-60 ml )");
    expect(parsed.quantity).toBe(3);
    expect(parsed.quantityMax).toBe(4);
    expect(parsed.unit).toBe("tbsp");
    expect(parsed.ingredient).toBe("cream");
  });

  test("parses fraction ranges and simple fractions", () => {
    const range = parseIngredientDetail("1/2-3/4 cup milk");
    expect(range.quantity).toBeCloseTo(0.5);
    expect(range.quantityMax).toBeCloseTo(0.75);
    expect(range.unit).toBe("cup");
    expect(range.ingredient).toBe("milk");

    const single = parseIngredientDetail("3/4 tsp salt");
    expect(single.quantity).toBeCloseTo(0.75);
    expect(single.quantityMax).toBeUndefined();
    expect(single.unit).toBe("tsp");
    expect(single.ingredient).toBe("salt");
  });

  test("parses mixed unicode fractions and cleans ingredient text", () => {
    const parsed = parseIngredientDetail("1 & ½ inch ginger ( 15 grams , roughly chopped)");
    expect(parsed.quantity).toBeCloseTo(1.5);
    expect(parsed.ingredient).toBe("inch ginger");
    expect(parsed.preparation).toBeUndefined();
    expect(parsed.notes).toBe("15 grams, roughly chopped");
  });

  test("handles empty/freeform fallback confidence", () => {
    const parsed = parseIngredientDetail("");
    expect(parsed.raw).toBe("");
    expect(parsed.quantity).toBeUndefined();
    expect(parsed.unit).toBeUndefined();
    expect(parsed.ingredient).toBeUndefined();
    expect(parsed.confidence).toBe(0.2);
  });

  test("captures parenthetical notes without brackets", () => {
    const parsed = parseIngredientDetail("10-15 whole cashews (raw)");
    expect(parsed.ingredient).toBe("whole cashews");
    expect(parsed.notes).toBe("raw");
  });
});
