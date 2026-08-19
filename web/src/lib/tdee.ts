// TDEE & macro engine — pure functions, no I/O (FR-CALC-1/2/3)

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "extra_active";
export type Goal = "lose" | "maintain" | "gain";
export type Formula = "mifflin" | "katch_mcardle" | "harris_benedict";

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  extra_active: 1.9,
};

const DEFAULT_PROTEIN_G_PER_KG: Record<Goal, number> = {
  lose: 2.0,
  maintain: 1.6,
  gain: 1.8,
};

const DEFAULT_ADJUSTMENT_KCAL: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

const DEFAULT_FAT_PCT = 0.25;
const KCAL_PER_KG_BODY_FAT = 7700;

export interface BmrInput {
  formula: Formula;
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  body_fat_pct?: number | null;
}

export interface BmrResult {
  bmr: number;
  formula_used: Formula;
  fallback_applied: boolean;
}

export function calculateBMR(input: BmrInput): BmrResult {
  const { sex, age, height_cm, weight_kg, body_fat_pct } = input;
  let formula = input.formula;
  let fallback_applied = false;

  if (formula === "katch_mcardle" && (body_fat_pct === null || body_fat_pct === undefined)) {
    formula = "mifflin";
    fallback_applied = true;
  }

  if (formula === "mifflin") {
    const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
    return { bmr: sex === "male" ? base + 5 : base - 161, formula_used: formula, fallback_applied };
  }

  if (formula === "katch_mcardle") {
    const lbm_kg = weight_kg * (1 - (body_fat_pct as number) / 100);
    return { bmr: 370 + 21.6 * lbm_kg, formula_used: formula, fallback_applied };
  }

  // harris_benedict (revised, Roza & Shizgal 1984)
  const bmr =
    sex === "male"
      ? 88.362 + 13.397 * weight_kg + 4.799 * height_cm - 5.677 * age
      : 447.593 + 9.247 * weight_kg + 3.098 * height_cm - 4.33 * age;
  return { bmr, formula_used: formula, fallback_applied };
}

export function activityMultiplier(level: ActivityLevel): number {
  return ACTIVITY_MULTIPLIER[level];
}

export function calculateTDEE(bmr: number, level: ActivityLevel): number {
  return bmr * activityMultiplier(level);
}

export interface TargetInput {
  tdee: number;
  goal: Goal;
  adjustment_kcal?: number;
}

export interface TargetResult {
  target_kcal: number;
  weekly_rate_kg: number;
}

export function calculateTarget(input: TargetInput): TargetResult {
  const adjustment = input.adjustment_kcal ?? DEFAULT_ADJUSTMENT_KCAL[input.goal];
  const target_kcal = Math.round(input.tdee + adjustment);
  const weekly_rate_kg = (adjustment * 7) / KCAL_PER_KG_BODY_FAT;
  return { target_kcal, weekly_rate_kg };
}

export interface MacroInput {
  target_kcal: number;
  weight_kg: number;
  goal: Goal;
  protein_g_per_kg?: number;
  fat_pct?: number;
}

export interface MacroResult {
  protein_g: number;
  fat_g: number;
  carb_g: number;
  total_kcal: number;
}

export function calculateMacros(input: MacroInput): MacroResult {
  const protein_g_per_kg = input.protein_g_per_kg ?? DEFAULT_PROTEIN_G_PER_KG[input.goal];
  const fat_pct = input.fat_pct ?? DEFAULT_FAT_PCT;

  const protein_g = Math.round(protein_g_per_kg * input.weight_kg);
  const fat_g = Math.round((input.target_kcal * fat_pct) / 9);

  // carb absorbs the rounding remainder so total_kcal stays within the AC's ±5 kcal tolerance
  const carb_kcal = input.target_kcal - protein_g * 4 - fat_g * 9;
  const carb_g = Math.round(carb_kcal / 4);

  const total_kcal = protein_g * 4 + fat_g * 9 + carb_g * 4;
  return { protein_g, fat_g, carb_g, total_kcal };
}

// Day-type energy target (D-019, FR-CALC-4) — layers a per-day allowance on top of the
// existing goal-adjusted target. rest day defaults to +0 kcal, so a profile that never
// picks a day type behaves exactly like calculateMacros did before this existed.
export type DayType = "rest" | "light" | "hard";

export const DEFAULT_DAY_TYPE_ALLOWANCE_KCAL: Record<DayType, number> = {
  rest: 0,
  light: 250,
  hard: 500,
};

export const DEFAULT_CARB_FLOOR_G = 50;
export const DEFAULT_CARB_FLOOR_PCT = 0.1;
export const DEFAULT_FAT_FLOOR_G_PER_KG = 0.5;
export const DEFAULT_FAT_FLOOR_PCT = 0.2;

export interface DayTypeMacroInput {
  target_kcal: number; // baseline TDEE + goal adjustment + day-type allowance, already combined by the caller
  weight_kg: number;
  goal: Goal;
  protein_g_per_kg?: number;
  fat_pct?: number;
  carb_floor_g?: number;
  carb_floor_pct?: number;
  fat_floor_g_per_kg?: number;
  fat_floor_pct?: number;
}

export interface DayTypeMacroResult extends MacroResult {
  // true when both floors were hit and total_kcal had to diverge from target_kcal to honor them
  hit_floor: boolean;
}

// Priority order per FR-CALC-4: protein is always fixed. carb absorbs the day-type
// allowance first (up or down) down to its floor; only once carb is pinned at its floor
// does fat give any further ground, down to its own floor. If both floors are hit, the
// ±5kcal tolerance from calculateMacros no longer holds — total_kcal becomes the real
// sum of the floors instead of target_kcal, and the caller should surface that as a
// warning (compare the returned total_kcal against the target_kcal it passed in).
export function calculateDayTypeMacros(input: DayTypeMacroInput): DayTypeMacroResult {
  const protein_g_per_kg = input.protein_g_per_kg ?? DEFAULT_PROTEIN_G_PER_KG[input.goal];
  const fat_pct = input.fat_pct ?? DEFAULT_FAT_PCT;

  const carb_floor_g = Math.max(
    input.carb_floor_g ?? DEFAULT_CARB_FLOOR_G,
    ((input.carb_floor_pct ?? DEFAULT_CARB_FLOOR_PCT) * input.target_kcal) / 4,
  );
  const fat_floor_g = Math.max(
    (input.fat_floor_g_per_kg ?? DEFAULT_FAT_FLOOR_G_PER_KG) * input.weight_kg,
    ((input.fat_floor_pct ?? DEFAULT_FAT_FLOOR_PCT) * input.target_kcal) / 9,
  );

  const protein_g = Math.round(protein_g_per_kg * input.weight_kg);
  const protein_kcal = protein_g * 4;

  const fat_default_g = Math.round((fat_pct * input.target_kcal) / 9);
  const carb_naive_g = Math.round((input.target_kcal - protein_kcal - fat_default_g * 9) / 4);

  let fat_g: number;
  let carb_g: number;
  let hit_floor = false;

  if (carb_naive_g >= carb_floor_g) {
    // enough room at the default fat share — carb absorbs the allowance as-is (this is
    // also the path every light/hard (surplus) day takes, since there's no carb ceiling)
    fat_g = fat_default_g;
    carb_g = carb_naive_g;
  } else {
    carb_g = Math.round(carb_floor_g);
    const fat_g_needed = Math.round((input.target_kcal - protein_kcal - carb_g * 4) / 9);
    if (fat_g_needed >= fat_floor_g) {
      fat_g = fat_g_needed;
    } else {
      // both floors hit — stop shrinking further and let the total diverge from target_kcal
      fat_g = Math.round(fat_floor_g);
      hit_floor = true;
    }
  }

  fat_g = Math.max(fat_g, 0);
  carb_g = Math.max(carb_g, 0);

  const total_kcal = protein_g * 4 + fat_g * 9 + carb_g * 4;
  return { protein_g, fat_g, carb_g, total_kcal, hit_floor };
}
