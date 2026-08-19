import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import CustomFoodFieldsForm from "../components/CustomFoodFieldsForm";
import { AI_IMPORT_ENABLED } from "../config";
import { getAiNutritionEstimate, resizeImageToBase64 } from "../lib/aiImport";
import { useAuth } from "../lib/auth-context";
import { buildNutrients, EMPTY_CORE, flattenNutrients, type CoreFormState, type ExtraFormState } from "../lib/customFoodNutrients";
import type { NutrientPanel } from "../lib/scaling";
import { supabase } from "../lib/supabase";
import "./CustomFoodForm.css";
import "./AiFoodImport.css";

export default function AiFoodImport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"input" | "preview">("input");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const [core, setCore] = useState<CoreFormState>(EMPTY_CORE);
  const [extras, setExtras] = useState<ExtraFormState>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!AI_IMPORT_ENABLED) return <Navigate to="/food/search" replace />;

  async function handleEstimate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !quantity.trim()) return;
    setEstimating(true);
    setEstimateError(null);
    try {
      const photo = photoFile ? await resizeImageToBase64(photoFile) : undefined;
      const estimate = await getAiNutritionEstimate(name.trim(), quantity.trim(), photo);
      setCore({
        name: estimate.name,
        serving_label: estimate.serving_label ?? "",
        serving_size_g: String(estimate.serving_size_g),
        kcal: String(estimate.kcal),
        protein_g: String(estimate.protein_g),
        carbs_g: String(estimate.carbs_g),
        fat_g: String(estimate.fat_g),
      });
      setExtras(flattenNutrients(estimate.nutrients as NutrientPanel));
      setStep("preview");
    } catch (err) {
      setEstimateError(err instanceof Error ? err.message : String(err));
    } finally {
      setEstimating(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveError(null);

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

    const { data, error } = await supabase
      .from("custom_foods")
      .insert({ ...row, creator_id: user.id })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    navigate(`/food/custom/${data.id}`);
  }

  if (step === "input") {
    return (
      <main className="custom-food-form-page ai-food-import-page">
        <h1>ให้ AI ช่วยกรอก</h1>
        <p className="form-hint">
          บอกชื่ออาหาร + ปริมาณ (แนบรูปเสริมได้) แล้ว AI จะประมาณค่า macro ให้เป็นจุดเริ่มต้น — ทุกค่าต้อง
          ตรวจสอบ/แก้ในขั้นถัดไปก่อน save เสมอ
        </p>
        <form onSubmit={handleEstimate}>
          <label>
            ชื่ออาหาร
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น แกงเขียวหวานไก่" required />
          </label>
          <label>
            ปริมาณ
            <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="เช่น 1 จาน, 250 กรัม" required />
          </label>
          <label>
            รูปประกอบ (ไม่บังคับ)
            <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
          </label>

          {estimateError && <p className="error">{estimateError}</p>}

          <button type="submit" disabled={estimating}>
            {estimating ? "กำลังประมาณค่า..." : "ให้ AI ช่วยกรอก"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="custom-food-form-page ai-food-import-page">
      <h1>ตรวจสอบก่อนบันทึก</h1>
      <p className="ai-food-import-disclaimer">
        ค่าประมาณจากค่ากลาง โปรดตรวจสอบ/ปรับตามของจริง — AI ประมาณจากอาหารประเภทนี้โดยเฉลี่ย ไม่รู้สูตร
        ของร้าน/มื้อที่กินจริง แก้ค่าด้านล่างได้ทุกช่องก่อนบันทึก
      </p>
      <form onSubmit={handleSave}>
        <CustomFoodFieldsForm core={core} setCore={setCore} extras={extras} setExtras={setExtras} />

        {saveError && <p className="error">{saveError}</p>}

        <button type="submit" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button type="button" className="delete-button" onClick={() => setStep("input")}>
          กลับไปแก้ชื่อ/ปริมาณ
        </button>
      </form>
    </main>
  );
}
