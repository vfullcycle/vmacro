import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFoodFieldsForm from "../components/CustomFoodFieldsForm";
import { useAuth } from "../lib/auth-context";
import { checkBadgesAfterFoodCreate } from "../lib/badges";
import { buildNutrients, EMPTY_CORE, flattenNutrients, type CoreFormState, type ExtraFormState } from "../lib/customFoodNutrients";
import type { NutrientPanel } from "../lib/scaling";
import { supabase } from "../lib/supabase";
import "./CustomFoodForm.css";

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
              serving_size_g: data.serving_size_g != null ? String(data.serving_size_g) : "",
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
      checkBadgesAfterFoodCreate(user.id);
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
        <CustomFoodFieldsForm core={core} setCore={setCore} extras={extras} setExtras={setExtras} />

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
