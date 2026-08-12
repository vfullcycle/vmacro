import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import type { NutrientPanel } from "../lib/scaling";
import { supabase } from "../lib/supabase";
import "./CustomFoodForm.css";

interface FormState {
  name: string;
  serving_label: string;
  serving_size_g: string;
  kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  fiber_g: string;
  sugar_g: string;
  sodium_mg: string;
}

const EMPTY: FormState = {
  name: "",
  serving_label: "",
  serving_size_g: "",
  kcal: "",
  protein_g: "",
  carbs_g: "",
  fat_g: "",
  fiber_g: "",
  sugar_g: "",
  sodium_mg: "",
};

function buildNutrients(form: FormState): NutrientPanel {
  const nutrients: NutrientPanel = {};
  if (form.fiber_g) nutrients.fiber_g = Number(form.fiber_g);
  if (form.sugar_g) nutrients.sugar_g = Number(form.sugar_g);
  if (form.sodium_mg) nutrients.sodium_mg = Number(form.sodium_mg);
  return nutrients;
}

export default function CustomFoodForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notOwner, setNotOwner] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    supabase
      .from("custom_foods")
      .select("creator_id, name, serving_label, serving_size_g, kcal, protein_g, carbs_g, fat_g, nutrients")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else if (data) {
          if (data.creator_id !== user?.id) {
            setNotOwner(true);
          } else {
            const nutrients = (data.nutrients ?? {}) as NutrientPanel;
            setForm({
              name: data.name,
              serving_label: data.serving_label ?? "",
              serving_size_g: String(data.serving_size_g),
              kcal: String(data.kcal),
              protein_g: String(data.protein_g),
              carbs_g: String(data.carbs_g),
              fat_g: String(data.fat_g),
              fiber_g: nutrients.fiber_g != null ? String(nutrients.fiber_g) : "",
              sugar_g: nutrients.sugar_g != null ? String(nutrients.sugar_g) : "",
              sodium_mg: nutrients.sodium_mg != null ? String(nutrients.sodium_mg) : "",
            });
          }
        }
        setLoading(false);
      });
  }, [id, isEdit, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);

    const row = {
      name: form.name,
      serving_label: form.serving_label || null,
      serving_size_g: Number(form.serving_size_g),
      kcal: Number(form.kcal),
      protein_g: Number(form.protein_g),
      carbs_g: Number(form.carbs_g),
      fat_g: Number(form.fat_g),
      nutrients: buildNutrients(form),
    };

    if (isEdit && id) {
      const { error } = await supabase.from("custom_foods").update(row).eq("id", id);
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      navigate(`/food/custom/${id}`);
    } else {
      const { data, error } = await supabase
        .from("custom_foods")
        .insert({ ...row, creator_id: user.id })
        .select("id")
        .single();
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      navigate(`/food/custom/${data.id}`);
    }
  }

  async function handleDelete() {
    if (!id || !confirm("ลบอาหารนี้เลยไหม? ลบแล้วกู้คืนไม่ได้")) return;
    const { error } = await supabase.from("custom_foods").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    navigate("/food/search");
  }

  if (loading) return <p>กำลังโหลด...</p>;
  if (notOwner) return <p className="error">แก้ไขได้เฉพาะคนสร้างอาหารนี้เท่านั้น</p>;

  return (
    <main className="custom-food-form-page">
      <h1>{isEdit ? "แก้ไขอาหาร" : "เพิ่มอาหารใหม่"}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          ชื่ออาหาร
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>

        <label>
          ชื่อ serving (เช่น "1 จาน", "1 ทัพพี") — ไม่บังคับ
          <input value={form.serving_label} onChange={(e) => setForm({ ...form, serving_label: e.target.value })} />
        </label>

        <label>
          น้ำหนัก 1 serving (กรัม)
          <input type="number" step="0.1" value={form.serving_size_g} onChange={(e) => setForm({ ...form, serving_size_g: e.target.value })} required />
        </label>

        <div className="form-row">
          <label>
            Kcal
            <input type="number" step="0.1" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} required />
          </label>
          <label>
            Protein (g)
            <input type="number" step="0.1" value={form.protein_g} onChange={(e) => setForm({ ...form, protein_g: e.target.value })} required />
          </label>
        </div>

        <div className="form-row">
          <label>
            Carbs (g)
            <input type="number" step="0.1" value={form.carbs_g} onChange={(e) => setForm({ ...form, carbs_g: e.target.value })} required />
          </label>
          <label>
            Fat (g)
            <input type="number" step="0.1" value={form.fat_g} onChange={(e) => setForm({ ...form, fat_g: e.target.value })} required />
          </label>
        </div>

        <p className="form-section-label">ข้อมูลเสริม (ถ้ามี)</p>
        <div className="form-row">
          <label>
            Fiber (g)
            <input type="number" step="0.1" value={form.fiber_g} onChange={(e) => setForm({ ...form, fiber_g: e.target.value })} />
          </label>
          <label>
            Sugar (g)
            <input type="number" step="0.1" value={form.sugar_g} onChange={(e) => setForm({ ...form, sugar_g: e.target.value })} />
          </label>
        </div>
        <label>
          Sodium (mg)
          <input type="number" step="1" value={form.sodium_mg} onChange={(e) => setForm({ ...form, sodium_mg: e.target.value })} />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={saving}>
          {saving ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "เพิ่มอาหาร"}
        </button>

        {isEdit && (
          <button type="button" className="delete-button" onClick={handleDelete}>
            ลบอาหารนี้
          </button>
        )}
      </form>
    </main>
  );
}
