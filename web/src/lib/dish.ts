import type { NutrientPanel } from "./scaling";

export type DishIngredientSource = "custom_food" | "fatsecret";

export interface DishRow {
  id: string;
  creator_id: string;
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: NutrientPanel | null;
}

export interface DishIngredientRow {
  id: string;
  dish_id: string;
  source: DishIngredientSource;
  custom_food_id: string | null;
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
}

export function ingredientDisplayName(ing: DishIngredientRow): string {
  if (ing.source === "fatsecret") return ing.fatsecret_food_name ?? "วัตถุดิบ";
  return ing.custom_foods?.name ?? "วัตถุดิบ";
}

/** Total grams if the ingredient's serving size is known, else the serving-multiple ("× 1.5"). */
export function ingredientQuantityLabel(ing: DishIngredientRow): string {
  if (ing.serving_size_g != null) {
    return `${Math.round(ing.quantity * ing.serving_size_g)} g`;
  }
  return `× ${ing.quantity}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function addPanels(a: NutrientPanel, b: NutrientPanel): NutrientPanel {
  const result: NutrientPanel = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (typeof value === "number") {
      const existing = result[key];
      result[key] = round1((typeof existing === "number" ? existing : 0) + value);
    } else {
      const existingGroup = typeof result[key] === "object" && result[key] !== null ? (result[key] as NutrientPanel) : {};
      result[key] = addPanels(existingGroup, value);
    }
  }
  return result;
}

export interface DishTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: NutrientPanel;
}

/**
 * Sums every ingredient's already-scaled macro/nutrient snapshot into the dish's own
 * totals. Written back onto the parent `dishes` row after every ingredient add/edit/
 * delete (client-side, no DB trigger) so the row always reflects the current sum.
 */
export function sumIngredients(
  ingredients: { kcal: number; protein_g: number; carbs_g: number; fat_g: number; nutrients: NutrientPanel | null }[],
): DishTotals {
  const totals: DishTotals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, nutrients: {} };
  for (const ing of ingredients) {
    totals.kcal += ing.kcal;
    totals.protein_g += ing.protein_g;
    totals.carbs_g += ing.carbs_g;
    totals.fat_g += ing.fat_g;
    totals.nutrients = addPanels(totals.nutrients, ing.nutrients ?? {});
  }
  totals.kcal = round1(totals.kcal);
  totals.protein_g = round1(totals.protein_g);
  totals.carbs_g = round1(totals.carbs_g);
  totals.fat_g = round1(totals.fat_g);
  return totals;
}
