import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FatSecretAttribution from "../components/FatSecretAttribution";
import { API_BASE_URL } from "../config";
import { parseSearchResults, type FatSecretSearchResult } from "../lib/fatsecret";
import { supabase } from "../lib/supabase";
import "./FoodSearch.css";

interface CustomFoodResult {
  id: string;
  name: string;
  serving_label: string | null;
  serving_size_g: number;
  kcal: number;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export default function FoodSearch() {
  const [query, setQuery] = useState("");
  const [fatsecretResults, setFatsecretResults] = useState<FatSecretSearchResult[]>([]);
  const [customResults, setCustomResults] = useState<CustomFoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setFatsecretResults([]);
      setCustomResults([]);
      setSearched(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const [fsRaw, customRes] = await Promise.all([
          fetch(`${API_BASE_URL}/food/search?q=${encodeURIComponent(trimmed)}`).then((r) => r.json()),
          supabase
            .from("custom_foods")
            .select("id, name, serving_label, serving_size_g, kcal")
            .ilike("name", `%${trimmed}%`)
            .limit(20),
        ]);
        setFatsecretResults(parseSearchResults(fsRaw));
        setCustomResults(customRes.data ?? []);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query]);

  const noResults = searched && !loading && customResults.length === 0 && fatsecretResults.length === 0;

  return (
    <main className="food-search-page">
      <h1>ค้นหาอาหาร</h1>
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

      {customResults.length > 0 && (
        <section>
          <h2>Custom foods</h2>
          <ul className="food-result-list">
            {customResults.map((food) => (
              <li key={food.id}>
                <Link to={`/food/custom/${food.id}`}>
                  <span className="food-name">{food.name}</span>
                  <span className="food-meta">
                    {food.serving_label ?? `${food.serving_size_g}g`} — {food.kcal} kcal
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
                <Link to={`/food/fatsecret/${food.food_id}`}>
                  <span className="food-name">
                    {food.food_name}
                    {food.brand_name ? ` (${food.brand_name})` : ""}
                  </span>
                  <span className="food-meta">{food.food_description}</span>
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
