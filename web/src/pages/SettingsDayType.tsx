import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import { DEFAULT_CARB_FLOOR_G, DEFAULT_CARB_FLOOR_PCT, DEFAULT_DAY_TYPE_ALLOWANCE_KCAL, DEFAULT_FAT_FLOOR_G_PER_KG, DEFAULT_FAT_FLOOR_PCT } from "../lib/tdee";
import "./SettingsDayType.css";

type DayType = "rest" | "light" | "hard";

interface DayTypeForm {
  default_day_type: DayType | null;
  day_type_allowance_rest_kcal: number | null;
  day_type_allowance_light_kcal: number | null;
  day_type_allowance_hard_kcal: number | null;
  carb_floor_g: number | null;
  carb_floor_pct: number | null;
  fat_floor_g_per_kg: number | null;
  fat_floor_pct: number | null;
}

export default function SettingsDayType() {
  const { user } = useAuth();
  const [form, setForm] = useState<DayTypeForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select(
        "default_day_type, day_type_allowance_rest_kcal, day_type_allowance_light_kcal, day_type_allowance_hard_kcal, carb_floor_g, carb_floor_pct, fat_floor_g_per_kg, fat_floor_pct",
      )
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (data) setForm(data as DayTypeForm);
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
    <section className="settings-day-type">
      <h1>เป้าตามประเภทวัน</h1>
      <p className="note">
        เป้า kcal ต่อวันปรับตามที่เลือกในหน้า Diary — rest = ไม่เพิ่ม, light/hard = เพิ่มจากเป้าปกติ ตามค่า
        ด้านล่าง (ค่าเริ่มต้น: rest +0, light +{DEFAULT_DAY_TYPE_ALLOWANCE_KCAL.light}, hard +
        {DEFAULT_DAY_TYPE_ALLOWANCE_KCAL.hard} kcal)
      </p>

      <form onSubmit={handleSave}>
        <label>
          Default day type (ใช้เมื่อยังไม่ได้เลือกในวันนั้น)
          <select value={form.default_day_type ?? "rest"} onChange={(e) => setForm({ ...form, default_day_type: e.target.value as DayType })}>
            <option value="rest">Rest</option>
            <option value="light">Light</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <label>
          Allowance วัน Light (kcal เพิ่มจากเป้าปกติ)
          <input
            type="number"
            step="10"
            placeholder={`ใช้ default +${DEFAULT_DAY_TYPE_ALLOWANCE_KCAL.light}`}
            value={form.day_type_allowance_light_kcal ?? ""}
            onChange={(e) => setForm({ ...form, day_type_allowance_light_kcal: e.target.value ? Number(e.target.value) : null })}
          />
        </label>

        <label>
          Allowance วัน Hard (kcal เพิ่มจากเป้าปกติ)
          <input
            type="number"
            step="10"
            placeholder={`ใช้ default +${DEFAULT_DAY_TYPE_ALLOWANCE_KCAL.hard}`}
            value={form.day_type_allowance_hard_kcal ?? ""}
            onChange={(e) => setForm({ ...form, day_type_allowance_hard_kcal: e.target.value ? Number(e.target.value) : null })}
          />
        </label>

        <label>
          Allowance วัน Rest (kcal ปรับจากเป้าปกติ — ปกติ 0, ใส่ค่าลบได้ถ้าต้องการวันพักที่เข้มกว่า)
          <input
            type="number"
            step="10"
            placeholder={`ใช้ default ${DEFAULT_DAY_TYPE_ALLOWANCE_KCAL.rest >= 0 ? "+" : ""}${DEFAULT_DAY_TYPE_ALLOWANCE_KCAL.rest}`}
            value={form.day_type_allowance_rest_kcal ?? ""}
            onChange={(e) => setForm({ ...form, day_type_allowance_rest_kcal: e.target.value ? Number(e.target.value) : null })}
          />
        </label>

        <p className="note">
          Carb/fat floor — เพดานล่างกัน macro ติดลบเมื่อ allowance ต่ำมาก (protein คงที่เสมอ, carb รับส่วน
          ต่างก่อน, fat รับต่อถ้า carb ชน floor แล้ว)
        </p>

        <label>
          Carb floor (กรัม)
          <input
            type="number"
            step="1"
            min="0"
            placeholder={`ใช้ default ${DEFAULT_CARB_FLOOR_G}g`}
            value={form.carb_floor_g ?? ""}
            onChange={(e) => setForm({ ...form, carb_floor_g: e.target.value ? Number(e.target.value) : null })}
          />
        </label>

        <label>
          Carb floor (% ของ kcal เป้าหมาย)
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            placeholder={`ใช้ default ${DEFAULT_CARB_FLOOR_PCT * 100}%`}
            value={form.carb_floor_pct != null ? form.carb_floor_pct * 100 : ""}
            onChange={(e) => setForm({ ...form, carb_floor_pct: e.target.value ? Number(e.target.value) / 100 : null })}
          />
        </label>

        <label>
          Fat floor (g/kg น้ำหนักตัว)
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder={`ใช้ default ${DEFAULT_FAT_FLOOR_G_PER_KG}g/kg`}
            value={form.fat_floor_g_per_kg ?? ""}
            onChange={(e) => setForm({ ...form, fat_floor_g_per_kg: e.target.value ? Number(e.target.value) : null })}
          />
        </label>

        <label>
          Fat floor (% ของ kcal เป้าหมาย)
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            placeholder={`ใช้ default ${DEFAULT_FAT_FLOOR_PCT * 100}%`}
            value={form.fat_floor_pct != null ? form.fat_floor_pct * 100 : ""}
            onChange={(e) => setForm({ ...form, fat_floor_pct: e.target.value ? Number(e.target.value) / 100 : null })}
          />
        </label>

        {error && <p className="error">{error}</p>}
        {saved && <p className="ok">บันทึกแล้ว</p>}

        <button type="submit" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </form>
    </section>
  );
}
