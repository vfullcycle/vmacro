import type { NutrientPanel } from "./scaling";

export type TemplateItemSource = "custom_food" | "fatsecret" | "dish" | "quick";

export interface MealTemplateRow {
  id: string;
  user_id: string;
  name: string;
}

export interface MealTemplateItemRow {
  id: string;
  template_id: string;
  source: TemplateItemSource;
  custom_food_id: string | null;
  dish_id: string | null;
  fatsecret_food_id: string | null;
  fatsecret_food_name: string | null;
  quick_name: string | null;
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

export function templateItemDisplayName(item: MealTemplateItemRow): string {
  if (item.source === "fatsecret") return item.fatsecret_food_name ?? "อาหาร";
  if (item.source === "custom_food") return item.custom_foods?.name ?? "อาหาร";
  if (item.source === "quick") return item.quick_name ?? "อาหาร";
  return item.dishes?.name ?? "จาน";
}

/** Total grams if the source serving size is known, else the serving-multiple ("1.5x"). */
export function templateItemQuantityLabel(item: MealTemplateItemRow): string {
  if (item.serving_size_g != null) {
    return `${Math.round(item.quantity * item.serving_size_g)} g`;
  }
  return `× ${item.quantity}`;
}
