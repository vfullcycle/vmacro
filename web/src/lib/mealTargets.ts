import type { Meal } from "./diary";

export type MealWithWindow = "breakfast" | "lunch" | "dinner";
const MEALS_WITH_WINDOW: MealWithWindow[] = ["breakfast", "lunch", "dinner"];

export interface TimeWindow {
  start: string; // "HH:MM"
  end: string;
}

export type MealWindows = Record<MealWithWindow, TimeWindow>;

const LUNCH_CLAMP_MINUTES = 15 * 60;

function parseHM(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatHM(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// Defaults only — every window here is overridable per meal (FR-CALC-5). Breakfast/lunch
// are the literal ranges from the design ("1-2h after waking", "4-5h after breakfast,
// not past 15:00"); dinner is a deliberately wide 3h window ending exactly 3h before
// bedtime — meal timing swings the most in real life (traffic, evening training, eating
// with others), and since the display never passes judgment, a wide window costs nothing.
export function computeDefaultMealWindows(wakeTime: string, sleepHoursTarget: number): MealWindows {
  const wake = parseHM(wakeTime);
  const bedtime = wake - sleepHoursTarget * 60;

  const breakfastStart = wake + 60;
  const breakfastEnd = wake + 120;

  let lunchStart = breakfastStart + 4 * 60;
  let lunchEnd = breakfastStart + 5 * 60;
  if (lunchEnd > LUNCH_CLAMP_MINUTES) lunchEnd = LUNCH_CLAMP_MINUTES;
  if (lunchStart > LUNCH_CLAMP_MINUTES) lunchStart = LUNCH_CLAMP_MINUTES;

  const dinnerEnd = bedtime - 3 * 60;
  const dinnerStart = bedtime - 6 * 60;

  return {
    breakfast: { start: formatHM(breakfastStart), end: formatHM(breakfastEnd) },
    lunch: { start: formatHM(lunchStart), end: formatHM(lunchEnd) },
    dinner: { start: formatHM(dinnerStart), end: formatHM(dinnerEnd) },
  };
}

// A user-set override replaces the whole window for that meal and is never recalculated
// away by a later wake_time/sleep_hours_target edit (AC 2) — only an explicit reset
// (removing the key from meal_time_overrides) goes back to the computed default.
export function resolveMealWindows(defaults: MealWindows, overrides: Partial<MealWindows> | null | undefined): MealWindows {
  return {
    breakfast: overrides?.breakfast ?? defaults.breakfast,
    lunch: overrides?.lunch ?? defaults.lunch,
    dinner: overrides?.dinner ?? defaults.dinner,
  };
}

function minutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

// null when the current time falls between windows (e.g. mid-afternoon, or the small
// gap between lunch ending and dinner starting) — the caller falls back to "next meal".
export function findCurrentMeal(windows: MealWindows, now: Date): MealWithWindow | null {
  const nowMin = minutesOfDay(now);
  for (const meal of MEALS_WITH_WINDOW) {
    const { start, end } = windows[meal];
    if (nowMin >= parseHM(start) && nowMin <= parseHM(end)) return meal;
  }
  return null;
}

// Earliest window still ahead today; wraps to breakfast if every window for today has
// already passed (e.g. it's 22:00 and dinner ended at 20:00) — there's always a "next"
// meal, it's just tomorrow's.
export function findNextMeal(windows: MealWindows, now: Date): MealWithWindow {
  const nowMin = minutesOfDay(now);
  let best: MealWithWindow | null = null;
  let bestStart = Infinity;
  for (const meal of MEALS_WITH_WINDOW) {
    const start = parseHM(windows[meal].start);
    if (start > nowMin && start < bestStart) {
      best = meal;
      bestStart = start;
    }
  }
  return best ?? "breakfast";
}

export interface MealPercents {
  breakfast_pct: number;
  lunch_pct: number;
  dinner_pct: number;
  snack_pct: number;
}

export interface MacroAmounts {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// Splits the day-type target (FR-CALC-4) across all 4 meals — snack included, even
// though it has no time window, since its % still comes out of the same day total.
export function computeMealTargets(
  dayTarget: { kcal: number; protein_g: number; carb_g: number; fat_g: number },
  pcts: MealPercents,
): Record<Meal, MacroAmounts> {
  const split = (pct: number): MacroAmounts => ({
    kcal: dayTarget.kcal * (pct / 100),
    protein_g: dayTarget.protein_g * (pct / 100),
    carbs_g: dayTarget.carb_g * (pct / 100),
    fat_g: dayTarget.fat_g * (pct / 100),
  });
  return {
    breakfast: split(pcts.breakfast_pct),
    lunch: split(pcts.lunch_pct),
    dinner: split(pcts.dinner_pct),
    snack: split(pcts.snack_pct),
  };
}

export function sumMealProgress(entries: { meal: Meal; kcal: number; protein_g: number; carbs_g: number; fat_g: number }[], meal: Meal): MacroAmounts {
  return entries
    .filter((e) => e.meal === meal)
    .reduce(
      (acc, e) => ({
        kcal: acc.kcal + e.kcal,
        protein_g: acc.protein_g + e.protein_g,
        carbs_g: acc.carbs_g + e.carbs_g,
        fat_g: acc.fat_g + e.fat_g,
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
}

export interface MealTargetView {
  meal: MealWithWindow;
  isCurrent: boolean;
  window: TimeWindow;
  target: MacroAmounts;
  logged?: MacroAmounts;
}

// The one function Diary/Dashboard actually call — combines window resolution, current-
// vs-next lookup, and progress summing into the single view the UI renders (FR-CALC-5).
export function getMealTargetView(
  windows: MealWindows,
  now: Date,
  targets: Record<Meal, MacroAmounts>,
  entries: { meal: Meal; kcal: number; protein_g: number; carbs_g: number; fat_g: number }[],
): MealTargetView {
  const current = findCurrentMeal(windows, now);
  if (current) {
    return { meal: current, isCurrent: true, window: windows[current], target: targets[current], logged: sumMealProgress(entries, current) };
  }
  const next = findNextMeal(windows, now);
  return { meal: next, isCurrent: false, window: windows[next], target: targets[next] };
}
