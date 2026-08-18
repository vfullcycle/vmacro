import { API_BASE_URL } from "../config";
import type { Meal } from "./diary";
import type { DiaryEntryRow } from "./diary";
import { parseFoodDetail, servingToScalable } from "./fatsecret";
import { scaleFactorFor, scaleNutrients } from "./scaling";
import { supabase } from "./supabase";

export interface FavoriteRow {
  id: string;
  source: "custom_food" | "dish" | "fatsecret";
  custom_food_id: string | null;
  dish_id: string | null;
  fatsecret_food_id: string | null;
  fatsecret_food_name: string | null;
  custom_foods: { name: string } | null;
  dishes: { name: string } | null;
}

export function favoriteDisplayName(item: FavoriteRow): string {
  if (item.source === "fatsecret") return item.fatsecret_food_name ?? "อาหาร";
  if (item.source === "custom_food") return item.custom_foods?.name ?? "อาหาร";
  return item.dishes?.name ?? "จาน";
}

/** Favorites don't carry a macro snapshot (only a reference) — this fetches current
 * data and logs at 1 serving/1x dish, same default FoodDetail.tsx uses. */
export async function applyFavorite(
  item: FavoriteRow,
  diary: { date: string; meal: Meal },
  userId: string,
): Promise<{ error?: string }> {
  if (item.source === "custom_food") {
    const { data: food, error } = await supabase
      .from("custom_foods")
      .select("serving_size_g, kcal, protein_g, carbs_g, fat_g, nutrients")
      .eq("id", item.custom_food_id)
      .single();
    if (error || !food) return { error: error?.message ?? "ไม่พบอาหาร" };

    const scaled = scaleNutrients({ base: food, baseServingGrams: food.serving_size_g, quantityMode: "servings", quantityValue: 1 });
    const { error: insertError } = await supabase.from("diary_entries").insert({
      user_id: userId,
      entry_date: diary.date,
      meal: diary.meal,
      source: "custom_food",
      custom_food_id: item.custom_food_id,
      quantity: 1,
      serving_size_g: food.serving_size_g,
      kcal: scaled.kcal,
      protein_g: scaled.protein_g,
      carbs_g: scaled.carbs_g,
      fat_g: scaled.fat_g,
      nutrients: scaled.nutrients ?? {},
    });
    return { error: insertError?.message };
  }

  if (item.source === "dish") {
    const { data: dish, error } = await supabase
      .from("dishes")
      .select("kcal, protein_g, carbs_g, fat_g, nutrients")
      .eq("id", item.dish_id)
      .single();
    if (error || !dish) return { error: error?.message ?? "ไม่พบจาน" };

    const scaled = scaleNutrients({ base: dish, baseServingGrams: null, quantityMode: "servings", quantityValue: 1 });
    const { error: insertError } = await supabase.from("diary_entries").insert({
      user_id: userId,
      entry_date: diary.date,
      meal: diary.meal,
      source: "dish",
      dish_id: item.dish_id,
      quantity: 1,
      kcal: scaled.kcal,
      protein_g: scaled.protein_g,
      carbs_g: scaled.carbs_g,
      fat_g: scaled.fat_g,
      nutrients: scaled.nutrients ?? {},
    });
    return { error: insertError?.message };
  }

  // fatsecret — no local snapshot at all, must re-fetch current serving data
  const raw = await fetch(`${API_BASE_URL}/food/get?id=${encodeURIComponent(item.fatsecret_food_id!)}`).then((r) => r.json());
  const detail = parseFoodDetail(raw);
  if (!detail) return { error: "ไม่พบข้อมูลอาหารจาก FatSecret" };
  const defaultServing = detail.servings.find((s) => s.is_default === "1") ?? detail.servings[0];
  if (!defaultServing) return { error: "ไม่พบหน่วยบริโภค" };

  const { base, baseServingGrams } = servingToScalable(defaultServing);
  const scaled = scaleNutrients({ base, baseServingGrams, quantityMode: "servings", quantityValue: 1 });
  const factor = scaleFactorFor({ baseServingGrams, quantityMode: "servings", quantityValue: 1 });
  const { error: insertError } = await supabase.from("diary_entries").insert({
    user_id: userId,
    entry_date: diary.date,
    meal: diary.meal,
    source: "fatsecret",
    fatsecret_food_id: item.fatsecret_food_id,
    fatsecret_food_name: item.fatsecret_food_name ?? detail.food_name,
    quantity: factor,
    serving_size_g: baseServingGrams,
    kcal: scaled.kcal,
    protein_g: scaled.protein_g,
    carbs_g: scaled.carbs_g,
    fat_g: scaled.fat_g,
    nutrients: scaled.nutrients ?? {},
  });
  return { error: insertError?.message };
}

function recentKey(entry: DiaryEntryRow): string {
  if (entry.source === "quick") return `quick:${(entry.quick_name ?? "").trim().toLowerCase()}`;
  return `${entry.source}:${entry.custom_food_id ?? entry.dish_id ?? entry.fatsecret_food_id}`;
}

/** Diary entries already carry a full macro snapshot — dedupe to the most recent
 * distinct food/dish/quick-item and cap the list, no re-fetch needed to apply one. */
export function dedupeRecent(entries: DiaryEntryRow[], limit: number): DiaryEntryRow[] {
  const seen = new Set<string>();
  const result: DiaryEntryRow[] = [];
  for (const entry of entries) {
    const key = recentKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
    if (result.length >= limit) break;
  }
  return result;
}

export async function applyRecent(item: DiaryEntryRow, diary: { date: string; meal: Meal }, userId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("diary_entries").insert({
    user_id: userId,
    entry_date: diary.date,
    meal: diary.meal,
    source: item.source,
    custom_food_id: item.custom_food_id,
    dish_id: item.dish_id,
    fatsecret_food_id: item.fatsecret_food_id,
    fatsecret_food_name: item.fatsecret_food_name,
    quick_name: item.quick_name,
    quantity: item.quantity,
    serving_size_g: item.serving_size_g,
    kcal: item.kcal,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    nutrients: item.nutrients,
  });
  return { error: error?.message };
}
