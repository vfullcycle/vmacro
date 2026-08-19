import { calculateAge } from "./age";
import { calculateBMR, calculateDayTypeMacros, calculateMacros, calculateTDEE, calculateTarget, DEFAULT_DAY_TYPE_ALLOWANCE_KCAL } from "./tdee";
import type { ActivityLevel, DayType, Formula, Goal, Sex } from "./tdee";

export interface PreviewInput {
  formula: Formula;
  sex: Sex;
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  body_fat_pct?: number | null;
  activity_level: ActivityLevel;
  goal: Goal;
  protein_g_per_kg?: number | null;
  fat_pct?: number | null;
}

// Composes the pure tdee.ts functions with calculateAge (which depends on "now",
// so it stays out of tdee.ts to keep that module fully pure/deterministic).
export function computeFullPreview(input: PreviewInput) {
  const age = calculateAge(input.birth_date);
  const bmrResult = calculateBMR({
    formula: input.formula,
    sex: input.sex,
    age,
    height_cm: input.height_cm,
    weight_kg: input.weight_kg,
    body_fat_pct: input.body_fat_pct,
  });
  const tdee = calculateTDEE(bmrResult.bmr, input.activity_level);
  const target = calculateTarget({ tdee, goal: input.goal });
  const macros = calculateMacros({
    target_kcal: target.target_kcal,
    weight_kg: input.weight_kg,
    goal: input.goal,
    protein_g_per_kg: input.protein_g_per_kg ?? undefined,
    fat_pct: input.fat_pct ?? undefined,
  });
  return { age, bmrResult, tdee, target, macros };
}

export interface DayTypePreviewInput extends PreviewInput {
  day_type: DayType;
  day_type_allowance_kcal?: Partial<Record<DayType, number>>;
  carb_floor_g?: number | null;
  carb_floor_pct?: number | null;
  fat_floor_g_per_kg?: number | null;
  fat_floor_pct?: number | null;
}

// Same BMR/TDEE/goal-adjusted-target pipeline as computeFullPreview, plus the day-type
// allowance layered on top (D-019, FR-CALC-4) — rest day with no overrides reproduces
// computeFullPreview's macros exactly, since the default rest allowance is 0.
export function computeDayTypePreview(input: DayTypePreviewInput) {
  const base = computeFullPreview(input);
  const allowance_kcal = input.day_type_allowance_kcal?.[input.day_type] ?? DEFAULT_DAY_TYPE_ALLOWANCE_KCAL[input.day_type];
  const day_target_kcal = base.target.target_kcal + allowance_kcal;
  const dayTypeMacros = calculateDayTypeMacros({
    target_kcal: day_target_kcal,
    weight_kg: input.weight_kg,
    goal: input.goal,
    protein_g_per_kg: input.protein_g_per_kg ?? undefined,
    fat_pct: input.fat_pct ?? undefined,
    carb_floor_g: input.carb_floor_g ?? undefined,
    carb_floor_pct: input.carb_floor_pct ?? undefined,
    fat_floor_g_per_kg: input.fat_floor_g_per_kg ?? undefined,
    fat_floor_pct: input.fat_floor_pct ?? undefined,
  });
  return { ...base, day_type: input.day_type, allowance_kcal, day_target_kcal, dayTypeMacros };
}
