import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import FatSecretAttribution from "../components/FatSecretAttribution";
import VerifiedBadge from "../components/VerifiedBadge";
import { API_BASE_URL } from "../config";
import { useAuth } from "../lib/auth-context";
import { entryDisplayName, entryQuantityLabel, MEAL_LABELS, type DiaryEntryRow, type Meal } from "../lib/diary";
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

// English-search results carry the full FatSecretSearchResult shape; the anon+Thai-query
// cache-fallback path (see the search effect below) only ever has food_id + thai_name —
// food_name/food_description/brand_name are optional so the same list can render both.
interface FatSecretResultWithThai extends Partial<Omit<FatSecretSearchResult, "food_id">> {
  food_id: string;
  thai_name?: string;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const RECENT_PER_MEAL_LIMIT = 8;
const CUSTOM_RESULTS_LIMIT = 3;
const FATSECRET_PAGE_SIZE = 5;

const DIARY_ENTRY_COLUMNS =
  "id, entry_date, meal, source, custom_food_id, dish_id, fatsecret_food_id, fatsecret_food_name, quantity, serving_size_g, kcal, protein_g, carbs_g, fat_g, nutrients, custom_foods(name), dishes(name)";

function foodIdentityKey(entry: DiaryEntryRow): string {
  if (entry.source === "fatsecret") return `fs:${entry.fatsecret_food_id}`;
  if (entry.source === "custom_food") return `cf:${entry.custom_food_id}`;
  return `dish:${entry.dish_id}`;
}

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forDiary = searchParams.get("forDiary") === "1";
  const diaryDate = searchParams.get("date");
  const diaryMeal = searchParams.get("meal") as Meal | null;
  const diaryQuery = forDiary && diaryDate && diaryMeal ? `?forDiary=1&date=${diaryDate}&meal=${diaryMeal}` : "";

  const [query, setQuery] = useState("");
  const [fatsecretResults, setFatsecretResults] = useState<FatSecretResultWithThai[]>([]);
  const [fatsecretPage, setFatsecretPage] = useState(0);
  const [customResults, setCustomResults] = useState<CustomFoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const searchIdRef = useRef(0);

  const [recentEntries, setRecentEntries] = useState<DiaryEntryRow[]>([]);
  const [quickAddingId, setQuickAddingId] = useState<string | null>(null);

  // History for this specific meal (breakfast/lunch/dinner/snack) — lets a repeat meal
  // be logged in ~2 taps instead of a full search (FR-DIARY-3-style shortcut).
  useEffect(() => {
    if (!forDiary || !diaryMeal || !user) {
      setRecentEntries([]);
      return;
    }
    supabase
      .from("diary_entries")
      .select(DIARY_ENTRY_COLUMNS)
      .eq("user_id", user.id)
      .eq("meal", diaryMeal)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        const rows = (data as unknown as DiaryEntryRow[]) ?? [];
        const seen = new Set<string>();
        const deduped: DiaryEntryRow[] = [];
        for (const row of rows) {
          const key = foodIdentityKey(row);
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(row);
          if (deduped.length >= RECENT_PER_MEAL_LIMIT) break;
        }
        setRecentEntries(deduped);
      });
  }, [forDiary, diaryMeal, user]);

  async function quickAdd(entry: DiaryEntryRow) {
    if (!user || !diaryDate || !diaryMeal) return;
    setQuickAddingId(entry.id);
    const { error: insertError } = await supabase.from("diary_entries").insert({
      user_id: user.id,
      entry_date: diaryDate,
      meal: diaryMeal,
      source: entry.source,
      custom_food_id: entry.custom_food_id,
      dish_id: entry.dish_id,
      fatsecret_food_id: entry.fatsecret_food_id,
      fatsecret_food_name: entry.fatsecret_food_name,
      quantity: entry.quantity,
      serving_size_g: entry.serving_size_g,
      kcal: entry.kcal,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g,
      fat_g: entry.fat_g,
      nutrients: entry.nutrients,
    });
    setQuickAddingId(null);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    navigate(`/diary?date=${diaryDate}`);
  }

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
      setFatsecretPage(0);
      setCustomResults([]);
      try {
        const customFoodsPromise = supabase
          .from("custom_foods")
          .select("id, name, serving_label, serving_size_g, kcal, creator_id, is_verified")
          .ilike("name", `%${trimmed}%`)
          .limit(20);

        // Anonymous + Thai query: /translate requires login (D-015 amendment) — never send
        // an untranslated Thai string to FatSecret's English-only search (it just silently
        // finds nothing). Instead, search only what's already been translated by a logged-in
        // user before (public read on food_translations, zero API cost either way). A miss
        // here means nobody's searched this in Thai yet — show no FatSecret results rather
        // than a broken search, per discussion with วี.
        if (!user && containsThai(trimmed)) {
          const [cachedRows, customRes] = await Promise.all([
            supabase.from("food_translations").select("fatsecret_food_id, thai_name").ilike("thai_name", `%${trimmed}%`).limit(10),
            customFoodsPromise,
          ]);
          if (isStale()) return;

          const customWithNames = await attachCreatorNames(customRes.data ?? []);
          if (isStale()) return;
          const customSorted = [...customWithNames].sort((a, b) => Number(b.is_verified) - Number(a.is_verified));
          setCustomResults(customSorted.slice(0, CUSTOM_RESULTS_LIMIT));

          const cached: FatSecretResultWithThai[] = (cachedRows.data ?? []).map((row) => ({
            food_id: row.fatsecret_food_id,
            thai_name: row.thai_name,
          }));
          setFatsecretResults(cached);
          return;
        }

        const fatsecretQuery = containsThai(trimmed) ? await translateQueryToEnglish(trimmed) : trimmed;
        if (isStale()) return;

        const [fsRaw, customRes] = await Promise.all([
          fetch(`${API_BASE_URL}/food/search?q=${encodeURIComponent(fatsecretQuery)}`).then((r) => r.json()),
          customFoodsPromise,
        ]);
        if (isStale()) return;

        const customWithNames = await attachCreatorNames(customRes.data ?? []);
        if (isStale()) return;
        // Verified results first so trimming to a short list never silently drops the
        // one(s) an admin has actually checked (DF2).
        const customSorted = [...customWithNames].sort((a, b) => Number(b.is_verified) - Number(a.is_verified));
        setCustomResults(customSorted.slice(0, CUSTOM_RESULTS_LIMIT));

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
  }, [query, user]);

  const noResults = searched && !loading && customResults.length === 0 && fatsecretResults.length === 0;
  const fatsecretPageCount = Math.ceil(fatsecretResults.length / FATSECRET_PAGE_SIZE);
  const pagedFatsecretResults = fatsecretResults.slice(
    fatsecretPage * FATSECRET_PAGE_SIZE,
    (fatsecretPage + 1) * FATSECRET_PAGE_SIZE,
  );

  return (
    <main className="food-search-page">
      <h1>ค้นหาอาหาร</h1>
      {diaryQuery && (
        <p className="food-search-diary-banner">
          กำลังเพิ่มเข้ามื้อ{MEAL_LABELS[diaryMeal as Meal]} วันที่ {diaryDate}
        </p>
      )}

      {recentEntries.length > 0 && (
        <section className="food-search-recent">
          <h2>ที่เคยกินมื้อนี้</h2>
          <ul className="food-result-list">
            {recentEntries.map((entry) => (
              <li key={entry.id}>
                <button type="button" className="food-search-recent-item" onClick={() => quickAdd(entry)} disabled={quickAddingId === entry.id}>
                  <span className="food-name">{entryDisplayName(entry)}</span>
                  <span className="food-meta">
                    {entryQuantityLabel(entry)} — {Math.round(entry.kcal)} kcal
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
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
                    {food.is_verified && <VerifiedBadge className="verified-badge" />}
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
            {pagedFatsecretResults.map((food) => (
              <li key={food.food_id}>
                <Link to={`/food/fatsecret/${food.food_id}${diaryQuery}`}>
                  <span className="food-name">
                    {food.thai_name ?? food.food_name}
                    {food.brand_name ? ` (${food.brand_name})` : ""}
                  </span>
                  {food.food_description && (
                    <span className="food-meta">
                      {food.thai_name && food.food_name ? `${food.food_name} — ` : ""}
                      {food.food_description}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {fatsecretPageCount > 1 && (
            <div className="food-search-pagination">
              <button type="button" onClick={() => setFatsecretPage((p) => p - 1)} disabled={fatsecretPage === 0}>
                ก่อนหน้า
              </button>
              <span>
                หน้า {fatsecretPage + 1} / {fatsecretPageCount}
              </span>
              <button type="button" onClick={() => setFatsecretPage((p) => p + 1)} disabled={fatsecretPage >= fatsecretPageCount - 1}>
                ถัดไป
              </button>
            </div>
          )}
        </section>
      )}

      <FatSecretAttribution />
    </main>
  );
}
