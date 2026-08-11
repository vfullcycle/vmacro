import { calculateAge } from "./age";
import { calculateBMR, calculateMacros, calculateTDEE, calculateTarget } from "./tdee";
import type { ActivityLevel, Formula, Goal, Sex } from "./tdee";

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
