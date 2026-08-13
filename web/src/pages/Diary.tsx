import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { addDays, entryDisplayName, entryQuantityLabel, MEAL_LABELS, MEALS, todayLocalDate, type DiaryEntryRow, type Meal } from "../lib/diary";
import { computeFullPreview } from "../lib/preview";
import { scaleNutrients } from "../lib/scaling";
import { supabase } from "../lib/supabase";
import "./Diary.css";

interface ProfileForTarget {
  sex: "male" | "female" | null;
  birth_date: string | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  body_fat_pct: number | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "extra_active" | null;
  goal: "lose" | "maintain" | "gain" | null;
  formula_choice: "mifflin" | "katch_mcardle" | "harris_benedict";
  default_protein_g_per_kg: number | null;
  default_fat_pct: number | null;
}

interface Target {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

function ProgressBar({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="diary-progress">
      <div className="diary-progress-label">
        <span>{label}</span>
        <span>
          {Math.round(value)} / {Math.round(target)}
        </span>
      </div>
      <div className="diary-progress-track">
        <div className="diary-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Diary() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get("date") ?? todayLocalDate();

  const [entries, setEntries] = useState<DiaryEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<Target | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function loadEntries() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("diary_entries")
      .select(
        "id, entry_date, meal, source, custom_food_id, dish_id, fatsecret_food_id, fatsecret_food_name, quantity, serving_size_g, kcal, protein_g, carbs_g, fat_g, nutrients, custom_foods(name), dishes(name)",
      )
      .eq("user_id", user.id)
      .eq("entry_date", date)
      .order("created_at", { ascending: true });
    if (error) setError(error.message);
    else setEntries((data as unknown as DiaryEntryRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
    setEditingId(null);
  }, [user, date]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select(
        "sex, birth_date, height_cm, current_weight_kg, body_fat_pct, activity_level, goal, formula_choice, default_protein_g_per_kg, default_fat_pct",
      )
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const p = data as ProfileForTarget | null;
        if (!p || !p.sex || !p.birth_date || !p.height_cm || !p.current_weight_kg || !p.activity_level || !p.goal) {
          setTarget(null);
          return;
        }
        const preview = computeFullPreview({
          formula: p.formula_choice,
          sex: p.sex,
          birth_date: p.birth_date,
          height_cm: p.height_cm,
          weight_kg: p.current_weight_kg,
          body_fat_pct: p.body_fat_pct,
          activity_level: p.activity_level,
          goal: p.goal,
          protein_g_per_kg: p.default_protein_g_per_kg,
          fat_pct: p.default_fat_pct,
        });
        setTarget({ kcal: preview.target.target_kcal, protein_g: preview.macros.protein_g, carb_g: preview.macros.carb_g, fat_g: preview.macros.fat_g });
      });
  }, [user]);

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => ({
          kcal: acc.kcal + e.kcal,
          protein_g: acc.protein_g + e.protein_g,
          carbs_g: acc.carbs_g + e.carbs_g,
          fat_g: acc.fat_g + e.fat_g,
        }),
        { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      ),
    [entries],
  );

  function goToDate(d: string) {
    setSearchParams({ date: d });
  }

  function startEdit(entry: DiaryEntryRow) {
    setEditingId(entry.id);
    setEditValue(entry.serving_size_g != null ? String(Math.round(entry.quantity * entry.serving_size_g)) : String(entry.quantity));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function handleEditSave(e: React.FormEvent, entry: DiaryEntryRow) {
    e.preventDefault();
    const edited = Number(editValue);
    if (!edited || edited <= 0) return;

    const newQuantity = entry.serving_size_g != null ? edited / entry.serving_size_g : edited;
    const ratio = newQuantity / entry.quantity;

    setEditSaving(true);
    setError(null);

    const rescaled = scaleNutrients({
      base: { kcal: entry.kcal, protein_g: entry.protein_g, carbs_g: entry.carbs_g, fat_g: entry.fat_g, nutrients: entry.nutrients },
      baseServingGrams: null,
      quantityMode: "servings",
      quantityValue: ratio,
    });

    const { error: updateError } = await supabase
      .from("diary_entries")
      .update({
        quantity: newQuantity,
        kcal: rescaled.kcal,
        protein_g: rescaled.protein_g,
        carbs_g: rescaled.carbs_g,
        fat_g: rescaled.fat_g,
        nutrients: rescaled.nutrients,
      })
      .eq("id", entry.id);

    setEditSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    cancelEdit();
    await loadEntries();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("ลบรายการนี้?")) return;
    setError(null);
    const { error: deleteError } = await supabase.from("diary_entries").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (editingId === id) cancelEdit();
    await loadEntries();
  }

  const isToday = date === todayLocalDate();

  return (
    <section className="diary-page">
      <div className="diary-date-nav">
        <button type="button" onClick={() => goToDate(addDays(date, -1))} aria-label="วันก่อนหน้า">
          ←
        </button>
        <span className="diary-date-label">
          {new Date(`${date}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
          {isToday && <span className="diary-today-badge">วันนี้</span>}
        </span>
        <button type="button" onClick={() => goToDate(addDays(date, 1))} aria-label="วันถัดไป">
          →
        </button>
      </div>

      {target ? (
        <div className="diary-summary">
          <ProgressBar label="แคลอรี่" value={totals.kcal} target={target.kcal} />
          <ProgressBar label="โปรตีน" value={totals.protein_g} target={target.protein_g} />
          <ProgressBar label="คาร์บ" value={totals.carbs_g} target={target.carb_g} />
          <ProgressBar label="ไขมัน" value={totals.fat_g} target={target.fat_g} />
        </div>
      ) : (
        <p className="diary-summary-missing">
          ยังตั้งค่า Settings → Profile ไม่ครบ — <Link to="/settings/profile">ตั้งค่าเพื่อดู target</Link>
        </p>
      )}

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : (
        MEALS.map((meal) => {
          const mealEntries = entries.filter((e) => e.meal === meal);
          const mealKcal = mealEntries.reduce((sum, e) => sum + e.kcal, 0);
          return (
            <div key={meal} className="diary-meal-section">
              <div className="diary-meal-header">
                <h2>{MEAL_LABELS[meal as Meal]}</h2>
                {mealEntries.length > 0 && <span className="diary-meal-kcal">{Math.round(mealKcal)} kcal</span>}
              </div>

              <ul className="diary-entry-list">
                {mealEntries.map((entry) =>
                  editingId === entry.id ? (
                    <li key={entry.id} className="diary-entry-editing">
                      <form onSubmit={(e) => handleEditSave(e, entry)} className="diary-edit-form">
                        <span>{entryDisplayName(entry)}</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          required
                        />
                        <span className="diary-edit-unit">{entry.serving_size_g != null ? "g" : "× หน่วยเดิม"}</span>
                        <div className="diary-entry-actions">
                          <button type="submit" disabled={editSaving}>
                            {editSaving ? "..." : "บันทึก"}
                          </button>
                          <button type="button" className="diary-btn-secondary" onClick={cancelEdit}>
                            ยกเลิก
                          </button>
                        </div>
                      </form>
                    </li>
                  ) : (
                    <li key={entry.id} className="diary-entry">
                      <span className="diary-entry-name">
                        {entryDisplayName(entry)}
                        <span className="diary-entry-meta">
                          {entryQuantityLabel(entry)} — {Math.round(entry.kcal)} kcal
                        </span>
                      </span>
                      <span className="diary-entry-actions">
                        <button type="button" className="diary-btn-secondary" onClick={() => startEdit(entry)}>
                          แก้ไข
                        </button>
                        <button type="button" className="diary-btn-danger" onClick={() => handleDelete(entry.id)}>
                          ลบ
                        </button>
                      </span>
                    </li>
                  ),
                )}
              </ul>

              <Link className="diary-add-link" to={`/food/search?forDiary=1&date=${date}&meal=${meal}`}>
                + เพิ่มอาหาร
              </Link>
            </div>
          );
        })
      )}
    </section>
  );
}
