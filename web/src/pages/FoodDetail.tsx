import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import FatSecretAttribution from "../components/FatSecretAttribution";
import NutritionFactsLabel from "../components/NutritionFactsLabel";
import { API_BASE_URL } from "../config";
import { useAuth } from "../lib/auth-context";
import { parseFoodDetail, servingToScalable, type FatSecretServing } from "../lib/fatsecret";
import { scaleNutrients, type NutrientPanel, type ScalableNutrients } from "../lib/scaling";
import { supabase } from "../lib/supabase";
import { translateTexts } from "../lib/translate";
import "./FoodDetail.css";

type QuantityMode = "servings" | "grams";

function quantityLabel(mode: QuantityMode, value: number, description: string) {
  return mode === "grams" ? `${value} g` : `${value} × ${description}`;
}

function QuantityInput({
  mode,
  value,
  onModeChange,
  onValueChange,
  gramsAvailable,
}: {
  mode: QuantityMode;
  value: number;
  onModeChange: (m: QuantityMode) => void;
  onValueChange: (v: number) => void;
  gramsAvailable: boolean;
}) {
  return (
    <div className="quantity-input">
      <label>
        ปริมาณ
        <input type="number" step="0.1" min="0" value={value} onChange={(e) => onValueChange(Number(e.target.value) || 0)} />
      </label>
      <label>
        หน่วย
        <select value={mode} onChange={(e) => onModeChange(e.target.value as QuantityMode)}>
          <option value="servings">หน่วยบริโภค</option>
          <option value="grams" disabled={!gramsAvailable}>
            กรัม (g)
          </option>
        </select>
      </label>
    </div>
  );
}

function FatSecretFoodDetail({ foodId }: { foodId: string }) {
  const [foodName, setFoodName] = useState("");
  const [thaiName, setThaiName] = useState<string | null>(null);
  const [servings, setServings] = useState<FatSecretServing[]>([]);
  const [servingTranslations, setServingTranslations] = useState<Record<string, string>>({});
  const [servingId, setServingId] = useState<string | null>(null);
  const [quantityMode, setQuantityMode] = useState<QuantityMode>("servings");
  const [quantityValue, setQuantityValue] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/food/get?id=${encodeURIComponent(foodId)}`)
      .then((r) => r.json())
      .then((raw) => {
        const detail = parseFoodDetail(raw);
        if (!detail) {
          setError("ไม่พบข้อมูลอาหาร");
          return;
        }
        setFoodName(detail.food_name);
        setServings(detail.servings);
        const defaultServing = detail.servings.find((s) => s.is_default === "1") ?? detail.servings[0];
        setServingId(defaultServing?.serving_id ?? null);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [foodId]);

  // Reuse the same food_translations cache the search page writes to — falls back to a
  // fresh AI translation (and caches it) if this food was never searched before.
  useEffect(() => {
    if (!foodName) return;
    let cancelled = false;

    supabase
      .from("food_translations")
      .select("thai_name")
      .eq("fatsecret_food_id", foodId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.thai_name) {
          setThaiName(data.thai_name);
          return;
        }
        translateTexts([foodName], "th")
          .then(([translated]) => {
            if (cancelled || !translated) return;
            setThaiName(translated);
            supabase.from("food_translations").insert({ fatsecret_food_id: foodId, thai_name: translated }).then(() => {});
          })
          .catch(() => {
            // translation unavailable — page still works with the English name
          });
      });

    return () => {
      cancelled = true;
    };
  }, [foodId, foodName]);

  // Serving descriptions ("1/2 small, yield after cooking, bone removed") are cached
  // per serving_id the same way food names are cached per food_id.
  useEffect(() => {
    if (servings.length === 0) return;
    let cancelled = false;
    const ids = servings.map((s) => s.serving_id);

    supabase
      .from("serving_translations")
      .select("fatsecret_serving_id, thai_description")
      .in("fatsecret_serving_id", ids)
      .then(({ data }) => {
        if (cancelled) return;
        const cache: Record<string, string> = {};
        (data ?? []).forEach((row) => {
          cache[row.fatsecret_serving_id] = row.thai_description;
        });

        const uncached = servings.filter((s) => !cache[s.serving_id]);
        if (uncached.length === 0) {
          setServingTranslations(cache);
          return;
        }

        translateTexts(
          uncached.map((s) => s.serving_description),
          "th",
        )
          .then((translated) => {
            if (cancelled) return;
            const newRows = uncached.map((s, i) => ({ fatsecret_serving_id: s.serving_id, thai_description: translated[i] }));
            newRows.forEach((row) => {
              cache[row.fatsecret_serving_id] = row.thai_description;
            });
            setServingTranslations({ ...cache });
            supabase.from("serving_translations").insert(newRows).then(() => {});
          })
          .catch(() => {
            setServingTranslations(cache); // show whatever was already cached; rest stays English
          });
      });

    return () => {
      cancelled = true;
    };
  }, [servings]);

  const selectedServing = servings.find((s) => s.serving_id === servingId);
  const selectedServingLabel = selectedServing ? (servingTranslations[selectedServing.serving_id] ?? selectedServing.serving_description) : "";

  const scaled: ScalableNutrients | null = useMemo(() => {
    if (!selectedServing) return null;
    const { base, baseServingGrams } = servingToScalable(selectedServing);
    try {
      return scaleNutrients({ base, baseServingGrams, quantityMode, quantityValue });
    } catch {
      return null;
    }
  }, [selectedServing, quantityMode, quantityValue]);

  if (loading) return <p>กำลังโหลด...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <main className="food-detail-page">
      <Link to="/food/search" className="food-detail-back-link">
        ← กลับไปค้นหา
      </Link>
      <h1>{thaiName ?? foodName}</h1>
      {thaiName && <p className="food-detail-source">{foodName}</p>}

      <label className="serving-select">
        หน่วยบริโภค
        <select value={servingId ?? ""} onChange={(e) => setServingId(e.target.value)}>
          {servings.map((s) => (
            <option key={s.serving_id} value={s.serving_id}>
              {servingTranslations[s.serving_id] ?? s.serving_description}
            </option>
          ))}
        </select>
      </label>

      <QuantityInput
        mode={quantityMode}
        value={quantityValue}
        onModeChange={setQuantityMode}
        onValueChange={setQuantityValue}
        gramsAvailable={selectedServing?.metric_serving_unit === "g"}
      />

      {scaled && selectedServing && (
        <NutritionFactsLabel nutrients={scaled} servingDescription={quantityLabel(quantityMode, quantityValue, selectedServingLabel)} />
      )}

      <FatSecretAttribution />
    </main>
  );
}

interface CustomFoodRow {
  creator_id: string;
  name: string;
  serving_label: string | null;
  serving_size_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: NutrientPanel | null;
}

function CustomFoodDetail({ foodId }: { foodId: string }) {
  const { user } = useAuth();
  const [food, setFood] = useState<CustomFoodRow | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [quantityMode, setQuantityMode] = useState<QuantityMode>("servings");
  const [quantityValue, setQuantityValue] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("custom_foods")
      .select("creator_id, name, serving_label, serving_size_g, kcal, protein_g, carbs_g, fat_g, nutrients")
      .eq("id", foodId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        setFood(data as CustomFoodRow);
        setLoading(false);
        supabase
          .rpc("get_display_name", { profile_id: data.creator_id })
          .then(({ data: name }) => setCreatorName(name));
      });
  }, [foodId]);

  const scaled: ScalableNutrients | null = useMemo(() => {
    if (!food) return null;
    try {
      return scaleNutrients({
        base: { kcal: food.kcal, protein_g: food.protein_g, carbs_g: food.carbs_g, fat_g: food.fat_g, nutrients: food.nutrients },
        baseServingGrams: food.serving_size_g,
        quantityMode,
        quantityValue,
      });
    } catch {
      return null;
    }
  }, [food, quantityMode, quantityValue]);

  if (loading) return <p>กำลังโหลด...</p>;
  if (error || !food) return <p className="error">{error ?? "ไม่พบข้อมูลอาหาร"}</p>;

  const servingDesc = food.serving_label ?? `${food.serving_size_g}g`;

  return (
    <main className="food-detail-page">
      <Link to="/food/search" className="food-detail-back-link">
        ← กลับไปค้นหา
      </Link>
      <h1>{food.name}</h1>
      <p className="food-detail-source">
        Custom food{creatorName ? ` — โดย ${creatorName}` : ""}
        {user?.id === food.creator_id && (
          <>
            {" · "}
            <Link to={`/food/custom/${foodId}/edit`}>แก้ไข</Link>
          </>
        )}
      </p>

      <QuantityInput mode={quantityMode} value={quantityValue} onModeChange={setQuantityMode} onValueChange={setQuantityValue} gramsAvailable />

      {scaled && <NutritionFactsLabel nutrients={scaled} servingDescription={quantityLabel(quantityMode, quantityValue, servingDesc)} />}
    </main>
  );
}

export default function FoodDetail() {
  const { source, id } = useParams<{ source: string; id: string }>();

  if (!id) return <p className="error">ไม่พบ id ของอาหาร</p>;
  if (source === "fatsecret") return <FatSecretFoodDetail foodId={id} />;
  if (source === "custom") return <CustomFoodDetail foodId={id} />;
  return <p className="error">ไม่รู้จักแหล่งข้อมูล: {source}</p>;
}
