import { describe, expect, it } from "vitest";
import {
  computeDefaultMealWindows,
  computeMealTargets,
  findCurrentMeal,
  findNextMeal,
  getMealTargetView,
  resolveMealWindows,
  sumMealProgress,
} from "./mealTargets";

describe("computeDefaultMealWindows", () => {
  it("computes breakfast/lunch/dinner from wake time and sleep hours", () => {
    // wake 07:00, sleep 8h -> bedtime 23:00
    const windows = computeDefaultMealWindows("07:00", 8);
    expect(windows.breakfast).toEqual({ start: "08:00", end: "09:00" });
    expect(windows.lunch).toEqual({ start: "12:00", end: "13:00" });
    expect(windows.dinner).toEqual({ start: "17:00", end: "20:00" });
  });

  it("clamps lunch to not extend past 15:00 for a late wake time", () => {
    // wake 13:00 -> breakfast 14:00-15:00 -> lunch would be 18:00-19:00, clamped to 15:00
    const windows = computeDefaultMealWindows("13:00", 8);
    expect(windows.lunch).toEqual({ start: "15:00", end: "15:00" });
  });

  it("normalizes a raw-negative bedtime (before minute-of-day wraparound) correctly", () => {
    // wake 05:00, sleep 8h -> bedtime computes as -180 raw minutes before formatHM wraps it to 21:00
    const windows = computeDefaultMealWindows("05:00", 8);
    expect(windows.dinner).toEqual({ start: "15:00", end: "18:00" });
  });
});

describe("resolveMealWindows", () => {
  const defaults = computeDefaultMealWindows("07:00", 8);

  it("uses computed defaults when there are no overrides", () => {
    expect(resolveMealWindows(defaults, null)).toEqual(defaults);
    expect(resolveMealWindows(defaults, {})).toEqual(defaults);
  });

  it("lets an override replace just one meal's window, leaving the others as defaults", () => {
    const resolved = resolveMealWindows(defaults, { dinner: { start: "19:00", end: "21:00" } });
    expect(resolved.dinner).toEqual({ start: "19:00", end: "21:00" });
    expect(resolved.breakfast).toEqual(defaults.breakfast);
    expect(resolved.lunch).toEqual(defaults.lunch);
  });
});

describe("findCurrentMeal / findNextMeal", () => {
  const windows = computeDefaultMealWindows("07:00", 8); // breakfast 08-09, lunch 12-13, dinner 17-20

  it("finds the meal whose window contains the current time", () => {
    expect(findCurrentMeal(windows, new Date(2026, 0, 1, 8, 30))).toBe("breakfast");
    expect(findCurrentMeal(windows, new Date(2026, 0, 1, 12, 0))).toBe("lunch");
    expect(findCurrentMeal(windows, new Date(2026, 0, 1, 19, 59))).toBe("dinner");
  });

  it("returns null when the current time falls in a gap between windows", () => {
    expect(findCurrentMeal(windows, new Date(2026, 0, 1, 2, 0))).toBeNull();
    expect(findCurrentMeal(windows, new Date(2026, 0, 1, 15, 30))).toBeNull();
  });

  it("finds the next upcoming window when in a gap before it", () => {
    expect(findNextMeal(windows, new Date(2026, 0, 1, 2, 0))).toBe("breakfast");
    expect(findNextMeal(windows, new Date(2026, 0, 1, 15, 30))).toBe("dinner");
  });

  it("wraps to breakfast when every window for today has already passed", () => {
    expect(findNextMeal(windows, new Date(2026, 0, 1, 22, 0))).toBe("breakfast");
  });
});

describe("computeMealTargets", () => {
  it("splits the day target across all 4 meals by percent, snack included", () => {
    const dayTarget = { kcal: 2000, protein_g: 150, carb_g: 200, fat_g: 60 };
    const pcts = { breakfast_pct: 25, lunch_pct: 35, dinner_pct: 30, snack_pct: 10 };
    const result = computeMealTargets(dayTarget, pcts);
    expect(result.breakfast).toEqual({ kcal: 500, protein_g: 37.5, carbs_g: 50, fat_g: 15 });
    expect(result.snack).toEqual({ kcal: 200, protein_g: 15, carbs_g: 20, fat_g: 6 });
  });
});

describe("sumMealProgress", () => {
  it("sums only entries logged under the given meal", () => {
    const entries = [
      { meal: "breakfast" as const, kcal: 300, protein_g: 20, carbs_g: 30, fat_g: 10 },
      { meal: "lunch" as const, kcal: 600, protein_g: 40, carbs_g: 60, fat_g: 20 },
      { meal: "breakfast" as const, kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2 },
    ];
    expect(sumMealProgress(entries, "breakfast")).toEqual({ kcal: 400, protein_g: 25, carbs_g: 40, fat_g: 12 });
  });
});

describe("getMealTargetView", () => {
  const windows = computeDefaultMealWindows("07:00", 8);
  const targets = computeMealTargets({ kcal: 2000, protein_g: 150, carb_g: 200, fat_g: 60 }, { breakfast_pct: 25, lunch_pct: 35, dinner_pct: 30, snack_pct: 10 });

  it("returns isCurrent=true with logged totals when inside a meal window", () => {
    const entries = [{ meal: "lunch" as const, kcal: 400, protein_g: 30, carbs_g: 40, fat_g: 10 }];
    const view = getMealTargetView(windows, new Date(2026, 0, 1, 12, 30), targets, entries);
    expect(view.meal).toBe("lunch");
    expect(view.isCurrent).toBe(true);
    expect(view.logged).toEqual({ kcal: 400, protein_g: 30, carbs_g: 40, fat_g: 10 });
  });

  it("returns isCurrent=false with no logged field when in a gap between windows", () => {
    const view = getMealTargetView(windows, new Date(2026, 0, 1, 15, 30), targets, []);
    expect(view.meal).toBe("dinner");
    expect(view.isCurrent).toBe(false);
    expect(view.logged).toBeUndefined();
  });
});
