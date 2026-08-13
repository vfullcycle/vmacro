import { useEffect, useMemo, useState } from "react";
import BodyDataFields, { type BodyDataValue } from "../components/BodyDataFields";
import TdeePreview from "../components/TdeePreview";
import { useAuth } from "../lib/auth-context";
import { computeFullPreview } from "../lib/preview";
import { supabase } from "../lib/supabase";
import "./SettingsProfile.css";

interface ProfileRow extends Omit<BodyDataValue, "weight_kg"> {
  current_weight_kg: number | null;
}

interface SettingsDefaults {
  default_protein_g_per_kg: number | null;
  default_fat_pct: number | null;
}

export default function SettingsProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileRow | null>(null);
  const [defaults, setDefaults] = useState<SettingsDefaults>({ default_protein_g_per_kg: null, default_fat_pct: null });
  const [initialWeight, setInitialWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select(
        "sex, birth_date, height_cm, current_weight_kg, body_fat_pct, activity_level, goal, formula_choice, default_protein_g_per_kg, default_fat_pct",
      )
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else if (data) {
          setForm(data as ProfileRow);
          setInitialWeight((data as ProfileRow).current_weight_kg);
          setDefaults({ default_protein_g_per_kg: data.default_protein_g_per_kg, default_fat_pct: data.default_fat_pct });
        }
        setLoading(false);
      });
  }, [user]);

  const preview = useMemo(() => {
    if (!form || !form.sex || !form.birth_date || !form.height_cm || !form.current_weight_kg || !form.activity_level || !form.goal) {
      return null;
    }
    return computeFullPreview({
      formula: form.formula_choice,
      sex: form.sex,
      birth_date: form.birth_date,
      height_cm: form.height_cm,
      weight_kg: form.current_weight_kg,
      body_fat_pct: form.body_fat_pct,
      activity_level: form.activity_level,
      goal: form.goal,
      protein_g_per_kg: defaults.default_protein_g_per_kg,
      fat_pct: defaults.default_fat_pct,
    });
  }, [form, defaults]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !user) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: updateError } = await supabase.from("profiles").update(form).eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    // Every weight update becomes a weight_logs row too (FR-PROF-2 "ทุกครั้งเก็บเป็น weight log")
    if (form.current_weight_kg != null && form.current_weight_kg !== initialWeight) {
      const { error: logError } = await supabase
        .from("weight_logs")
        .insert({ user_id: user.id, weight_kg: form.current_weight_kg });
      if (logError) {
        setError(`บันทึกโปรไฟล์สำเร็จ แต่บันทึก weight log ไม่สำเร็จ: ${logError.message}`);
        setSaving(false);
        return;
      }
      setInitialWeight(form.current_weight_kg);
    }

    setSaving(false);
    setSaved(true);
  }

  if (loading) return <p>กำลังโหลด...</p>;
  if (!form) return <p className="error">{error ?? "ไม่พบข้อมูลโปรไฟล์"}</p>;

  return (
    <section className="settings-profile">
      <h1>Settings — Profile</h1>
      <form onSubmit={handleSave}>
        <BodyDataFields
          value={{ ...form, weight_kg: form.current_weight_kg }}
          onChange={(v) => {
            const { weight_kg, ...rest } = v;
            setForm({ ...rest, current_weight_kg: weight_kg });
          }}
          showKatchWarning={!!preview?.bmrResult.fallback_applied}
        />

        {error && <p className="error">{error}</p>}
        {saved && <p className="ok">บันทึกแล้ว</p>}

        <button type="submit" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </form>

      {preview && <TdeePreview preview={preview} />}
    </section>
  );
}
