import { useState } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import "./QuickAddFoodModal.css";

function autoKcalFrom(protein: string, carbs: string, fat: string): number {
  const p = Number(protein) || 0;
  const c = Number(carbs) || 0;
  const f = Number(fat) || 0;
  return Math.round(p * 4 + c * 4 + f * 9);
}

export default function QuickAddFoodModal({ onClose, onCreated }: { onClose: () => void; onCreated: (foodId: string) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [kcal, setKcal] = useState("");
  const [kcalAuto, setKcalAuto] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computedKcal = autoKcalFrom(protein, carbs, fat);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("custom_foods")
      .insert({
        creator_id: user.id,
        name: name.trim(),
        serving_label: null,
        serving_size_g: null,
        kcal: kcalAuto ? computedKcal : Number(kcal) || 0,
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
        nutrients: {},
      })
      .select("id")
      .single();
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onCreated(data.id);
  }

  return (
    <div className="quick-add-backdrop" onClick={onClose}>
      <div className="quick-add-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>เพิ่มเร่งด่วน</h2>
        <form onSubmit={handleSubmit}>
          <label>
            ชื่อรายการ
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </label>

          <div className="quick-add-row">
            <label>
              โปรตีน (g)
              <input type="number" step="0.1" min="0" value={protein} onChange={(e) => setProtein(e.target.value)} required />
            </label>
            <label>
              คาร์บทั้งหมด (g)
              <input type="number" step="0.1" min="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} required />
            </label>
          </div>

          <label>
            ไขมันทั้งหมด (g)
            <input type="number" step="0.1" min="0" value={fat} onChange={(e) => setFat(e.target.value)} required />
          </label>

          <label>
            Kcal
            <input
              type="number"
              step="1"
              min="0"
              value={kcalAuto ? computedKcal : kcal}
              onChange={(e) => setKcal(e.target.value)}
              disabled={kcalAuto}
              required
            />
          </label>

          <label className="quick-add-auto-toggle">
            <input type="checkbox" checked={kcalAuto} onChange={(e) => setKcalAuto(e.target.checked)} />
            คำนวณ kcal อัตโนมัติจาก โปรตีน×4 + คาร์บ×4 + ไขมัน×9
          </label>

          {error && <p className="error">{error}</p>}

          <div className="quick-add-actions">
            <button type="button" className="quick-add-cancel" onClick={onClose}>
              ยกเลิก
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
