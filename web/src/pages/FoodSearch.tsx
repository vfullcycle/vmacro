import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import FatSecretAttribution from "../components/FatSecretAttribution";
import { API_BASE_URL } from "../config";
import { MEAL_LABELS, type Meal } from "../lib/diary";
import { parseSearchResults, type FatSecretSearchResult } from "../lib/fatsecret";
import { containsThai } from "../lib/thai";
import { translateTexts } from "../lib/translate";
import { supabase } from "../lib/supabase";
import "./FoodSearch.css";

interface CustomFoodResult {
  id: string;
  name: string;
  serving_label: string | null;
  serving_size_g: number;
  kcal: number;
  creator_id: string;
  is_verified: boolean;
  creator_name?: string;
}

interface FatSecretResultWithThai extends FatSecretSearchResult {
  thai_name?: string;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

async function translateQueryToEnglish(query: string): Promise<string> {
  try {
    const [english] = await translateTexts([query], "en");
    return english || query;
  } catch {
    return query; // translation unavailable — fall back to searching the raw (Thai) text
  }
}

// Awaited (not fired in the background) so results only ever appear already in Thai —
// no flash of the raw English name while translation is still in flight (DF7).
async function attachThaiNames(results: FatSecretSearchResult[]): Promise<FatSecretResultWithThai[]> {
  if (results.length === 0) return [];

  const ids = results.map((r) => r.food_id);
  const { data: cached } = await supabase.from("food_translations").select("fatsecret_food_id, thai_name").in("fatsecret_food_id", ids);

  const cache = new Map((cached ?? []).map((row) => [row.fatsecret_food_id, row.thai_name]));
  const uncached = results.filter((r) => !cache.has(r.food_id));

  if (uncached.length > 0) {
    try {
      const translations = await translateTexts(
        uncached.map((r) => r.food_name),
        "th",
      );
      const newRows = uncached.map((r, i) => ({ fatsecret_food_id: r.food_id, thai_name: translations[i] }));
      newRows.forEach((row) => cache.set(row.fatsecret_food_id, row.thai_name));
      // best-effort cache write — a failed insert just means this batch gets re-translated next time
      supabase.from("food_translations").insert(newRows).then(() => {});
    } catch {
      // translation unavailable — results still display fine with English only
    }
  }

  return results.map((r) => ({ ...r, thai_name: cache.get(r.food_id) }));
}

async function attachCreatorNames(results: Omit<CustomFoodResult, "creator_name">[]): Promise<CustomFoodResult[]> {
  if (results.length === 0) return [];
  const ids = [...new Set(results.map((r) => r.creator_id))];
  const { data } = await supabase.rpc("get_display_names", { profile_ids: ids });
  const names = new Map((data as { id: string; display_name: string }[] | null ?? []).map((row) => [row.id, row.display_name]));
  return results.map((r) => ({ ...r, creator_name: names.get(r.creator_id) }));
}

export default function FoodSearch() {
  const [searchParams] = useSearchParams();
  const forDiary = searchParams.get("forDiary") === "1";
  const diaryDate = searchParams.get("date");
  const diaryMeal = searchParams.get("meal") as Meal | null;
  const diaryQuery = forDiary && diaryDate && diaryMeal ? `?forDiary=1&date=${diaryDate}&meal=${diaryMeal}` : "";

  const [query, setQuery] = useState("");
  const [fatsecretResults, setFatsecretResults] = useState<FatSecretResultWithThai[]>([]);
  const [customResults, setCustomResults] = useState<CustomFoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const searchIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      searchIdRef.current++; // invalidate any in-flight search
      setFatsecretResults([]);
      setCustomResults([]);
      setSearched(false);
      return;
    }

    const timeout = setTimeout(async () => {
      const thisSearchId = ++searchIdRef.current;
      const isStale = () => thisSearchId !== searchIdRef.current;

      setLoading(true);
      setError(null);
      setFatsecretResults([]);
      setCustomResults([]);
      try {
        const fatsecretQuery = containsThai(trimmed) ? await translateQueryToEnglish(trimmed) : trimmed;
        if (isStale()) return;

        const [fsRaw, customRes] = await Promise.all([
          fetch(`${API_BASE_URL}/food/search?q=${encodeURIComponent(fatsecretQuery)}`).then((r) => r.json()),
          supabase
            .from("custom_foods")
            .select("id, name, serving_label, serving_size_g, kcal, creator_id, is_verified")
            .ilike("name", `%${trimmed}%`)
            .limit(20),
        ]);
        if (isStale()) return;

        const customWithNames = await attachCreatorNames(customRes.data ?? []);
        if (isStale()) return;
        setCustomResults(customWithNames);

        const parsed = parseSearchResults(fsRaw);
        const withThai = await attachThaiNames(parsed);
        if (isStale()) return;
        setFatsecretResults(withThai);
      } catch (err) {
        if (!isStale()) setError(String(err));
      } finally {
        if (!isStale()) {
          setLoading(false);
          setSearched(true);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query]);

  const noResults = searched && !loading && customResults.length === 0 && fatsecretResults.length === 0;

  return (
    <main className="food-search-page">
      <h1>ค้นหาอาหาร</h1>
      {diaryQuery && (
        <p className="food-search-diary-banner">
          กำลังเพิ่มเข้ามื้อ{MEAL_LABELS[diaryMeal as Meal]} วันที่ {diaryDate}
        </p>
      )}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="พิมพ์ชื่ออาหาร..."
        autoFocus
      />

      {loading && <p className="hint">กำลังค้นหา...</p>}
      {error && <p className="error">{error}</p>}
      {noResults && <p className="hint">ไม่พบผลลัพธ์</p>}
      <Link to="/food/custom/new" className="add-food-link">
        + เพิ่มอาหารของคุณเอง
      </Link>

      {customResults.length > 0 && (
        <section>
          <h2>Custom foods</h2>
          <ul className="food-result-list">
            {customResults.map((food) => (
              <li key={food.id}>
                <Link to={`/food/custom/${food.id}${diaryQuery}`}>
                  <span className="food-name">
                    {food.name}
                    {food.is_verified && (
                      <span className="verified-badge" title="ตรวจสอบโดยแอดมินแล้ว">
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="food-meta">
                    {food.serving_label ?? `${food.serving_size_g}g`} — {food.kcal} kcal
                    {food.creator_name ? ` · โดย ${food.creator_name}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {fatsecretResults.length > 0 && (
        <section>
          <h2>FatSecret</h2>
          <ul className="food-result-list">
            {fatsecretResults.map((food) => (
              <li key={food.food_id}>
                <Link to={`/food/fatsecret/${food.food_id}${diaryQuery}`}>
                  <span className="food-name">
                    {food.thai_name ?? food.food_name}
                    {food.brand_name ? ` (${food.brand_name})` : ""}
                  </span>
                  <span className="food-meta">
                    {food.thai_name ? `${food.food_name} — ` : ""}
                    {food.food_description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FatSecretAttribution />
    </main>
  );
}
