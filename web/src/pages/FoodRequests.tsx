import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { resizeImageToBase64 } from "../lib/aiImport";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import "./FoodRequests.css";

type RequestStatus = "pending" | "fulfilled" | "declined";

interface FoodRequestRow {
  id: string;
  name: string;
  quantity_note: string;
  status: RequestStatus;
  admin_note: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "รอดำเนินการ",
  fulfilled: "เพิ่มแล้ว",
  declined: "ไม่ดำเนินการ",
};

export default function FoodRequests() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState(searchParams.get("q") ?? "");
  const [quantityNote, setQuantityNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [requests, setRequests] = useState<FoodRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRequests() {
    if (!user) return;
    const { data, error } = await supabase
      .from("food_requests")
      .select("id, name, quantity_note, status, admin_note, created_at")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRequests((data as FoodRequestRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim() || !quantityNote.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const photo = photoFile ? await resizeImageToBase64(photoFile) : null;
      const { error: insertError } = await supabase.from("food_requests").insert({
        requester_id: user.id,
        name: name.trim(),
        quantity_note: quantityNote.trim(),
        photo_base64: photo?.base64 ?? null,
        photo_media_type: photo?.mediaType ?? null,
      });
      if (insertError) {
        setError(insertError.message);
        return;
      }
      setName("");
      setQuantityNote("");
      setPhotoFile(null);
      setSaved(true);
      await loadRequests();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="food-requests-page">
      <h1>ขอเพิ่มอาหาร</h1>
      <p className="note">หาไม่เจอ? กรอกชื่อ+ปริมาณส่งให้แอดมินเพิ่มให้ — ไม่ต้องรอผลค้นหาให้ตรงเป๊ะ</p>

      <form onSubmit={handleSubmit}>
        <label>
          ชื่ออาหาร
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          ปริมาณ/รายละเอียด (เช่น "1 จาน ~300g" หรือ "ยี่ห้อ X ซองสีเขียว")
          <input type="text" value={quantityNote} onChange={(e) => setQuantityNote(e.target.value)} required />
        </label>
        <label>
          แนบรูป (ถ้ามี)
          <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
        </label>
        {error && <p className="error">{error}</p>}
        {saved && <p className="ok">ส่งคำขอแล้ว</p>}
        <button type="submit" disabled={saving}>
          {saving ? "กำลังส่ง..." : "ส่งคำขอ"}
        </button>
      </form>

      <h2>คำขอของฉัน</h2>
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : requests.length === 0 ? (
        <p className="note">ยังไม่เคยขอ</p>
      ) : (
        <ul className="food-requests-list">
          {requests.map((r) => (
            <li key={r.id} className="food-request-item">
              <div className="food-request-header">
                <span className="food-request-name">{r.name}</span>
                <span className={`food-request-status status-${r.status}`}>{STATUS_LABELS[r.status]}</span>
              </div>
              <p className="food-request-meta">{r.quantity_note}</p>
              {r.admin_note && <p className="food-request-note">แอดมิน: {r.admin_note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
