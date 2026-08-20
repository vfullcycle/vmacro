import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MealTemplatePickerModal from "../components/MealTemplatePickerModal";
import ProgressBar from "../components/ProgressBar";
import RecentFavoritesModal from "../components/RecentFavoritesModal";
import { useAuth } from "../lib/auth-context";
import { addDays, entryDisplayName, entryQuantityLabel, MEAL_LABELS, MEALS, todayLocalDate, type DiaryEntryRow, type Meal } from "../lib/diary";
import { scaleNutrients } from "../lib/scaling";
import { supabase } from "../lib/supabase";
import type { DayType } from "../lib/tdee";
import { useTodayTarget } from "../lib/useTodayTarget";
import "./Diary.css";

const DAY_TYPE_LABELS: Record<DayType, string> = { rest: "Rest", light: "Light", hard: "Hard" };
const DAY_TYPES: DayType[] = ["rest", "light", "hard"];

// Fallback only — the real name each user gave Shortcut #1 in their own iOS
// Shortcuts app lives in profiles.health_shortcut_name (Settings → System),
// since it's whatever they typed when building it, not something this app
// controls (FR-HLTH-1, "sync now" button instead of waiting for a scheduled run).
const DEFAULT_HEALTH_SYNC_SHORTCUT_NAME = "Vmacro: Sync to Health";
const IS_IOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

export default function Diary() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get("date") ?? todayLocalDate();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<DiaryEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, dayType, dayTypeSaving, selectDayType, target, error: targetError } = useTodayTarget(date);
  const [shortcutName, setShortcutName] = useState(DEFAULT_HEALTH_SYNC_SHORTCUT_NAME);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [pickerMeal, setPickerMeal] = useState<Meal | null>(null);
  const [recentFavMeal, setRecentFavMeal] = useState<Meal | null>(null);
  const [savingTemplateMeal, setSavingTemplateMeal] = useState<Meal | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);

  async function loadEntries() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("diary_entries")
      .select(
        "id, entry_date, meal, source, custom_food_id, dish_id, fatsecret_food_id, fatsecret_food_name, quick_name, quantity, serving_size_g, kcal, protein_g, carbs_g, fat_g, nutrients, custom_foods(name), dishes(name)",
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
    if (profile?.health_shortcut_name) setShortcutName(profile.health_shortcut_name);
  }, [profile]);

  useEffect(() => {
    if (targetError) setError(targetError);
  }, [targetError]);

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

  async function handleSaveTemplate(e: React.FormEvent, mealEntries: DiaryEntryRow[]) {
    e.preventDefault();
    if (!user || !templateName.trim()) return;
    setTemplateSaving(true);
    setError(null);

    const { data: template, error: templateError } = await supabase
      .from("meal_templates")
      .insert({ user_id: user.id, name: templateName.trim() })
      .select("id")
      .single();
    if (templateError) {
      setError(templateError.message);
      setTemplateSaving(false);
      return;
    }

    const items = mealEntries.map((entry) => ({
      template_id: template.id,
      source: entry.source,
      custom_food_id: entry.custom_food_id,
      dish_id: entry.dish_id,
      fatsecret_food_id: entry.fatsecret_food_id,
      fatsecret_food_name: entry.fatsecret_food_name,
      quick_name: entry.quick_name,
      quantity: entry.quantity,
      serving_size_g: entry.serving_size_g,
      kcal: entry.kcal,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g,
      fat_g: entry.fat_g,
      nutrients: entry.nutrients,
    }));
    const { error: itemsError } = await supabase.from("meal_template_items").insert(items);
    setTemplateSaving(false);
    if (itemsError) {
      setError(itemsError.message);
      return;
    }
    setSavingTemplateMeal(null);
    setTemplateName("");
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

  async function copyFromYesterday(mealFilter?: Meal) {
    if (!user) return;
    const yesterday = addDays(date, -1);
    const confirmMsg = mealFilter
      ? `คัดลอกมื้อ${MEAL_LABELS[mealFilter]}จากวันที่ ${yesterday} มาที่วันนี้?`
      : `คัดลอกทั้งวันจากวันที่ ${yesterday} มาที่วันนี้?`;
    if (!window.confirm(confirmMsg)) return;

    setError(null);
    let query = supabase
      .from("diary_entries")
      .select(
        "meal, source, custom_food_id, dish_id, fatsecret_food_id, fatsecret_food_name, quick_name, quantity, serving_size_g, kcal, protein_g, carbs_g, fat_g, nutrients",
      )
      .eq("user_id", user.id)
      .eq("entry_date", yesterday);
    if (mealFilter) query = query.eq("meal", mealFilter);

    const { data: items, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    if (!items || items.length === 0) {
      setError(mealFilter ? "วันก่อนหน้าไม่มีรายการในมื้อนี้" : "วันก่อนหน้าไม่มีรายการบันทึกไว้");
      return;
    }

    const rows = items.map((item) => ({ ...item, user_id: user.id, entry_date: date }));
    const { error: insertError } = await supabase.from("diary_entries").insert(rows);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await loadEntries();
  }

  const isToday = date === todayLocalDate();

  return (
    <section className="diary-page">
      <div className="diary-date-nav">
        <button type="button" onClick={() => goToDate(addDays(date, -1))} aria-label="วันก่อนหน้า">
          ←
        </button>
        <button
          type="button"
          className="diary-date-label"
          onClick={() => {
            const input = dateInputRef.current;
            if (!input) return;
            if (typeof input.showPicker === "function") input.showPicker();
            else input.focus();
          }}
        >
          {new Date(`${date}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
          {isToday && <span className="diary-today-badge">วันนี้</span>}
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={date}
          onChange={(e) => e.target.value && goToDate(e.target.value)}
          className="diary-date-input-hidden"
          aria-label="เลือกวันที่"
        />
        <button type="button" onClick={() => goToDate(addDays(date, 1))} aria-label="วันถัดไป">
          →
        </button>
      </div>

      <div className="diary-day-type" role="group" aria-label="ประเภทวัน">
        {DAY_TYPES.map((dt) => (
          <button
            key={dt}
            type="button"
            className={dayType === dt ? "diary-day-type-btn active" : "diary-day-type-btn"}
            disabled={dayTypeSaving || dayType === null}
            onClick={() => selectDayType(dt)}
          >
            {DAY_TYPE_LABELS[dt]}
          </button>
        ))}
      </div>

      {target ? (
        <div className="diary-summary">
          <ProgressBar label="แคลอรี่" value={totals.kcal} target={target.kcal} />
          <ProgressBar label="โปรตีน" value={totals.protein_g} target={target.protein_g} />
          <ProgressBar label="คาร์บ" value={totals.carbs_g} target={target.carb_g} />
          <ProgressBar label="ไขมัน" value={totals.fat_g} target={target.fat_g} />
          {target.hit_floor && (
            <p className="diary-day-type-warning">
              Allowance วันนี้ต่ำเกินไป — carb/fat ชน floor ที่ตั้งไว้แล้ว เป้า kcal ด้านบนจึงสูงกว่าที่ day
              type ควรให้จริง ปรับ allowance หรือ protein target ใน Settings → System ถ้าต้องการเป้าที่เข้มกว่านี้
            </p>
          )}
        </div>
      ) : (
        <p className="diary-summary-missing">
          ยังตั้งค่า Settings → Profile ไม่ครบ — <Link to="/settings/profile">ตั้งค่าเพื่อดู target</Link>
        </p>
      )}

      <button type="button" className="diary-add-link diary-copy-day-link" onClick={() => copyFromYesterday()}>
        คัดลอกทั้งวันจากวันก่อนหน้า
      </button>

      {isToday && IS_IOS && (
        <a
          className="diary-add-link diary-health-sync-link"
          href={`shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}`}
        >
          ซิงก์ยอดวันนี้เข้า Apple Health
        </a>
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
                          {entryQuantityLabel(entry)} — {Math.round(entry.kcal)} kcal · โปรตีน {entry.protein_g}g · คาร์บ {entry.carbs_g}g ·
                          ไขมัน {entry.fat_g}g
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

              <div className="diary-meal-actions">
                <Link className="diary-add-link" to={`/food/search?forDiary=1&date=${date}&meal=${meal}`}>
                  + เพิ่มอาหาร
                </Link>
                <button type="button" className="diary-add-link" onClick={() => setPickerMeal(meal)}>
                  มื้ออาหารของฉัน
                </button>
                <button type="button" className="diary-add-link" onClick={() => setRecentFavMeal(meal)}>
                  โปรด/ล่าสุด
                </button>
                <button type="button" className="diary-add-link" onClick={() => copyFromYesterday(meal)}>
                  คัดลอกจากวันก่อนหน้า
                </button>
              </div>

              {mealEntries.length > 0 &&
                (savingTemplateMeal === meal ? (
                  <form onSubmit={(e) => handleSaveTemplate(e, mealEntries)} className="diary-save-template-form">
                    <input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="ชื่อมื้ออาหาร"
                      required
                      autoFocus
                    />
                    <button type="submit" disabled={templateSaving}>
                      {templateSaving ? "..." : "บันทึก"}
                    </button>
                    <button
                      type="button"
                      className="diary-btn-secondary"
                      onClick={() => {
                        setSavingTemplateMeal(null);
                        setTemplateName("");
                      }}
                    >
                      ยกเลิก
                    </button>
                  </form>
                ) : (
                  <button type="button" className="diary-save-template-link" onClick={() => setSavingTemplateMeal(meal)}>
                    บันทึกเป็นมื้ออาหารของฉัน
                  </button>
                ))}
            </div>
          );
        })
      )}

      {pickerMeal && (
        <MealTemplatePickerModal
          diary={{ date, meal: pickerMeal }}
          onClose={() => setPickerMeal(null)}
          onApplied={async () => {
            setPickerMeal(null);
            await loadEntries();
          }}
        />
      )}

      {recentFavMeal && (
        <RecentFavoritesModal
          diary={{ date, meal: recentFavMeal }}
          onClose={() => setRecentFavMeal(null)}
          onApplied={async () => {
            setRecentFavMeal(null);
            await loadEntries();
          }}
        />
      )}
    </section>
  );
}
