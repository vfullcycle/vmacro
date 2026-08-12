import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import FatSecretAttribution from "../components/FatSecretAttribution";
import NutritionFactsLabel from "../components/NutritionFactsLabel";
import { API_BASE_URL } from "../config";
import { useAuth } from "../lib/auth-context";
import { parseFoodDetail, servingToScalable, type FatSecretServing } from "../lib/fatsecret";
import { scaleNutrients, type NutrientPanel, type ScalableNutrients } from "../lib/scaling";
import { supabase } from "../lib/supabase";
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
          <option value="servings">serving</option>
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
  const [servings, setServings] = useState<FatSecretServing[]>([]);
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

  const selectedServing = servings.find((s) => s.serving_id === servingId);

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
      <h1>{foodName}</h1>

      <label className="serving-select">
        Serving
        <select value={servingId ?? ""} onChange={(e) => setServingId(e.target.value)}>
          {servings.map((s) => (
            <option key={s.serving_id} value={s.serving_id}>
              {s.serving_description}
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
        <NutritionFactsLabel nutrients={scaled} servingDescription={quantityLabel(quantityMode, quantityValue, selectedServing.serving_description)} />
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
