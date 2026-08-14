import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import "./SettingsMealTemplates.css";

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

export default function SettingsMealTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function loadTemplates(userId: string) {
    supabase
      .from("meal_templates")
      .select("id, name, meal_template_items(kcal)")
      .eq("user_id", userId)
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
  }

  useEffect(() => {
    if (!user) return;
    loadTemplates(user.id);
  }, [user]);

  async function handleDelete(id: string) {
    if (!user || !window.confirm("ลบมื้ออาหารนี้เลยไหม?")) return;
    setDeletingId(id);
    setError(null);
    const { error: deleteError } = await supabase.from("meal_templates").delete().eq("id", id);
    setDeletingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    loadTemplates(user.id);
  }

  return (
    <section className="settings-meal-templates">
      <h1>Settings — มื้ออาหารของฉัน</h1>
      <p className="note">ชุดอาหารที่บันทึกไว้จากหน้า Diary — เอาไว้เพิ่มเข้ามื้ออาหารได้ในคลิกเดียว</p>

      {error && <p className="error">{error}</p>}
      {templates === null && <p className="note">กำลังโหลด...</p>}
      {templates && templates.length === 0 && <p className="note">ยังไม่มีมื้ออาหารที่บันทึกไว้ — บันทึกได้จากหน้า Diary</p>}
      {templates && templates.length > 0 && (
        <ul className="settings-template-list">
          {templates.map((t) => (
            <li key={t.id}>
              <span className="settings-template-name">
                {t.name}
                <span className="settings-template-meta">
                  {t.itemCount} รายการ · {t.kcal} kcal
                </span>
              </span>
              <button type="button" className="settings-template-delete" onClick={() => handleDelete(t.id)} disabled={deletingId === t.id}>
                ลบ
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
