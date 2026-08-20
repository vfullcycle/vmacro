import { describe, expect, it } from "vitest";
import { computeNutrientComposition, sumOtherNutrients } from "./nutrientComposition";

describe("computeNutrientComposition", () => {
  it("returns null when there is no macro or other-nutrient data at all", () => {
    expect(computeNutrientComposition([], [])).toBeNull();
  });

  it("sums protein/carb/fat across all entries regardless of serving weight", () => {
    const result = computeNutrientComposition(
      [
        { protein_g: 18, carbs_g: 63, fat_g: 16 },
        { protein_g: 5, carbs_g: 5, fat_g: 0 },
      ],
      [],
    );
    expect(result).toEqual({ protein_g: 23, carbs_g: 68, fat_g: 16, other_g: 0 });
  });

  it("uses the already-converted other-nutrient total as the OTH slice, not a weight subtraction", () => {
    const result = computeNutrientComposition(
      [{ protein_g: 18, carbs_g: 63, fat_g: 16 }],
      [
        { key: "sodium_mg", label: "โซเดียม", grams: 0.85 },
        { key: "potassium_mg", label: "โพแทสเซียม", grams: 0.43 },
      ],
    );
    expect(result).toEqual({ protein_g: 18, carbs_g: 63, fat_g: 16, other_g: 1.28 });
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
