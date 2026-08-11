import { describe, expect, it } from "vitest";
import { scaleFactorFor, scaleNutrients } from "./scaling";

const BASE = { kcal: 200, protein_g: 20, carbs_g: 10, fat_g: 5 };

describe("scaleFactorFor", () => {
  it("uses the quantity directly in servings mode", () => {
    expect(scaleFactorFor({ baseServingGrams: 100, quantityMode: "servings", quantityValue: 1.5 })).toBe(1.5);
  });

  it("divides target grams by the base serving grams", () => {
    expect(scaleFactorFor({ baseServingGrams: 100, quantityMode: "grams", quantityValue: 150 })).toBe(1.5);
  });

  it("throws when scaling by grams but the base serving weight is unknown", () => {
    expect(() => scaleFactorFor({ baseServingGrams: null, quantityMode: "grams", quantityValue: 150 })).toThrow();
  });
});

describe("scaleNutrients", () => {
  it("scales macro totals by servings count", () => {
    const result = scaleNutrients({ base: BASE, baseServingGrams: 100, quantityMode: "servings", quantityValue: 1.5 });
    expect(result).toEqual({ kcal: 300, protein_g: 30, carbs_g: 15, fat_g: 7.5, nutrients: null });
  });

  it("scales macro totals by target grams (rule of three)", () => {
    // 150g of a food whose base serving is 100g -> same 1.5x factor as above
    const result = scaleNutrients({ base: BASE, baseServingGrams: 100, quantityMode: "grams", quantityValue: 150 });
    expect(result).toEqual({ kcal: 300, protein_g: 30, carbs_g: 15, fat_g: 7.5, nutrients: null });
  });

  it("scales a nested nutrient panel (vitamins/minerals) recursively", () => {
    const base = {
      ...BASE,
      nutrients: {
        fiber_g: 2,
        sodium_mg: 100,
        vitamins: { vitamin_a_mcg: 10, vitamin_c_mg: 5 },
      },
    };
    const result = scaleNutrients({ base, baseServingGrams: 100, quantityMode: "grams", quantityValue: 200 });
    expect(result.nutrients).toEqual({
      fiber_g: 4,
      sodium_mg: 200,
      vitamins: { vitamin_a_mcg: 20, vitamin_c_mg: 10 },
    });
  });

  it("returns the base values unchanged when the quantity equals one base serving", () => {
    const result = scaleNutrients({ base: BASE, baseServingGrams: 100, quantityMode: "grams", quantityValue: 100 });
    expect(result).toEqual({ ...BASE, nutrients: null });
  });
});
