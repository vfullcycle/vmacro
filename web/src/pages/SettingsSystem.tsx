import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import "./SettingsSystem.css";

type UnitSystem = "metric" | "imperial";

interface SystemForm {
  unit_system: UnitSystem;
  default_protein_g_per_kg: number | null;
  default_fat_pct: number | null;
  health_shortcut_name: string;
  fatsecret_search_enabled: boolean;
  share_activity: boolean;
}

interface HealthTokenRow {
  created_at: string;
}

export default function SettingsSystem() {
  const { user } = useAuth();
  const [form, setForm] = useState<SystemForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [healthToken, setHealthToken] = useState<HealthTokenRow | null | undefined>(undefined);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("unit_system, default_protein_g_per_kg, default_fat_pct, health_shortcut_name, fatsecret_search_enabled, share_activity")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (data) setForm(data as SystemForm);
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadHealthTokenStatus();
  }, [user]);

  async function loadHealthTokenStatus() {
    if (!user) return;
    const { data, error } = await supabase
      .from("health_tokens")
      .select("created_at")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .maybeSingle();
    if (error) setHealthError(error.message);
    else setHealthToken(data as HealthTokenRow | null);
  }

  async function handleGenerateToken() {
    setHealthBusy(true);
    setHealthError(null);
    setCopied(false);
    const { data, error } = await supabase.rpc("generate_health_token");
    setHealthBusy(false);
    if (error) {
      setHealthError(error.message);
      return;
    }
    setNewToken(data as string);
    await loadHealthTokenStatus();
  }

  async function handleRevokeToken() {
    setHealthBusy(true);
    setHealthError(null);
    const { error } = await supabase.rpc("revoke_health_token");
    setHealthBusy(false);
    if (error) {
      setHealthError(error.message);
      return;
    }
    setNewToken(null);
    await loadHealthTokenStatus();
  }

  async function handleCopyToken() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
  }

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

        <div className="fatsecret-toggle">
          <h2>Search (BL-11)</h2>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.fatsecret_search_enabled}
              onChange={(e) => setForm({ ...form, fatsecret_search_enabled: e.target.checked })}
            />
            ค้นหาจาก FatSecret ด้วย (ปิดได้ถ้าไม่ต้องการรอโหลด/แปลผล FatSecret — ยังค้นหา custom food/จาน
            ของระบบได้ตามปกติ)
          </label>
        </div>

        <div className="friends-sharing">
          <h2>การแชร์ใน Friends</h2>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.share_activity}
              onChange={(e) => setForm({ ...form, share_activity: e.target.checked })}
            />
            แชร์กิจกรรมของฉัน (บันทึกครบทุกมื้อ, ต่อเนื่องครบวัน, ถึงเป้าโปรตีน ฯลฯ ให้เพื่อนเห็นใน
            Friends feed)
          </label>
        </div>

        <div className="health-sync">
          <h2>Apple Health</h2>
          <p className="note">
            เขียนยอด macro รายวันเข้า Apple Health อัตโนมัติผ่าน Shortcut #1 (FR-HLTH-1) — ดู{" "}
            <a
              href="https://github.com/vfullcycle/vmacro/blob/main/docs/shortcuts/shortcut-1-write.md"
              target="_blank"
              rel="noreferrer"
            >
              คู่มือติดตั้ง
            </a>{" "}
            สำหรับขั้นตอนเต็ม
          </p>

          <label>
            ชื่อ Shortcut #1 (ต้องตรงกับชื่อจริงในแอป Shortcuts เป๊ะๆ)
            <input
              type="text"
              value={form.health_shortcut_name}
              onChange={(e) => setForm({ ...form, health_shortcut_name: e.target.value })}
              placeholder="Vmacro: Sync to Health"
            />
          </label>

          <p className="status">
            สถานะ:{" "}
            {healthToken === undefined
              ? "กำลังโหลด..."
              : healthToken
                ? `เชื่อมต่อแล้ว (สร้างเมื่อ ${new Date(healthToken.created_at).toLocaleString("th-TH")})`
                : "ยังไม่เชื่อมต่อ"}
          </p>

          {newToken && (
            <div className="token-box">
              <p className="warn">คัดลอกตอนนี้ — จะไม่แสดงซ้ำอีก</p>
              <code>{newToken}</code>
              <button type="button" onClick={handleCopyToken}>
                {copied ? "คัดลอกแล้ว" : "คัดลอก"}
              </button>
            </div>
          )}

          {healthError && <p className="error">{healthError}</p>}

          <div className="health-actions">
            <button type="button" onClick={handleGenerateToken} disabled={healthBusy}>
              {healthToken ? "สร้าง Token ใหม่" : "สร้าง Token"}
            </button>
            {healthToken && (
              <button type="button" className="danger" onClick={handleRevokeToken} disabled={healthBusy}>
                ยกเลิกการเชื่อมต่อ
              </button>
            )}
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {saved && <p className="ok">บันทึกแล้ว</p>}

        <button type="submit" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </form>
    </section>
  );
}
