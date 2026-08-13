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

function toLocalDateInputValue(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function todayLocalDate(): string {
  return toLocalDateInputValue(new Date().toISOString());
}

export default function WeightLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WeightLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayLocalDate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function loadLogs(): Promise<WeightLogRow[]> {
    if (!user) return [];
    const { data, error } = await supabase
      .from("weight_logs")
      .select("id, weight_kg, logged_at")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: true });
    if (error) {
      setError(error.message);
      setLoading(false);
      return [];
    }
    setLogs(data ?? []);
    setLoading(false);
    return data ?? [];
  }

  useEffect(() => {
    loadLogs();
  }, [user]);

  // profiles.current_weight_kg always mirrors the newest weight_logs entry (by logged_at) —
  // recomputed after every add/edit/delete since any of those can change which entry is newest.
  async function syncCurrentWeight(freshLogs: WeightLogRow[]) {
    if (!user || freshLogs.length === 0) return;
    const latest = freshLogs[freshLogs.length - 1];
    const { error: profileError } = await supabase.from("profiles").update({ current_weight_kg: latest.weight_kg }).eq("id", user.id);
    if (profileError) setError(`บันทึกสำเร็จ แต่อัปเดต current weight ไม่สำเร็จ: ${profileError.message}`);
  }

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

    setWeight("");
    setSaving(false);
    await syncCurrentWeight(await loadLogs());
  }

  function startEdit(log: WeightLogRow) {
    setEditingId(log.id);
    setEditWeight(String(log.weight_kg));
    setEditDate(toLocalDateInputValue(log.logged_at));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditWeight("");
    setEditDate("");
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !editingId || !editWeight) return;
    setEditSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("weight_logs")
      .update({ weight_kg: Number(editWeight), logged_at: new Date(editDate).toISOString() })
      .eq("id", editingId);
    if (updateError) {
      setError(updateError.message);
      setEditSaving(false);
      return;
    }

    setEditSaving(false);
    cancelEdit();
    await syncCurrentWeight(await loadLogs());
  }

  async function handleDelete(id: string) {
    if (!user) return;
    if (!window.confirm("ลบ log นี้?")) return;
    setError(null);

    const { error: deleteError } = await supabase.from("weight_logs").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (editingId === id) cancelEdit();
    await syncCurrentWeight(await loadLogs());
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
          .map((log) =>
            editingId === log.id ? (
              <li key={log.id} className="weight-log-item-editing">
                <form onSubmit={handleEditSave} className="weight-log-edit-form">
                  <input type="number" step="0.1" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} required />
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
                  <div className="weight-log-item-actions">
                    <button type="submit" disabled={editSaving}>
                      {editSaving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                    <button type="button" className="weight-log-btn-secondary" onClick={cancelEdit}>
                      ยกเลิก
                    </button>
                  </div>
                </form>
              </li>
            ) : (
              <li key={log.id} className="weight-log-item">
                <span>
                  {new Date(log.logged_at).toLocaleDateString("th-TH")} — {log.weight_kg} kg
                </span>
                <span className="weight-log-item-actions">
                  <button type="button" className="weight-log-btn-secondary" onClick={() => startEdit(log)}>
                    แก้ไข
                  </button>
                  <button type="button" className="weight-log-btn-danger" onClick={() => handleDelete(log.id)}>
                    ลบ
                  </button>
                </span>
              </li>
            ),
          )}
      </ul>
    </section>
  );
}
