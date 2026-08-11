// Client-side parsing for FatSecret API responses (via the proxy's /food/search
// and /food/get passthroughs). FatSecret's XML->JSON conversion collapses
// single-item arrays into bare objects, so every list field here needs
// defensive normalization back into an array.
import type { NutrientPanel } from "./scaling";

export interface FatSecretSearchResult {
  food_id: string;
  food_name: string;
  food_type: "Brand" | "Generic";
  brand_name?: string;
  food_description: string;
  food_url: string;
}

export interface FatSecretServing {
  serving_id: string;
  serving_description: string;
  metric_serving_amount?: string;
  metric_serving_unit?: string;
  is_default?: string;
  calories: string;
  carbohydrate: string;
  protein: string;
  fat: string;
  saturated_fat?: string;
  polyunsaturated_fat?: string;
  monounsaturated_fat?: string;
  trans_fat?: string;
  cholesterol?: string;
  sodium?: string;
  potassium?: string;
  fiber?: string;
  sugar?: string;
  added_sugars?: string;
  vitamin_a?: string;
  vitamin_c?: string;
  vitamin_d?: string;
  calcium?: string;
  iron?: string;
}

export interface FatSecretFoodDetail {
  food_id: string;
  food_name: string;
  food_type: string;
  brand_name?: string;
  servings: FatSecretServing[];
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseSearchResults(raw: unknown): FatSecretSearchResult[] {
  const foods = (raw as { foods?: { food?: FatSecretSearchResult | FatSecretSearchResult[] } })?.foods?.food;
  return asArray(foods);
}

export function parseFoodDetail(raw: unknown): FatSecretFoodDetail | null {
  const food = (raw as { food?: FatSecretFoodDetail & { servings?: { serving?: FatSecretServing | FatSecretServing[] } } })?.food;
  if (!food) return null;
  return {
    food_id: food.food_id,
    food_name: food.food_name,
    food_type: food.food_type,
    brand_name: food.brand_name,
    servings: asArray(food.servings?.serving),
  };
}

const num = (v: string | undefined): number | undefined => (v != null && v !== "" ? Number(v) : undefined);

function setIfPresent(target: NutrientPanel, key: string, v: string | undefined) {
  const n = num(v);
  if (n != null) target[key] = n;
}

export interface ScalableBase {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: NutrientPanel;
}

export function servingToScalable(serving: FatSecretServing): { base: ScalableBase; baseServingGrams: number | null } {
  const nutrients: NutrientPanel = {};
  setIfPresent(nutrients, "saturated_fat_g", serving.saturated_fat);
  setIfPresent(nutrients, "polyunsaturated_fat_g", serving.polyunsaturated_fat);
  setIfPresent(nutrients, "monounsaturated_fat_g", serving.monounsaturated_fat);
  setIfPresent(nutrients, "trans_fat_g", serving.trans_fat);
  setIfPresent(nutrients, "cholesterol_mg", serving.cholesterol);
  setIfPresent(nutrients, "sodium_mg", serving.sodium);
  setIfPresent(nutrients, "fiber_g", serving.fiber);
  setIfPresent(nutrients, "sugar_g", serving.sugar);
  setIfPresent(nutrients, "added_sugars_g", serving.added_sugars);

  const vitamins: NutrientPanel = {};
  setIfPresent(vitamins, "vitamin_a_mcg", serving.vitamin_a);
  setIfPresent(vitamins, "vitamin_c_mg", serving.vitamin_c);
  setIfPresent(vitamins, "vitamin_d_mcg", serving.vitamin_d);
  if (Object.keys(vitamins).length) nutrients.vitamins = vitamins;

  const minerals: NutrientPanel = {};
  setIfPresent(minerals, "calcium_mg", serving.calcium);
  setIfPresent(minerals, "iron_mg", serving.iron);
  setIfPresent(minerals, "potassium_mg", serving.potassium);
  if (Object.keys(minerals).length) nutrients.minerals = minerals;

  const baseServingGrams = serving.metric_serving_unit === "g" ? (num(serving.metric_serving_amount) ?? null) : null;

  return {
    base: {
      kcal: num(serving.calories) ?? 0,
      protein_g: num(serving.protein) ?? 0,
      carbs_g: num(serving.carbohydrate) ?? 0,
      fat_g: num(serving.fat) ?? 0,
      nutrients,
    },
    baseServingGrams,
  };
}
