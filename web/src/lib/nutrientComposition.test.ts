import { describe, expect, it } from "vitest";
import { computeWeightComposition, sumOtherNutrients } from "./nutrientComposition";

describe("computeWeightComposition", () => {
  it("returns null when no entry has a known serving weight", () => {
    expect(computeWeightComposition([{ quantity: 1, serving_size_g: null, protein_g: 20, carbs_g: 30, fat_g: 10 }])).toBeNull();
  });

  it("computes protein/carb/fat/other from weighed entries only", () => {
    const result = computeWeightComposition([
      { quantity: 1, serving_size_g: 200, protein_g: 30, carbs_g: 20, fat_g: 10 }, // 60g accounted, 140g other
      { quantity: 2, serving_size_g: 50, protein_g: 5, carbs_g: 5, fat_g: 0 }, // 100g total, 10g accounted, 90g other
      { quantity: 1, serving_size_g: null, protein_g: 999, carbs_g: 999, fat_g: 999 }, // excluded — no known weight
    ]);
    expect(result).toEqual({ protein_g: 35, carbs_g: 25, fat_g: 10, other_g: 230, total_g: 300 });
  });

  it("clamps other_g at 0 instead of going negative on rounding edge cases", () => {
    const result = computeWeightComposition([{ quantity: 1, serving_size_g: 10, protein_g: 6, carbs_g: 3, fat_g: 3 }]);
    expect(result?.other_g).toBe(0);
  });
});

describe("sumOtherNutrients", () => {
  it("returns an empty list when no panel has any of the tracked fields", () => {
    expect(sumOtherNutrients([null, {}])).toEqual([]);
  });

  it("sums root, vitamins, and minerals fields across entries and converts to grams", () => {
    const result = sumOtherNutrients([
      { sodium_mg: 500, minerals: { calcium_mg: 200 } },
      { sodium_mg: 300, vitamins: { vitamin_d_mcg: 5 } },
    ]);
    expect(result).toEqual([
      { key: "sodium_mg", label: "โซเดียม", grams: 0.8 },
      { key: "calcium_mg", label: "แคลเซียม", grams: 0.2 },
      { key: "vitamin_d_mcg", label: "วิตามินดี", grams: 0.000005 },
    ]);
  });

  it("omits fields with zero total instead of showing a zero-width slice", () => {
    const result = sumOtherNutrients([{ sodium_mg: 100 }]);
    expect(result.map((r) => r.key)).toEqual(["sodium_mg"]);
  });

  it("never includes fiber/sugar/fat-subtype fields even if present in the panel", () => {
    const result = sumOtherNutrients([{ fiber_g: 10, sugar_g: 20, saturated_fat_g: 5, sodium_mg: 100 }]);
    expect(result.map((r) => r.key)).toEqual(["sodium_mg"]);
  });
});
