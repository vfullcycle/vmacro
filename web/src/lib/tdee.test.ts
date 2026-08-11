import { describe, expect, it } from "vitest";
import { calculateBMR, calculateMacros, calculateTDEE, calculateTarget, activityMultiplier } from "./tdee";

describe("calculateBMR — mifflin", () => {
  it("male, 80kg/180cm/30y", () => {
    expect(calculateBMR({ formula: "mifflin", sex: "male", age: 30, height_cm: 180, weight_kg: 80 }).bmr).toBeCloseTo(1780, 5);
  });
  it("female, 60kg/165cm/25y", () => {
    expect(calculateBMR({ formula: "mifflin", sex: "female", age: 25, height_cm: 165, weight_kg: 60 }).bmr).toBeCloseTo(1345.25, 5);
  });
  it("female, 70kg/170cm/35y", () => {
    expect(calculateBMR({ formula: "mifflin", sex: "female", age: 35, height_cm: 170, weight_kg: 70 }).bmr).toBeCloseTo(1426.5, 5);
  });
});

describe("calculateBMR — katch_mcardle", () => {
  it("80kg, 15% body fat", () => {
    expect(
      calculateBMR({ formula: "katch_mcardle", sex: "male", age: 30, height_cm: 180, weight_kg: 80, body_fat_pct: 15 }).bmr,
    ).toBeCloseTo(1838.8, 5);
  });
  it("60kg, 25% body fat", () => {
    expect(
      calculateBMR({ formula: "katch_mcardle", sex: "female", age: 25, height_cm: 165, weight_kg: 60, body_fat_pct: 25 }).bmr,
    ).toBeCloseTo(1342, 5);
  });
  it("90kg, 20% body fat", () => {
    expect(
      calculateBMR({ formula: "katch_mcardle", sex: "male", age: 40, height_cm: 190, weight_kg: 90, body_fat_pct: 20 }).bmr,
    ).toBeCloseTo(1925.2, 5);
  });

  it("falls back to mifflin and flags it when body_fat_pct is missing", () => {
    const result = calculateBMR({ formula: "katch_mcardle", sex: "male", age: 30, height_cm: 180, weight_kg: 80 });
    expect(result.fallback_applied).toBe(true);
    expect(result.formula_used).toBe("mifflin");
    expect(result.bmr).toBeCloseTo(1780, 5);
  });
});

describe("calculateBMR — harris_benedict", () => {
  it("male, 80kg/180cm/30y", () => {
    expect(
      calculateBMR({ formula: "harris_benedict", sex: "male", age: 30, height_cm: 180, weight_kg: 80 }).bmr,
    ).toBeCloseTo(1853.632, 3);
  });
  it("female, 60kg/165cm/25y", () => {
    expect(
      calculateBMR({ formula: "harris_benedict", sex: "female", age: 25, height_cm: 165, weight_kg: 60 }).bmr,
    ).toBeCloseTo(1405.333, 3);
  });
  it("female, 70kg/170cm/35y", () => {
    expect(
      calculateBMR({ formula: "harris_benedict", sex: "female", age: 35, height_cm: 170, weight_kg: 70 }).bmr,
    ).toBeCloseTo(1469.993, 3);
  });
});

describe("activityMultiplier / calculateTDEE", () => {
  it("multiplies BMR by the activity level factor", () => {
    expect(activityMultiplier("sedentary")).toBe(1.2);
    expect(calculateTDEE(1780, "sedentary")).toBeCloseTo(2136, 5);
    expect(calculateTDEE(1780, "extra_active")).toBeCloseTo(3382, 5);
  });
});

describe("calculateTarget", () => {
  it("lose: applies default -500 kcal deficit", () => {
    const result = calculateTarget({ tdee: 2500, goal: "lose" });
    expect(result.target_kcal).toBe(2000);
    expect(result.weekly_rate_kg).toBeCloseTo(-0.4545, 3);
  });
  it("gain: applies default +300 kcal surplus", () => {
    const result = calculateTarget({ tdee: 2500, goal: "gain" });
    expect(result.target_kcal).toBe(2800);
    expect(result.weekly_rate_kg).toBeCloseTo(0.2727, 3);
  });
  it("maintain: no adjustment", () => {
    const result = calculateTarget({ tdee: 2500, goal: "maintain" });
    expect(result.target_kcal).toBe(2500);
    expect(result.weekly_rate_kg).toBe(0);
  });
  it("respects a custom adjustment override", () => {
    const result = calculateTarget({ tdee: 2500, goal: "lose", adjustment_kcal: -750 });
    expect(result.target_kcal).toBe(1750);
  });
});

describe("calculateMacros", () => {
  it("splits protein (g/kg) -> fat floor (%) -> carb remainder, summing back to target ±5 kcal", () => {
    const result = calculateMacros({ target_kcal: 2000, weight_kg: 80, goal: "lose" });
    expect(result.protein_g).toBe(160); // 2.0 g/kg * 80kg
    expect(result.fat_g).toBe(56); // round(2000*0.25/9)
    expect(Math.abs(result.total_kcal - 2000)).toBeLessThanOrEqual(5);
  });

  it("respects protein_g_per_kg and fat_pct overrides", () => {
    const result = calculateMacros({ target_kcal: 2500, weight_kg: 70, goal: "gain", protein_g_per_kg: 2.2, fat_pct: 0.3 });
    expect(result.protein_g).toBe(154); // 2.2 * 70
    expect(result.fat_g).toBe(Math.round((2500 * 0.3) / 9));
    expect(Math.abs(result.total_kcal - 2500)).toBeLessThanOrEqual(5);
  });

  it("stays within tolerance across a range of targets/weights", () => {
    const cases = [
      { target_kcal: 1500, weight_kg: 50, goal: "lose" as const },
      { target_kcal: 3200, weight_kg: 95, goal: "gain" as const },
      { target_kcal: 1800, weight_kg: 65, goal: "maintain" as const },
    ];
    for (const c of cases) {
      const result = calculateMacros(c);
      expect(Math.abs(result.total_kcal - c.target_kcal)).toBeLessThanOrEqual(5);
    }
  });
});
