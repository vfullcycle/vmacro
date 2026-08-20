import type { NutrientPanel } from "./scaling";

export interface WeightedEntry {
  quantity: number;
  serving_size_g: number | null;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface WeightComposition {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  other_g: number;
  total_g: number;
}

// Only entries with a known real serving weight count — quick-add and any other
// source without serving_size_g has no basis for a physical weight, so mixing them in
// would make other_g meaningless (could go negative or overstate composition) —
// FR-DASH-1 amendment, 2026-08-20.
export function computeWeightComposition(entries: WeightedEntry[]): WeightComposition | null {
  const weighed = entries.filter((e) => e.serving_size_g != null);
  if (weighed.length === 0) return null;

  const totals = weighed.reduce(
    (acc, e) => {
      const grams = e.quantity * (e.serving_size_g as number);
      return {
        total_g: acc.total_g + grams,
        protein_g: acc.protein_g + e.protein_g,
        carbs_g: acc.carbs_g + e.carbs_g,
        fat_g: acc.fat_g + e.fat_g,
      };
    },
    { total_g: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  const other_g = Math.max(0, totals.total_g - totals.protein_g - totals.carbs_g - totals.fat_g);
  return { protein_g: totals.protein_g, carbs_g: totals.carbs_g, fat_g: totals.fat_g, other_g, total_g: totals.total_g };
}

interface OtherNutrientField {
  key: string;
  label: string;
  group: "root" | "vitamins" | "minerals";
  divisor: number; // converts the field's stored unit to grams
}

// Deliberately excludes fiber/sugar (already counted inside carbs_g) and
// saturated/trans/poly/mono fat (already counted inside fat_g) to avoid double-counting
// mass that's already represented in the P/F/C composition ring.
const OTHER_NUTRIENT_FIELDS: OtherNutrientField[] = [
  { key: "sodium_mg", label: "โซเดียม", group: "root", divisor: 1000 },
  { key: "cholesterol_mg", label: "คอเลสเตอรอล", group: "root", divisor: 1000 },
  { key: "potassium_mg", label: "โพแทสเซียม", group: "minerals", divisor: 1000 },
  { key: "calcium_mg", label: "แคลเซียม", group: "minerals", divisor: 1000 },
  { key: "iron_mg", label: "ธาตุเหล็ก", group: "minerals", divisor: 1000 },
  { key: "vitamin_c_mg", label: "วิตามินซี", group: "vitamins", divisor: 1000 },
  { key: "vitamin_d_mcg", label: "วิตามินดี", group: "vitamins", divisor: 1_000_000 },
];

export interface OtherNutrientTotal {
  key: string;
  label: string;
  grams: number;
}

function panelFor(nutrients: NutrientPanel, group: OtherNutrientField["group"]): NutrientPanel | null {
  if (group === "root") return nutrients;
  const nested = nutrients[group];
  return typeof nested === "object" && nested !== null ? (nested as NutrientPanel) : null;
}

// Sums each non-overlapping nutrient across a day's entries and converts to a common
// unit (grams) so they can be shown as slices of one ring — a field with no data in any
// entry is omitted rather than shown as a zero-width slice.
export function sumOtherNutrients(nutrientPanels: (NutrientPanel | null)[]): OtherNutrientTotal[] {
  const totals: OtherNutrientTotal[] = [];
  for (const field of OTHER_NUTRIENT_FIELDS) {
    let sum = 0;
    for (const panel of nutrientPanels) {
      if (!panel) continue;
      const scoped = panelFor(panel, field.group);
      const value = scoped?.[field.key];
      if (typeof value === "number") sum += value;
    }
    if (sum > 0) totals.push({ key: field.key, label: field.label, grams: sum / field.divisor });
  }
  return totals;
}
