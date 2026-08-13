import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import NutritionFactsLabel from "../components/NutritionFactsLabel";
import { API_BASE_URL } from "../config";
import { useAuth } from "../lib/auth-context";
import { ingredientDisplayName, ingredientQuantityLabel, sumIngredients, type DishIngredientRow, type DishRow } from "../lib/dish";
import { parseFoodDetail, servingToScalable } from "../lib/fatsecret";
import { scaleNutrients } from "../lib/scaling";
import { supabase } from "../lib/supabase";
import "./DishBuilder.css";

const DISH_COLUMNS = "id, creator_id, name, kcal, protein_g, carbs_g, fat_g, nutrients";
const INGREDIENT_COLUMNS =
  "id, dish_id, source, custom_food_id, fatsecret_food_id, fatsecret_food_name, quantity, serving_size_g, kcal, protein_g, carbs_g, fat_g, nutrients, custom_foods(name)";

export default function DishBuilder() {
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dish, setDish] = useState<DishRow | null>(null);
  const [ingredients, setIngredients] = useState<DishIngredientRow[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [notOwner, setNotOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function loadDish(dishId: string) {
    setLoading(true);
    const [dishRes, ingRes] = await Promise.all([
      supabase.from("dishes").select(DISH_COLUMNS).eq("id", dishId).single(),
      supabase.from("dish_ingredients").select(INGREDIENT_COLUMNS).eq("dish_id", dishId).order("created_at", { ascending: true }),
    ]);
    if (dishRes.error) {
      setError(dishRes.error.message);
      setLoading(false);
      return;
    }
    const dishData = dishRes.data as DishRow;
    if (dishData.creator_id !== user?.id) {
      setNotOwner(true);
      setLoading(false);
      return;
    }

    const ingRows = (ingRes.data as unknown as DishIngredientRow[]) ?? [];
    setIngredients(ingRows);

    // Reconcile the dish's own totals against the ingredient list every time it loads —
    // self-heals regardless of whether an ingredient was added/edited/deleted from here
    // or from FoodDetail's "add to dish" flow.
    const totals = sumIngredients(ingRows);
    const changed =
      dishData.kcal !== totals.kcal ||
      dishData.protein_g !== totals.protein_g ||
      dishData.carbs_g !== totals.carbs_g ||
      dishData.fat_g !== totals.fat_g ||
      JSON.stringify(dishData.nutrients ?? {}) !== JSON.stringify(totals.nutrients);
    if (changed) {
      await supabase.from("dishes").update(totals).eq("id", dishId);
      setDish({ ...dishData, ...totals });
    } else {
      setDish(dishData);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    loadDish(id);
    setEditingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    setCreating(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("dishes")
      .insert({ creator_id: user.id, name: newName.trim(), kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, nutrients: {} })
      .select("id")
      .single();
    setCreating(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    navigate(`/food/dish/${data.id}/edit`, { replace: true });
  }

  async function saveName() {
    if (!dish || !id) return;
    await supabase.from("dishes").update({ name: dish.name }).eq("id", id);
  }

  function startEdit(ing: DishIngredientRow) {
    setEditingId(ing.id);
    setEditValue(ing.serving_size_g != null ? String(Math.round(ing.quantity * ing.serving_size_g)) : String(ing.quantity));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function handleEditSave(e: React.FormEvent, ing: DishIngredientRow) {
    e.preventDefault();
    const edited = Number(editValue);
    if (!edited || edited <= 0 || !id) return;

    const newQuantity = ing.serving_size_g != null ? edited / ing.serving_size_g : edited;
    const ratio = newQuantity / ing.quantity;

    setEditSaving(true);
    setError(null);
    const rescaled = scaleNutrients({
      base: { kcal: ing.kcal, protein_g: ing.protein_g, carbs_g: ing.carbs_g, fat_g: ing.fat_g, nutrients: ing.nutrients },
      baseServingGrams: null,
      quantityMode: "servings",
      quantityValue: ratio,
    });
    const { error: updateError } = await supabase
      .from("dish_ingredients")
      .update({
        quantity: newQuantity,
        kcal: rescaled.kcal,
        protein_g: rescaled.protein_g,
        carbs_g: rescaled.carbs_g,
        fat_g: rescaled.fat_g,
        nutrients: rescaled.nutrients,
      })
      .eq("id", ing.id);
    setEditSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    cancelEdit();
    await loadDish(id);
  }

  async function handleDeleteIngredient(ingId: string) {
    if (!id || !window.confirm("ลบวัตถุดิบนี้?")) return;
    const { error: deleteError } = await supabase.from("dish_ingredients").delete().eq("id", ingId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (editingId === ingId) cancelEdit();
    await loadDish(id);
  }

  async function handleRecalculate() {
    if (!id) return;
    setRecalculating(true);
    setError(null);
    try {
      for (const ing of ingredients) {
        if (ing.source === "custom_food" && ing.custom_food_id) {
          const { data: food } = await supabase
            .from("custom_foods")
            .select("kcal, protein_g, carbs_g, fat_g, nutrients, serving_size_g")
            .eq("id", ing.custom_food_id)
            .single();
          if (!food) continue; // source deleted — leave this ingredient's old snapshot as-is
          const rescaled = scaleNutrients({
            base: { kcal: food.kcal, protein_g: food.protein_g, carbs_g: food.carbs_g, fat_g: food.fat_g, nutrients: food.nutrients },
            baseServingGrams: food.serving_size_g,
            quantityMode: "servings",
            quantityValue: ing.quantity,
          });
          await supabase
            .from("dish_ingredients")
            .update({
              serving_size_g: food.serving_size_g,
              kcal: rescaled.kcal,
              protein_g: rescaled.protein_g,
              carbs_g: rescaled.carbs_g,
              fat_g: rescaled.fat_g,
              nutrients: rescaled.nutrients,
            })
            .eq("id", ing.id);
        } else if (ing.source === "fatsecret" && ing.fatsecret_food_id) {
          const raw = await fetch(`${API_BASE_URL}/food/get?id=${encodeURIComponent(ing.fatsecret_food_id)}`).then((r) => r.json());
          const detail = parseFoodDetail(raw);
          const serving = detail?.servings.find((s) => s.is_default === "1") ?? detail?.servings[0];
          if (!serving) continue; // food removed from FatSecret — leave as-is
          const { base, baseServingGrams } = servingToScalable(serving);
          const rescaled = scaleNutrients({ base, baseServingGrams, quantityMode: "servings", quantityValue: ing.quantity });
          await supabase
            .from("dish_ingredients")
            .update({
              serving_size_g: baseServingGrams,
              kcal: rescaled.kcal,
              protein_g: rescaled.protein_g,
              carbs_g: rescaled.carbs_g,
              fat_g: rescaled.fat_g,
              nutrients: rescaled.nutrients,
            })
            .eq("id", ing.id);
        }
      }
      await loadDish(id);
    } finally {
      setRecalculating(false);
    }
  }

  async function handleDeleteDish() {
    if (!id || !window.confirm("ลบจานนี้เลยไหม? ลบแล้วกู้คืนไม่ได้")) return;
    const { error: deleteError } = await supabase.from("dishes").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    navigate("/food/search");
  }

  if (!id) {
    return (
      <main className="dish-builder-page">
        <h1>สร้างจานใหม่</h1>
        <form onSubmit={handleCreate}>
          <label>
            ชื่อจาน
            <input value={newName} onChange={(e) => setNewName(e.target.value)} required autoFocus />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={creating}>
            {creating ? "กำลังสร้าง..." : "สร้างจาน"}
          </button>
        </form>
      </main>
    );
  }

  if (loading) return <p>กำลังโหลด...</p>;
  if (notOwner) return <p className="error">แก้ไขได้เฉพาะคนสร้างจานนี้เท่านั้น</p>;
  if (!dish) return <p className="error">{error ?? "ไม่พบจานนี้"}</p>;

  return (
    <main className="dish-builder-page">
      <Link to="/food/search" className="back-link">
        ← กลับไปค้นหา
      </Link>

      <input
        className="dish-name-input"
        value={dish.name}
        onChange={(e) => setDish({ ...dish, name: e.target.value })}
        onBlur={saveName}
        aria-label="ชื่อจาน"
      />

      <div className="dish-totals-summary">
        <strong>{Math.round(dish.kcal)} kcal</strong>
        <span>
          โปรตีน {dish.protein_g}g · คาร์บ {dish.carbs_g}g · ไขมัน {dish.fat_g}g
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      <h2>วัตถุดิบ</h2>
      <ul className="dish-ingredient-list">
        {ingredients.map((ing) =>
          editingId === ing.id ? (
            <li key={ing.id} className="dish-ingredient-editing">
              <form onSubmit={(e) => handleEditSave(e, ing)} className="dish-edit-form">
                <span>{ingredientDisplayName(ing)}</span>
                <input type="number" step="0.1" min="0.1" value={editValue} onChange={(e) => setEditValue(e.target.value)} required />
                <span className="dish-edit-unit">{ing.serving_size_g != null ? "g" : "× หน่วยเดิม"}</span>
                <div className="dish-ingredient-actions">
                  <button type="submit" disabled={editSaving}>
                    {editSaving ? "..." : "บันทึก"}
                  </button>
                  <button type="button" className="dish-btn-secondary" onClick={cancelEdit}>
                    ยกเลิก
                  </button>
                </div>
              </form>
            </li>
          ) : (
            <li key={ing.id} className="dish-ingredient">
              <span className="dish-ingredient-name">
                {ingredientDisplayName(ing)}
                <span className="dish-ingredient-meta">
                  {ingredientQuantityLabel(ing)} — {Math.round(ing.kcal)} kcal · โปรตีน {ing.protein_g}g · คาร์บ {ing.carbs_g}g · ไขมัน{" "}
                  {ing.fat_g}g
                </span>
              </span>
              <span className="dish-ingredient-actions">
                <button type="button" className="dish-btn-secondary" onClick={() => startEdit(ing)}>
                  แก้ไข
                </button>
                <button type="button" className="dish-btn-danger" onClick={() => handleDeleteIngredient(ing.id)}>
                  ลบ
                </button>
              </span>
            </li>
          ),
        )}
      </ul>

      <Link className="dish-add-link" to={`/food/search?forDish=1&dishId=${id}`}>
        + เพิ่มวัตถุดิบ
      </Link>

      {ingredients.length > 0 && (
        <button type="button" className="dish-recalculate-button" onClick={handleRecalculate} disabled={recalculating}>
          {recalculating ? "กำลังคำนวณใหม่..." : "Recalculate from source"}
        </button>
      )}

      {ingredients.length > 0 && (
        <NutritionFactsLabel
          nutrients={{ kcal: dish.kcal, protein_g: dish.protein_g, carbs_g: dish.carbs_g, fat_g: dish.fat_g, nutrients: dish.nutrients }}
          servingDescription="ทั้งจาน"
        />
      )}

      <button type="button" className="dish-delete-button" onClick={handleDeleteDish}>
        ลบจานนี้
      </button>
    </main>
  );
}
