import { describe, expect, it } from "vitest";
import { parseFoodDetail, parseSearchResults, servingToScalable } from "./fatsecret";

describe("parseSearchResults", () => {
  it("normalizes a single result (FatSecret returns a bare object, not an array)", () => {
    const raw = { foods: { food: { food_id: "1", food_name: "Chicken Breast" } } };
    expect(parseSearchResults(raw)).toEqual([{ food_id: "1", food_name: "Chicken Breast" }]);
  });

  it("passes through multiple results already given as an array", () => {
    const raw = { foods: { food: [{ food_id: "1" }, { food_id: "2" }] } };
    expect(parseSearchResults(raw)).toHaveLength(2);
  });

  it("returns an empty array when there are no results", () => {
    expect(parseSearchResults({ foods: { food: undefined } })).toEqual([]);
  });
});

describe("parseFoodDetail", () => {
  it("normalizes a food with a single serving (bare object)", () => {
    const raw = {
      food: {
        food_id: "1641",
        food_name: "Chicken Breast",
        food_type: "Generic",
        servings: { serving: { serving_id: "1", calories: "197" } },
      },
    };
    const result = parseFoodDetail(raw);
    expect(result?.servings).toHaveLength(1);
    expect(result?.servings[0].calories).toBe("197");
  });

  it("normalizes a food with multiple servings (array)", () => {
    const raw = {
      food: {
        food_id: "1641",
        food_name: "Chicken Breast",
        food_type: "Generic",
        servings: { serving: [{ serving_id: "1" }, { serving_id: "2" }] },
      },
    };
    expect(parseFoodDetail(raw)?.servings).toHaveLength(2);
  });

  it("returns null when there's no food in the response", () => {
    expect(parseFoodDetail({})).toBeNull();
  });
});

describe("servingToScalable", () => {
  it("maps FatSecret string fields into numeric macro + nutrient panel", () => {
    const { base, baseServingGrams } = servingToScalable({
      serving_id: "1",
      serving_description: "100 g",
      metric_serving_amount: "100",
      metric_serving_unit: "g",
      calories: "197",
      carbohydrate: "0",
      protein: "29.8",
      fat: "7.79",
      fiber: "0",
      sodium: "74",
      vitamin_a: "0",
      calcium: "12",
    });

    expect(baseServingGrams).toBe(100);
    expect(base.kcal).toBe(197);
    expect(base.protein_g).toBe(29.8);
    expect(base.nutrients.sodium_mg).toBe(74);
    expect((base.nutrients.minerals as Record<string, number>).calcium_mg).toBe(12);
  });

  it("leaves baseServingGrams null when the metric unit isn't grams", () => {
    const { baseServingGrams } = servingToScalable({
      serving_id: "1",
      serving_description: "1 cup",
      metric_serving_amount: "240",
      metric_serving_unit: "ml",
      calories: "50",
      carbohydrate: "10",
      protein: "1",
      fat: "0",
    });
    expect(baseServingGrams).toBeNull();
  });

  it("omits nutrient keys the source didn't provide rather than defaulting to 0", () => {
    const { base } = servingToScalable({
      serving_id: "1",
      serving_description: "100 g",
      calories: "100",
      carbohydrate: "20",
      protein: "5",
      fat: "1",
    });
    expect(base.nutrients).toEqual({});
  });
});
