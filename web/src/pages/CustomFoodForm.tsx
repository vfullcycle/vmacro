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
type ExtraUnit = "abs" | "pct";
type ExtraEntry = { value: string; unit: ExtraUnit };
type ExtraFormState = Record<string, ExtraEntry>;

// key = base nutrient key (matches NutritionFactsLabel); unit = the field's natural
// absolute unit. Every field can also be entered as "% ของปริมาณที่แนะนำต่อวัน" (%DV) —
// many Thai nutrition labels print only the percentage, not the absolute amount.
interface ExtraFieldDef {
  key: string;
  label: string;
  group: ExtraGroup;
  unit: "g" | "mg" | "mcg";
}

// FatSecret's API only ever returns saturated/trans/poly/mono fat, fiber, sugar,
// added sugars, cholesterol, sodium, potassium, vitamin A/C/D, calcium, iron — nothing
// else (verified against their docs, 2026-08). Everything past that (B vitamins, E, K,
// and the extended minerals) only ever comes from a user typing it in off a real label,
// so it lives here even though FatSecret-sourced foods will never populate it.
const EXTRA_FIELDS: ExtraFieldDef[] = [
  { key: "saturated_fat", label: "ไขมันอิ่มตัว", group: "fat", unit: "g" },
  { key: "trans_fat", label: "ไขมันทรานส์", group: "fat", unit: "g" },
  { key: "polyunsaturated_fat", label: "ไขมันไม่อิ่มตัวหลายตำแหน่ง", group: "fat", unit: "g" },
  { key: "monounsaturated_fat", label: "ไขมันไม่อิ่มตัวตำแหน่งเดียว", group: "fat", unit: "g" },
  { key: "fiber", label: "ใยอาหาร", group: "carb", unit: "g" },
  { key: "sugar", label: "น้ำตาล", group: "carb", unit: "g" },
  { key: "added_sugars", label: "น้ำตาลที่เติมเพิ่ม", group: "carb", unit: "g" },
  { key: "cholesterol", label: "คอเลสเตอรอล", group: "other", unit: "mg" },
  { key: "sodium", label: "โซเดียม", group: "other", unit: "mg" },
  { key: "vitamin_a", label: "วิตามินเอ", group: "vitamin", unit: "mcg" },
  { key: "vitamin_c", label: "วิตามินซี", group: "vitamin", unit: "mg" },
  { key: "vitamin_d", label: "วิตามินดี", group: "vitamin", unit: "mcg" },
  { key: "vitamin_e", label: "วิตามินอี", group: "vitamin", unit: "mg" },
  { key: "vitamin_k", label: "วิตามินเค", group: "vitamin", unit: "mcg" },
  { key: "vitamin_b1", label: "วิตามินบี1 (ไทอามีน)", group: "vitamin", unit: "mg" },
  { key: "vitamin_b2", label: "วิตามินบี2 (ไรโบฟลาวิน)", group: "vitamin", unit: "mg" },
  { key: "vitamin_b3", label: "วิตามินบี3 (ไนอาซิน)", group: "vitamin", unit: "mg" },
  { key: "vitamin_b6", label: "วิตามินบี6", group: "vitamin", unit: "mg" },
  { key: "vitamin_b12", label: "วิตามินบี12", group: "vitamin", unit: "mcg" },
  { key: "folate", label: "โฟเลต (บี9)", group: "vitamin", unit: "mcg" },
  { key: "biotin", label: "ไบโอติน (บี7)", group: "vitamin", unit: "mcg" },
  { key: "pantothenic_acid", label: "กรดแพนโททีนิก (บี5)", group: "vitamin", unit: "mg" },
  { key: "calcium", label: "แคลเซียม", group: "mineral", unit: "mg" },
  { key: "iron", label: "ธาตุเหล็ก", group: "mineral", unit: "mg" },
  { key: "potassium", label: "โพแทสเซียม", group: "mineral", unit: "mg" },
  { key: "magnesium", label: "แมกนีเซียม", group: "mineral", unit: "mg" },
  { key: "zinc", label: "สังกะสี", group: "mineral", unit: "mg" },
  { key: "phosphorus", label: "ฟอสฟอรัส", group: "mineral", unit: "mg" },
  { key: "iodine", label: "ไอโอดีน", group: "mineral", unit: "mcg" },
  { key: "selenium", label: "ซีลีเนียม", group: "mineral", unit: "mcg" },
  { key: "copper", label: "ทองแดง", group: "mineral", unit: "mg" },
  { key: "manganese", label: "แมงกานีส", group: "mineral", unit: "mg" },
  { key: "chloride", label: "คลอไรด์", group: "mineral", unit: "mg" },
];

const GROUP_LABELS: Record<ExtraGroup, string> = {
  fat: "ไขมันแยกประเภท",
  carb: "คาร์โบไฮเดรตแยกประเภท",
  other: "อื่นๆ",
  vitamin: "วิตามิน",
  mineral: "แร่ธาตุ",
};

const GROUP_ORDER: ExtraGroup[] = ["fat", "carb", "other", "vitamin", "mineral"];

function panelFor(nutrients: NutrientPanel, group: ExtraGroup): NutrientPanel {
  if (group === "vitamin") {
    if (typeof nutrients.vitamins !== "object" || nutrients.vitamins === null) nutrients.vitamins = {};
    return nutrients.vitamins as NutrientPanel;
  }
  if (group === "mineral") {
    if (typeof nutrients.minerals !== "object" || nutrients.minerals === null) nutrients.minerals = {};
    return nutrients.minerals as NutrientPanel;
  }
  return nutrients;
}

function buildNutrients(extras: ExtraFormState): NutrientPanel {
  const nutrients: NutrientPanel = {};
  for (const field of EXTRA_FIELDS) {
    const entry = extras[field.key];
    if (!entry || !entry.value) continue;
    const value = Number(entry.value);
    const storageKey = entry.unit === "pct" ? `${field.key}_pct` : `${field.key}_${field.unit}`;
    panelFor(nutrients, field.group)[storageKey] = value;
  }
  return nutrients;
}

function flattenNutrients(nutrients: NutrientPanel | null): ExtraFormState {
  const result: ExtraFormState = {};
  if (!nutrients) return result;
  const vitamins = (nutrients.vitamins as NutrientPanel | undefined) ?? {};
  const minerals = (nutrients.minerals as NutrientPanel | undefined) ?? {};
  for (const field of EXTRA_FIELDS) {
    const panel = field.group === "vitamin" ? vitamins : field.group === "mineral" ? minerals : nutrients;
    const absKey = `${field.key}_${field.unit}`;
    const pctKey = `${field.key}_pct`;
    if (typeof panel[absKey] === "number") result[field.key] = { value: String(panel[absKey]), unit: "abs" };
    else if (typeof panel[pctKey] === "number") result[field.key] = { value: String(panel[pctKey]), unit: "pct" };
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

        <p className="form-hint">
          ข้อมูลเสริมด้านล่างไม่บังคับ — กรอกเท่าที่มีข้อมูลจริง (เช่น จากฉลากโภชนาการ) เลือกหน่วยได้ทั้งค่าจริง ({"มก./ไมโครกรัม"})
          หรือ % ของปริมาณที่แนะนำต่อวัน ถ้าฉลากให้มาแค่ %
        </p>

        {GROUP_ORDER.map((group) => (
          <div key={group} className="extra-group">
            <p className="form-section-label">{GROUP_LABELS[group]}</p>
            <div className="form-grid">
              {EXTRA_FIELDS.filter((f) => f.group === group).map((field) => {
                const entry = extras[field.key] ?? { value: "", unit: "abs" as const };
                return (
                  <label key={field.key} className="extra-field-row">
                    {field.label}
                    <span className="extra-field-input-group">
                      <input
                        type="number"
                        step="0.1"
                        value={entry.value}
                        onChange={(e) => setExtras({ ...extras, [field.key]: { ...entry, value: e.target.value } })}
                      />
                      <select
                        value={entry.unit}
                        onChange={(e) => setExtras({ ...extras, [field.key]: { ...entry, unit: e.target.value as ExtraUnit } })}
                      >
                        <option value="abs">{field.unit}</option>
                        <option value="pct">%</option>
                      </select>
                    </span>
                  </label>
                );
              })}
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
