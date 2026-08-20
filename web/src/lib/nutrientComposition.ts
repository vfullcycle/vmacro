import type { NutrientPanel } from "./scaling";

export interface MacroEntry {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface NutrientComposition {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  other_g: number;
}

// Deliberately does NOT use serving_size_g / total dish weight as the base — for
// custom foods (most Thai dishes in this app), the stated serving weight and the
// kcal/macro figures are typed in as two separate, independently-sourced numbers with
// no guarantee they were measured from the same sample. Subtracting macros from that
// weight (an earlier version of this function) conflated real water/fiber/mineral mass
// with plain data-entry inconsistency, with no way to tell the two apart (found during
// FR-DASH-1 dogfood, 2026-08-20). Instead, the ring's 100% is the sum of only what's
// actually measured: protein_g + carbs_g + fat_g + otherTotal (sodium/cholesterol/etc,
// already converted to grams by sumOtherNutrients) — self-consistent by construction,
// and no longer needs entries to have a known serving weight at all.
export function computeNutrientComposition(entries: MacroEntry[], otherTotal: OtherNutrientTotal[]): NutrientComposition | null {
  const macros = entries.reduce(
    (acc, e) => ({ protein_g: acc.protein_g + e.protein_g, carbs_g: acc.carbs_g + e.carbs_g, fat_g: acc.fat_g + e.fat_g }),
    { protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
  const other_g = otherTotal.reduce((sum, o) => sum + o.grams, 0);
  if (macros.protein_g + macros.carbs_g + macros.fat_g + other_g <= 0) return null;
  return { ...macros, other_g };
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
