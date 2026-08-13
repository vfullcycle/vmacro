import type { NutrientPanel } from "./scaling";

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "เช้า",
  lunch: "กลางวัน",
  dinner: "เย็น",
  snack: "ว่าง",
};

export interface DiaryEntryRow {
  id: string;
  entry_date: string;
  meal: Meal;
  source: "custom_food" | "fatsecret" | "dish";
  custom_food_id: string | null;
  dish_id: string | null;
  fatsecret_food_id: string | null;
  fatsecret_food_name: string | null;
  quantity: number;
  serving_size_g: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: NutrientPanel | null;
  custom_foods: { name: string } | null;
  dishes: { name: string } | null;
}

export function entryDisplayName(entry: DiaryEntryRow): string {
  if (entry.source === "fatsecret") return entry.fatsecret_food_name ?? "อาหาร";
  if (entry.source === "custom_food") return entry.custom_foods?.name ?? "อาหาร";
  return entry.dishes?.name ?? "จาน";
}

/** Total grams if the source serving size is known, else the serving-multiple ("1.5x"). */
export function entryQuantityLabel(entry: DiaryEntryRow): string {
  if (entry.serving_size_g != null) {
    return `${Math.round(entry.quantity * entry.serving_size_g)} g`;
  }
  return `× ${entry.quantity}`;
}

export function todayLocalDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}
