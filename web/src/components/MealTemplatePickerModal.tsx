import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import type { Meal } from "../lib/diary";
import { supabase } from "../lib/supabase";
import "./MealTemplatePickerModal.css";

interface TemplateSummary {
  id: string;
  name: string;
  itemCount: number;
  kcal: number;
}

interface RawTemplateRow {
  id: string;
  name: string;
  meal_template_items: { kcal: number }[] | null;
}

export default function MealTemplatePickerModal({
  diary,
  onClose,
  onApplied,
}: {
  diary: { date: string; meal: Meal };
  onClose: () => void;
  onApplied: () => void;
}) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("meal_templates")
      .select("id, name, meal_template_items(kcal)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
          return;
        }
        const rows = (data as unknown as RawTemplateRow[]) ?? [];
        setTemplates(
          rows.map((t) => ({
            id: t.id,
            name: t.name,
            itemCount: t.meal_template_items?.length ?? 0,
            kcal: Math.round((t.meal_template_items ?? []).reduce((sum, i) => sum + i.kcal, 0)),
          })),
        );
      });
  }, [user]);

  async function applyTemplate(templateId: string) {
    if (!user) return;
    setApplyingId(templateId);
    setError(null);

    const { data: items, error: itemsError } = await supabase
      .from("meal_template_items")
      .select(
        "source, custom_food_id, dish_id, fatsecret_food_id, fatsecret_food_name, quick_name, quantity, serving_size_g, kcal, protein_g, carbs_g, fat_g, nutrients",
      )
      .eq("template_id", templateId);
    if (itemsError) {
      setError(itemsError.message);
      setApplyingId(null);
      return;
    }

    const rows = (items ?? []).map((item) => ({
      ...item,
      user_id: user.id,
      entry_date: diary.date,
      meal: diary.meal,
    }));
    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("diary_entries").insert(rows);
      if (insertError) {
        setError(insertError.message);
        setApplyingId(null);
        return;
      }
    }
    setApplyingId(null);
    onApplied();
  }

  return (
    <div className="template-picker-backdrop" onClick={onClose}>
      <div className="template-picker-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>มื้ออาหารของฉัน</h2>

        {error && <p className="error">{error}</p>}

        {templates === null && <p className="hint">กำลังโหลด...</p>}
        {templates && templates.length === 0 && (
          <p className="hint">ยังไม่มีมื้ออาหารที่บันทึกไว้ — บันทึกจากมื้อที่มีรายการอยู่ก่อนได้เลย</p>
        )}

        {templates && templates.length > 0 && (
          <ul className="template-picker-list">
            {templates.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => applyTemplate(t.id)} disabled={applyingId === t.id}>
                  <span className="template-picker-name">{t.name}</span>
                  <span className="template-picker-meta">
                    {t.itemCount} รายการ · {t.kcal} kcal
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="template-picker-cancel" onClick={onClose}>
          ปิด
        </button>
      </div>
    </div>
  );
}
