import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import "./SettingsSystem.css";

type UnitSystem = "metric" | "imperial";

interface SystemForm {
  unit_system: UnitSystem;
  default_protein_g_per_kg: number | null;
  default_fat_pct: number | null;
}

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

function MealTemplateManager({ userId }: { userId: string }) {
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function loadTemplates() {
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

  useEffect(loadTemplates, [userId]);

  async function handleDelete(id: string) {
    if (!window.confirm("ลบ template นี้เลยไหม?")) return;
    setDeletingId(id);
    setError(null);
    const { error: deleteError } = await supabase.from("meal_templates").delete().eq("id", id);
    setDeletingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    loadTemplates();
  }

  return (
    <section className="settings-system-templates">
      <h2>Meal templates</h2>
      {error && <p className="error">{error}</p>}
      {templates === null && <p className="note">กำลังโหลด...</p>}
      {templates && templates.length === 0 && <p className="note">ยังไม่มี template — บันทึกได้จากหน้า Diary</p>}
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

export default function SettingsSystem() {
  const { user } = useAuth();
  const [form, setForm] = useState<SystemForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("unit_system, default_protein_g_per_kg, default_fat_pct")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (data) setForm(data as SystemForm);
        setLoading(false);
      });
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !user) return;
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
    <section className="settings-system">
      <h1>Settings — System</h1>
      <form onSubmit={handleSave}>
        <label>
          หน่วยแสดงผล
          <select value={form.unit_system} onChange={(e) => setForm({ ...form, unit_system: e.target.value as UnitSystem })}>
            <option value="metric">Metric (kg, cm)</option>
            <option value="imperial">Imperial (lb, ft/in)</option>
          </select>
        </label>
        <p className="note">
          หมายเหตุ: ตอนนี้เก็บค่า preference ไว้ก่อน ยังไม่มีหน้าไหนแปลงหน่วยแสดงผลจริง (ไม่มี AC บังคับใน FR-SET-1) — จะเดินสายแปลงหน่วยเมื่อมี field ที่ต้องใช้จริงใน phase ถัดไป
        </p>

        <label>
          Default protein (g/kg น้ำหนักตัว)
          <input
            type="number"
            step="0.1"
            placeholder="ใช้ default ตาม goal (2.0 / 1.6 / 1.8)"
            value={form.default_protein_g_per_kg ?? ""}
            onChange={(e) =>
              setForm({ ...form, default_protein_g_per_kg: e.target.value ? Number(e.target.value) : null })
            }
          />
        </label>

        <label>
          Default fat floor (% ของ kcal เป้าหมาย)
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            placeholder="ใช้ default 25%"
            value={form.default_fat_pct != null ? form.default_fat_pct * 100 : ""}
            onChange={(e) =>
              setForm({ ...form, default_fat_pct: e.target.value ? Number(e.target.value) / 100 : null })
            }
          />
        </label>

        {error && <p className="error">{error}</p>}
        {saved && <p className="ok">บันทึกแล้ว</p>}

        <button type="submit" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </form>

      {user && <MealTemplateManager userId={user.id} />}
    </section>
  );
}
