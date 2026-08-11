import { useEffect, useState } from "react";
import WeightChart from "../components/WeightChart";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import "./WeightLog.css";

interface WeightLogRow {
  id: string;
  weight_kg: number;
  logged_at: string;
}

function todayLocalDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default function WeightLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WeightLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayLocalDate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLogs() {
    if (!user) return;
    const { data, error } = await supabase
      .from("weight_logs")
      .select("id, weight_kg, logged_at")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: true });
    if (error) setError(error.message);
    else setLogs(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();
  }, [user]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !weight) return;
    setSaving(true);
    setError(null);

    const weight_kg = Number(weight);
    const logged_at = new Date(date).toISOString();

    const { error: insertError } = await supabase.from("weight_logs").insert({ user_id: user.id, weight_kg, logged_at });
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    // keep profiles.current_weight_kg in sync only when this entry is the newest one on record
    const latestExisting = logs.length ? logs[logs.length - 1].logged_at : null;
    if (!latestExisting || logged_at >= latestExisting) {
      const { error: profileError } = await supabase.from("profiles").update({ current_weight_kg: weight_kg }).eq("id", user.id);
      if (profileError) setError(`บันทึก log สำเร็จ แต่อัปเดต current weight ไม่สำเร็จ: ${profileError.message}`);
    }

    setWeight("");
    setSaving(false);
    await loadLogs();
  }

  if (loading) return <p>กำลังโหลด...</p>;

  return (
    <section className="weight-log">
      <h1>Weight log</h1>

      <WeightChart data={logs} />

      <form onSubmit={handleAdd}>
        <label>
          น้ำหนัก (kg)
          <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} required />
        </label>
        <label>
          วันที่
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "เพิ่ม log"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul className="weight-log-list">
        {[...logs]
          .reverse()
          .map((log) => (
            <li key={log.id}>
              {new Date(log.logged_at).toLocaleDateString("th-TH")} — {log.weight_kg} kg
            </li>
          ))}
      </ul>
    </section>
  );
}
