import { useEffect, useMemo, useState } from "react";
import { calculateAge } from "../lib/age";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import { calculateBMR, calculateMacros, calculateTDEE, calculateTarget } from "../lib/tdee";
import type { ActivityLevel, Formula, Goal, Sex } from "../lib/tdee";
import "./SettingsProfile.css";

interface ProfileRow {
  sex: Sex | null;
  birth_date: string | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  body_fat_pct: number | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  formula_choice: Formula;
}

interface SettingsDefaults {
  default_protein_g_per_kg: number | null;
  default_fat_pct: number | null;
}

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (นั่งทำงาน ไม่ค่อยขยับ)",
  light: "Light (ออกกำลังกายเบา 1-3 วัน/สัปดาห์)",
  moderate: "Moderate (ออกกำลังกาย 3-5 วัน/สัปดาห์)",
  active: "Active (ออกกำลังกาย 6-7 วัน/สัปดาห์)",
  extra_active: "Extra active (งานใช้แรงกาย + ออกกำลังกายหนัก)",
};

const GOAL_LABELS: Record<Goal, string> = {
  lose: "ลดน้ำหนัก",
  maintain: "รักษาน้ำหนัก",
  gain: "เพิ่มน้ำหนัก",
};

const FORMULA_LABELS: Record<Formula, string> = {
  mifflin: "Mifflin-St Jeor (default)",
  katch_mcardle: "Katch-McArdle (ต้องมี body fat %)",
  harris_benedict: "Harris-Benedict revised",
};

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
    const age = calculateAge(form.birth_date);
    const bmrResult = calculateBMR({
      formula: form.formula_choice,
      sex: form.sex,
      age,
      height_cm: form.height_cm,
      weight_kg: form.current_weight_kg,
      body_fat_pct: form.body_fat_pct,
    });
    const tdee = calculateTDEE(bmrResult.bmr, form.activity_level);
    const target = calculateTarget({ tdee, goal: form.goal });
    const macros = calculateMacros({
      target_kcal: target.target_kcal,
      weight_kg: form.current_weight_kg,
      goal: form.goal,
      protein_g_per_kg: defaults.default_protein_g_per_kg ?? undefined,
      fat_pct: defaults.default_fat_pct ?? undefined,
    });
    return { age, bmrResult, tdee, target, macros };
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
        <label>
          เพศ
          <select value={form.sex ?? ""} onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })} required>
            <option value="" disabled>
              เลือก
            </option>
            <option value="male">ชาย</option>
            <option value="female">หญิง</option>
          </select>
        </label>

        <label>
          วันเกิด
          <input
            type="date"
            value={form.birth_date ?? ""}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            required
          />
        </label>

        <label>
          ส่วนสูง (cm)
          <input
            type="number"
            value={form.height_cm ?? ""}
            onChange={(e) => setForm({ ...form, height_cm: e.target.value ? Number(e.target.value) : null })}
            required
          />
        </label>

        <label>
          น้ำหนักปัจจุบัน (kg)
          <input
            type="number"
            step="0.1"
            value={form.current_weight_kg ?? ""}
            onChange={(e) => setForm({ ...form, current_weight_kg: e.target.value ? Number(e.target.value) : null })}
            required
          />
        </label>

        <label>
          Body fat % (ไม่บังคับ — จำเป็นเฉพาะสูตร Katch-McArdle)
          <input
            type="number"
            step="0.1"
            value={form.body_fat_pct ?? ""}
            onChange={(e) => setForm({ ...form, body_fat_pct: e.target.value ? Number(e.target.value) : null })}
          />
        </label>

        <label>
          Activity level
          <select
            value={form.activity_level ?? ""}
            onChange={(e) => setForm({ ...form, activity_level: e.target.value as ActivityLevel })}
            required
          >
            <option value="" disabled>
              เลือก
            </option>
            {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          เป้าหมาย
          <select value={form.goal ?? ""} onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })} required>
            <option value="" disabled>
              เลือก
            </option>
            {Object.entries(GOAL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          สูตรคำนวณ
          <select
            value={form.formula_choice}
            onChange={(e) => setForm({ ...form, formula_choice: e.target.value as Formula })}
          >
            {Object.entries(FORMULA_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {preview?.bmrResult.fallback_applied && (
          <p className="warning">
            เลือก Katch-McArdle ไว้แต่ยังไม่มี body fat % — คำนวณด้วย Mifflin-St Jeor ไปก่อนจนกว่าจะกรอก
          </p>
        )}

        {error && <p className="error">{error}</p>}
        {saved && <p className="ok">บันทึกแล้ว</p>}

        <button type="submit" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </form>

      {preview && (
        <div className="preview">
          <h2>ผลคำนวณ</h2>
          <dl>
            <dt>อายุ</dt>
            <dd>{preview.age} ปี</dd>
            <dt>BMR</dt>
            <dd>{Math.round(preview.bmrResult.bmr)} kcal</dd>
            <dt>TDEE</dt>
            <dd>{Math.round(preview.tdee)} kcal</dd>
            <dt>เป้าหมาย</dt>
            <dd>
              {preview.target.target_kcal} kcal ({preview.target.weekly_rate_kg >= 0 ? "+" : ""}
              {preview.target.weekly_rate_kg.toFixed(2)} kg/สัปดาห์)
            </dd>
            <dt>Macro</dt>
            <dd>
              P {preview.macros.protein_g}g / F {preview.macros.fat_g}g / C {preview.macros.carb_g}g
            </dd>
          </dl>
        </div>
      )}
    </section>
  );
}
