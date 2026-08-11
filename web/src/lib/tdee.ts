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
