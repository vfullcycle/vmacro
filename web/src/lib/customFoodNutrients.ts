// Shared between CustomFoodForm.tsx (manual entry/edit) and AiFoodImport.tsx (D-023 —
// AI pre-fill, still edited through the exact same fields) so both flows produce/read the
// same `nutrients` jsonb shape by construction.
import type { NutrientPanel } from "./scaling";

export interface CoreFormState {
  name: string;
  serving_label: string;
  serving_size_g: string;
  kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
}

export const EMPTY_CORE: CoreFormState = {
  name: "",
  serving_label: "",
  serving_size_g: "",
  kcal: "",
  protein_g: "",
  carbs_g: "",
  fat_g: "",
};

export type ExtraGroup = "fat" | "carb" | "other" | "vitamin" | "mineral";
export type ExtraUnit = "abs" | "pct";
export type ExtraEntry = { value: string; unit: ExtraUnit };
export type ExtraFormState = Record<string, ExtraEntry>;

// key = base nutrient key (matches NutritionFactsLabel); unit = the field's natural
// absolute unit. Every field can also be entered as "% ของปริมาณที่แนะนำต่อวัน" (%DV) —
// many Thai nutrition labels print only the percentage, not the absolute amount.
export interface ExtraFieldDef {
  key: string;
  label: string;
  group: ExtraGroup;
  unit: "g" | "mg" | "mcg";
}

// FatSecret's API only ever returns saturated/trans/poly/mono fat, fiber, sugar,
// added sugars, cholesterol, sodium, potassium, vitamin A/C/D, calcium, iron — nothing
// else (verified against their docs, 2026-08). Everything past that (B vitamins, E, K,
// and the extended minerals) only ever comes from a user typing it in off a real label,
// so it lives here even though FatSecret-sourced foods will never populate it.
export const EXTRA_FIELDS: ExtraFieldDef[] = [
  { key: "saturated_fat", label: "ไขมันอิ่มตัว", group: "fat", unit: "g" },
  { key: "trans_fat", label: "ไขมันทรานส์", group: "fat", unit: "g" },
  { key: "polyunsaturated_fat", label: "ไขมันไม่อิ่มตัวหลายตำแหน่ง", group: "fat", unit: "g" },
  { key: "monounsaturated_fat", label: "ไขมันไม่อิ่มตัวตำแหน่งเดียว", group: "fat", unit: "g" },
  { key: "fiber", label: "ใยอาหาร", group: "carb", unit: "g" },
  { key: "sugar", label: "น้ำตาล", group: "carb", unit: "g" },
  { key: "added_sugars", label: "น้ำตาลที่เติมเพิ่ม", group: "carb", unit: "g" },
  { key: "cholesterol", label: "คอเลสเตอรอล", group: "other", unit: "mg" },
  { key: "sodium", label: "โซเดียม", group: "other", unit: "mg" },
  { key: "vitamin_a", label: "วิตามินเอ", group: "vitamin", unit: "mcg" },
  { key: "vitamin_c", label: "วิตามินซี", group: "vitamin", unit: "mg" },
  { key: "vitamin_d", label: "วิตามินดี", group: "vitamin", unit: "mcg" },
  { key: "vitamin_e", label: "วิตามินอี", group: "vitamin", unit: "mg" },
  { key: "vitamin_k", label: "วิตามินเค", group: "vitamin", unit: "mcg" },
  { key: "vitamin_b1", label: "วิตามินบี1 (ไทอามีน)", group: "vitamin", unit: "mg" },
  { key: "vitamin_b2", label: "วิตามินบี2 (ไรโบฟลาวิน)", group: "vitamin", unit: "mg" },
  { key: "vitamin_b3", label: "วิตามินบี3 (ไนอาซิน)", group: "vitamin", unit: "mg" },
  { key: "vitamin_b6", label: "วิตามินบี6", group: "vitamin", unit: "mg" },
  { key: "vitamin_b12", label: "วิตามินบี12", group: "vitamin", unit: "mcg" },
  { key: "folate", label: "โฟเลต (บี9)", group: "vitamin", unit: "mcg" },
  { key: "biotin", label: "ไบโอติน (บี7)", group: "vitamin", unit: "mcg" },
  { key: "pantothenic_acid", label: "กรดแพนโททีนิก (บี5)", group: "vitamin", unit: "mg" },
  { key: "calcium", label: "แคลเซียม", group: "mineral", unit: "mg" },
  { key: "iron", label: "ธาตุเหล็ก", group: "mineral", unit: "mg" },
  { key: "potassium", label: "โพแทสเซียม", group: "mineral", unit: "mg" },
  { key: "magnesium", label: "แมกนีเซียม", group: "mineral", unit: "mg" },
  { key: "zinc", label: "สังกะสี", group: "mineral", unit: "mg" },
  { key: "phosphorus", label: "ฟอสฟอรัส", group: "mineral", unit: "mg" },
  { key: "iodine", label: "ไอโอดีน", group: "mineral", unit: "mcg" },
  { key: "selenium", label: "ซีลีเนียม", group: "mineral", unit: "mcg" },
  { key: "copper", label: "ทองแดง", group: "mineral", unit: "mg" },
  { key: "manganese", label: "แมงกานีส", group: "mineral", unit: "mg" },
  { key: "chloride", label: "คลอไรด์", group: "mineral", unit: "mg" },
];

export const GROUP_LABELS: Record<ExtraGroup, string> = {
  fat: "ไขมันแยกประเภท",
  carb: "คาร์โบไฮเดรตแยกประเภท",
  other: "อื่นๆ",
  vitamin: "วิตามิน",
  mineral: "แร่ธาตุ",
};

export const GROUP_ORDER: ExtraGroup[] = ["fat", "carb", "other", "vitamin", "mineral"];

function panelFor(nutrients: NutrientPanel, group: ExtraGroup): NutrientPanel {
  if (group === "vitamin") {
    if (typeof nutrients.vitamins !== "object" || nutrients.vitamins === null) nutrients.vitamins = {};
    return nutrients.vitamins as NutrientPanel;
  }
  if (group === "mineral") {
    if (typeof nutrients.minerals !== "object" || nutrients.minerals === null) nutrients.minerals = {};
    return nutrients.minerals as NutrientPanel;
  }
  return nutrients;
}

export function buildNutrients(extras: ExtraFormState): NutrientPanel {
  const nutrients: NutrientPanel = {};
  for (const field of EXTRA_FIELDS) {
    const entry = extras[field.key];
    if (!entry || !entry.value) continue;
    const value = Number(entry.value);
    const storageKey = entry.unit === "pct" ? `${field.key}_pct` : `${field.key}_${field.unit}`;
    panelFor(nutrients, field.group)[storageKey] = value;
  }
  return nutrients;
}

export function flattenNutrients(nutrients: NutrientPanel | null): ExtraFormState {
  const result: ExtraFormState = {};
  if (!nutrients) return result;
  const vitamins = (nutrients.vitamins as NutrientPanel | undefined) ?? {};
  const minerals = (nutrients.minerals as NutrientPanel | undefined) ?? {};
  for (const field of EXTRA_FIELDS) {
    const panel = field.group === "vitamin" ? vitamins : field.group === "mineral" ? minerals : nutrients;
    const absKey = `${field.key}_${field.unit}`;
    const pctKey = `${field.key}_pct`;
    if (typeof panel[absKey] === "number") result[field.key] = { value: String(panel[absKey]), unit: "abs" };
    else if (typeof panel[pctKey] === "number") result[field.key] = { value: String(panel[pctKey]), unit: "pct" };
  }
  return result;
}
