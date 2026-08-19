import { describe, expect, it } from "vitest";
import { calculateBMR, calculateDayTypeMacros, calculateMacros, calculateTDEE, calculateTarget, activityMultiplier } from "./tdee";

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

describe("calculateDayTypeMacros (FR-CALC-4, D-019)", () => {
  it("matches calculateMacros exactly when there's plenty of room (no floor hit)", () => {
    const plain = calculateMacros({ target_kcal: 2000, weight_kg: 80, goal: "lose" });
    const dayType = calculateDayTypeMacros({ target_kcal: 2000, weight_kg: 80, goal: "lose" });
    expect(dayType.hit_floor).toBe(false);
    expect(dayType.protein_g).toBe(plain.protein_g);
    expect(dayType.fat_g).toBe(plain.fat_g);
    expect(dayType.carb_g).toBe(plain.carb_g);
  });

  it("sends a full surplus (hard day) entirely to carb, protein/fat unaffected", () => {
    const result = calculateDayTypeMacros({ target_kcal: 3000, weight_kg: 80, goal: "maintain" });
    expect(result.hit_floor).toBe(false);
    expect(result.protein_g).toBe(128); // 1.6 g/kg * 80kg, unaffected by the day-type target
    expect(result.fat_g).toBe(83); // still ~25% of the (higher) target
    expect(Math.abs(result.total_kcal - 3000)).toBeLessThanOrEqual(5);
  });

  it("pins carb at its floor when the default split would go below it, without touching fat", () => {
    // fat floor overridden artificially low so only the carb-floor branch is exercised
    const result = calculateDayTypeMacros({
      target_kcal: 1000,
      weight_kg: 80,
      goal: "lose",
      fat_floor_g_per_kg: 0.1,
      fat_floor_pct: 0.05,
    });
    expect(result.hit_floor).toBe(false);
    expect(result.protein_g).toBe(160); // 2.0 g/kg * 80kg
    expect(result.carb_g).toBe(50); // carb_floor_g default
    expect(result.fat_g).toBe(18); // absorbed the rest once carb was pinned at its floor
  });

  it("hits both floors on an extreme deficit and lets total_kcal diverge from target_kcal instead of going below either floor", () => {
    const result = calculateDayTypeMacros({ target_kcal: 900, weight_kg: 80, goal: "lose" });
    expect(result.hit_floor).toBe(true);
    expect(result.protein_g).toBe(160);
    expect(result.carb_g).toBe(50); // carb floor: max(50g, 10% * 900 / 4 = 22.5g)
    expect(result.fat_g).toBe(40); // fat floor: max(0.5g/kg * 80kg = 40g, 20% * 900 / 9 = 20g)
    expect(result.total_kcal).toBe(1200); // > target_kcal — floors won over hitting the exact target
    expect(result.total_kcal).toBeGreaterThan(900);
  });

  it("never returns a negative macro, even under wildly extreme/negative targets", () => {
    const targets = [-5000, -500, 0, 200, 900, 1500, 3000, 6000];
    const weights = [40, 60, 80, 110];
    for (const target_kcal of targets) {
      for (const weight_kg of weights) {
        for (const goal of ["lose", "maintain", "gain"] as const) {
          const result = calculateDayTypeMacros({ target_kcal, weight_kg, goal });
          expect(result.protein_g).toBeGreaterThanOrEqual(0);
          expect(result.fat_g).toBeGreaterThanOrEqual(0);
          expect(result.carb_g).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("respects carb/fat floor overrides", () => {
    const result = calculateDayTypeMacros({
      target_kcal: 900,
      weight_kg: 80,
      goal: "lose",
      carb_floor_g: 100,
      fat_floor_g_per_kg: 1,
    });
    expect(result.hit_floor).toBe(true);
    expect(result.carb_g).toBe(100);
    expect(result.fat_g).toBe(80); // 1 g/kg * 80kg
  });
});
