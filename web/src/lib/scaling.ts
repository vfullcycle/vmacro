// Scales a food's macro + full nutrient panel from its base serving to an
// arbitrary quantity — either a multiple of servings, or a target weight in
// grams (rule of three). Shared by food search, dish builder, and diary
// logging (FR-FOOD-1, FR-FOOD-3, FR-DIARY-1).

export interface NutrientPanel {
  [key: string]: number | NutrientPanel;
}

export interface ScalableNutrients {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients?: NutrientPanel | null;
}

export type QuantityMode = "servings" | "grams";

export interface ScaleInput {
  base: ScalableNutrients;
  /** grams represented by one base serving; null if the source only gives a non-gram unit (e.g. FatSecret oz/ml) */
  baseServingGrams: number | null;
  quantityMode: QuantityMode;
  /** serving count when quantityMode is "servings", grams when "grams" */
  quantityValue: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function scalePanel(panel: NutrientPanel, factor: number): NutrientPanel {
  const result: NutrientPanel = {};
  for (const [key, value] of Object.entries(panel)) {
    result[key] = typeof value === "number" ? round1(value * factor) : scalePanel(value, factor);
  }
  return result;
}

export function scaleFactorFor(input: Pick<ScaleInput, "baseServingGrams" | "quantityMode" | "quantityValue">): number {
  if (input.quantityMode === "servings") {
    return input.quantityValue;
  }
  if (!input.baseServingGrams) {
    throw new Error("ไม่สามารถระบุปริมาณเป็นกรัมได้ — ไม่รู้น้ำหนัก serving ต้นทาง (หน่วยไม่ใช่กรัม)");
  }
  return input.quantityValue / input.baseServingGrams;
}

export function scaleNutrients(input: ScaleInput): ScalableNutrients {
  const factor = scaleFactorFor(input);
  return {
    kcal: round1(input.base.kcal * factor),
    protein_g: round1(input.base.protein_g * factor),
    carbs_g: round1(input.base.carbs_g * factor),
    fat_g: round1(input.base.fat_g * factor),
    nutrients: input.base.nutrients ? scalePanel(input.base.nutrients, factor) : null,
  };
}
