import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import type { NutrientPanel } from "../lib/scaling";
import { supabase } from "../lib/supabase";
import "./CustomFoodForm.css";

interface CoreFormState {
  name: string;
  serving_label: string;
  serving_size_g: string;
  kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
}

const EMPTY_CORE: CoreFormState = {
  name: "",
  serving_label: "",
  serving_size_g: "",
  kcal: "",
  protein_g: "",
  carbs_g: "",
  fat_g: "",
};

type ExtraGroup = "fat" | "carb" | "other" | "vitamin" | "mineral";
type ExtraFormState = Record<string, string>;

const EXTRA_FIELDS: { key: string; label: string; group: ExtraGroup }[] = [
  { key: "saturated_fat_g", label: "Saturated Fat (g)", group: "fat" },
  { key: "trans_fat_g", label: "Trans Fat (g)", group: "fat" },
  { key: "polyunsaturated_fat_g", label: "Polyunsaturated Fat (g)", group: "fat" },
  { key: "monounsaturated_fat_g", label: "Monounsaturated Fat (g)", group: "fat" },
  { key: "fiber_g", label: "Fiber (g)", group: "carb" },
  { key: "sugar_g", label: "Sugar (g)", group: "carb" },
  { key: "added_sugars_g", label: "Added Sugars (g)", group: "carb" },
  { key: "cholesterol_mg", label: "Cholesterol (mg)", group: "other" },
  { key: "sodium_mg", label: "Sodium (mg)", group: "other" },
  { key: "vitamin_a_mcg", label: "Vitamin A (mcg)", group: "vitamin" },
  { key: "vitamin_c_mg", label: "Vitamin C (mg)", group: "vitamin" },
  { key: "vitamin_d_mcg", label: "Vitamin D (mcg)", group: "vitamin" },
  { key: "calcium_mg", label: "Calcium (mg)", group: "mineral" },
  { key: "iron_mg", label: "Iron (mg)", group: "mineral" },
  { key: "potassium_mg", label: "Potassium (mg)", group: "mineral" },
];

const GROUP_LABELS: Record<ExtraGroup, string> = {
  fat: "ไขมันแยกประเภท",
  carb: "คาร์โบไฮเดรตแยกประเภท",
  other: "อื่นๆ",
  vitamin: "วิตามิน",
  mineral: "แร่ธาตุ",
};

const GROUP_ORDER: ExtraGroup[] = ["fat", "carb", "other", "vitamin", "mineral"];

function buildNutrients(extras: ExtraFormState): NutrientPanel {
  const nutrients: NutrientPanel = {};
  const vitamins: NutrientPanel = {};
  const minerals: NutrientPanel = {};
  for (const field of EXTRA_FIELDS) {
    const raw = extras[field.key];
    if (!raw) continue;
    const value = Number(raw);
    if (field.group === "vitamin") vitamins[field.key] = value;
    else if (field.group === "mineral") minerals[field.key] = value;
    else nutrients[field.key] = value;
  }
  if (Object.keys(vitamins).length) nutrients.vitamins = vitamins;
  if (Object.keys(minerals).length) nutrients.minerals = minerals;
  return nutrients;
}

function flattenNutrients(nutrients: NutrientPanel | null): ExtraFormState {
  const result: ExtraFormState = {};
  if (!nutrients) return result;
  const vitamins = nutrients.vitamins as NutrientPanel | undefined;
  const minerals = nutrients.minerals as NutrientPanel | undefined;
  for (const field of EXTRA_FIELDS) {
    let value: unknown;
    if (field.group === "vitamin") value = vitamins?.[field.key];
    else if (field.group === "mineral") value = minerals?.[field.key];
    else value = nutrients[field.key];
    if (typeof value === "number") result[field.key] = String(value);
  }
  return result;
}

export default function CustomFoodForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [core, setCore] = useState<CoreFormState>(EMPTY_CORE);
  const [extras, setExtras] = useState<ExtraFormState>({});
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
            setCore({
              name: data.name,
              serving_label: data.serving_label ?? "",
              serving_size_g: String(data.serving_size_g),
              kcal: String(data.kcal),
              protein_g: String(data.protein_g),
              carbs_g: String(data.carbs_g),
              fat_g: String(data.fat_g),
            });
            setExtras(flattenNutrients(data.nutrients as NutrientPanel | null));
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
      name: core.name,
      serving_label: core.serving_label || null,
      serving_size_g: Number(core.serving_size_g),
      kcal: Number(core.kcal),
      protein_g: Number(core.protein_g),
      carbs_g: Number(core.carbs_g),
      fat_g: Number(core.fat_g),
      nutrients: buildNutrients(extras),
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
          <input value={core.name} onChange={(e) => setCore({ ...core, name: e.target.value })} required />
        </label>

        <label>
          ชื่อ serving (เช่น "1 จาน", "1 ทัพพี") — ไม่บังคับ
          <input value={core.serving_label} onChange={(e) => setCore({ ...core, serving_label: e.target.value })} />
        </label>

        <label>
          น้ำหนัก 1 serving (กรัม)
          <input type="number" step="0.1" value={core.serving_size_g} onChange={(e) => setCore({ ...core, serving_size_g: e.target.value })} required />
        </label>

        <div className="form-row">
          <label>
            Kcal
            <input type="number" step="0.1" value={core.kcal} onChange={(e) => setCore({ ...core, kcal: e.target.value })} required />
          </label>
          <label>
            Protein (g)
            <input type="number" step="0.1" value={core.protein_g} onChange={(e) => setCore({ ...core, protein_g: e.target.value })} required />
          </label>
        </div>

        <div className="form-row">
          <label>
            Carbs (g)
            <input type="number" step="0.1" value={core.carbs_g} onChange={(e) => setCore({ ...core, carbs_g: e.target.value })} required />
          </label>
          <label>
            Fat (g)
            <input type="number" step="0.1" value={core.fat_g} onChange={(e) => setCore({ ...core, fat_g: e.target.value })} required />
          </label>
        </div>

        <p className="form-hint">ข้อมูลเสริมด้านล่างไม่บังคับ — กรอกเท่าที่มีข้อมูลจริง (เช่น จากฉลากโภชนาการ)</p>

        {GROUP_ORDER.map((group) => (
          <div key={group} className="extra-group">
            <p className="form-section-label">{GROUP_LABELS[group]}</p>
            <div className="form-grid">
              {EXTRA_FIELDS.filter((f) => f.group === group).map((field) => (
                <label key={field.key}>
                  {field.label}
                  <input
                    type="number"
                    step="0.1"
                    value={extras[field.key] ?? ""}
                    onChange={(e) => setExtras({ ...extras, [field.key]: e.target.value })}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

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
