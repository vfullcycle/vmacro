import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { MEAL_LABELS } from "../lib/diary";
import { computeDefaultMealWindows, resolveMealWindows, type MealWindows, type MealWithWindow, type TimeWindow } from "../lib/mealTargets";
import { supabase } from "../lib/supabase";
import "./SettingsMealTargets.css";

const MEALS_WITH_WINDOW: MealWithWindow[] = ["breakfast", "lunch", "dinner"];

interface MealTargetsForm {
  wake_time: string | null;
  sleep_hours_target: number;
  meal_time_overrides: Partial<MealWindows>;
  breakfast_pct: number;
  lunch_pct: number;
  dinner_pct: number;
  snack_pct: number;
}

export default function SettingsMealTargets() {
  const { user } = useAuth();
  const [form, setForm] = useState<MealTargetsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("wake_time, sleep_hours_target, meal_time_overrides, breakfast_pct, lunch_pct, dinner_pct, snack_pct")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (data) {
          const row = data as MealTargetsForm;
          setForm({ ...row, wake_time: row.wake_time ? row.wake_time.slice(0, 5) : null });
        }
        setLoading(false);
      });
  }, [user]);

  function setMealWindow(meal: MealWithWindow, window: TimeWindow) {
    if (!form) return;
    setForm({ ...form, meal_time_overrides: { ...form.meal_time_overrides, [meal]: window } });
  }

  function resetMealWindow(meal: MealWithWindow) {
    if (!form) return;
    const next = { ...form.meal_time_overrides };
    delete next[meal];
    setForm({ ...form, meal_time_overrides: next });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !user) return;

    if (form.wake_time) {
      const pctSum = form.breakfast_pct + form.lunch_pct + form.dinner_pct + form.snack_pct;
      if (Math.round(pctSum) !== 100) {
        setError(`สัดส่วน % ต่อมื้อต้องรวมกันเท่ากับ 100 (ตอนนี้รวม ${pctSum})`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);

    setSaving(false);
    if (error) setError(error.message);
    else setSaved(true);
  }

  if (loading) return <p>กำลังโหลด...</p>;
  if (!form) return <p className="error">{error ?? "ไม่พบข้อมูล"}</p>;

  return (
    <section className="settings-meal-targets">
      <h1>เป้าต่อมื้ออาหาร</h1>
      <p className="note">
        กระจายเป้า kcal/macro ของวัน (หลัง day-type แล้ว) เป็นเป้าต่อมื้อ ตามเวลาโดยประมาณที่คำนวณจากเวลา
        ตื่นนอน — ยังไม่ตั้งเวลาตื่นนอนจะไม่เปิดใช้ส่วนนี้ (หน้า Diary/Dashboard ทำงานแบบเดิมปกติ)
      </p>

      <form onSubmit={handleSave}>
        <label>
          เวลาตื่นนอน
          <input type="time" value={form.wake_time ?? ""} onChange={(e) => setForm({ ...form, wake_time: e.target.value || null })} />
        </label>

        {form.wake_time && (
          <>
            <label>
              ชั่วโมงนอนที่ต้องการ
              <input
                type="number"
                step="0.5"
                min="1"
                max="16"
                value={form.sleep_hours_target}
                onChange={(e) => setForm({ ...form, sleep_hours_target: Number(e.target.value) })}
              />
            </label>
            <p className="note">
              แก้เวลาตื่นนอน/ชั่วโมงนอนแล้ว มื้อที่เคยตั้งเวลาเองไว้ (ปุ่ม "รีเซ็ต" ปรากฏ) จะไม่เปลี่ยนตาม —
              กด "รีเซ็ต" ที่มื้อนั้นถ้าต้องการใช้เวลาที่คำนวณใหม่
            </p>

            {(() => {
              const defaults = computeDefaultMealWindows(form.wake_time, form.sleep_hours_target);
              const resolved = resolveMealWindows(defaults, form.meal_time_overrides);
              return MEALS_WITH_WINDOW.map((meal) => {
                const isOverridden = form.meal_time_overrides[meal] != null;
                const window = resolved[meal];
                return (
                  <div key={meal} className="meal-window-row">
                    <span className="meal-window-label">{MEAL_LABELS[meal]}</span>
                    <input type="time" value={window.start} onChange={(e) => setMealWindow(meal, { ...window, start: e.target.value })} />
                    <span>–</span>
                    <input type="time" value={window.end} onChange={(e) => setMealWindow(meal, { ...window, end: e.target.value })} />
                    {isOverridden && (
                      <button type="button" className="meal-window-reset" onClick={() => resetMealWindow(meal)}>
                        รีเซ็ต
                      </button>
                    )}
                  </div>
                );
              });
            })()}

            <p className="note">
              สัดส่วน % ของเป้าต่อมื้อ (รวมต้องเท่ากับ 100 — เช้า/กลางวัน/เย็น มีเวลาข้างบน ส่วนของว่างเป็น
              โควตาลอย กินตอนไหนก็ได้ทั้งวัน ไม่มีช่วงเวลาของตัวเอง)
            </p>
            <div className="meal-pct-row">
              <label>
                เช้า
                <input type="number" step="1" min="0" max="100" value={form.breakfast_pct} onChange={(e) => setForm({ ...form, breakfast_pct: Number(e.target.value) })} />
              </label>
              <label>
                กลางวัน
                <input type="number" step="1" min="0" max="100" value={form.lunch_pct} onChange={(e) => setForm({ ...form, lunch_pct: Number(e.target.value) })} />
              </label>
              <label>
                เย็น
                <input type="number" step="1" min="0" max="100" value={form.dinner_pct} onChange={(e) => setForm({ ...form, dinner_pct: Number(e.target.value) })} />
              </label>
              <label>
                ว่าง
                <input type="number" step="1" min="0" max="100" value={form.snack_pct} onChange={(e) => setForm({ ...form, snack_pct: Number(e.target.value) })} />
              </label>
            </div>
            {Math.round(form.breakfast_pct + form.lunch_pct + form.dinner_pct + form.snack_pct) !== 100 && (
              <p className="error">รวม % ต้องเท่ากับ 100 (ตอนนี้รวม {form.breakfast_pct + form.lunch_pct + form.dinner_pct + form.snack_pct})</p>
            )}
          </>
        )}

        {error && <p className="error">{error}</p>}
        {saved && <p className="ok">บันทึกแล้ว</p>}

        <button type="submit" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </form>
    </section>
  );
}
