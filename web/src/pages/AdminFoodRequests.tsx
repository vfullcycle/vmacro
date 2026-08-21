import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useIsAdmin } from "../lib/use-is-admin";
import { supabase } from "../lib/supabase";
import "./AdminFoodRequests.css";

type RequestStatus = "pending" | "fulfilled" | "declined";

interface AdminFoodRequestRow {
  id: string;
  requester_id: string;
  name: string;
  quantity_note: string;
  photo_base64: string | null;
  photo_media_type: string | null;
  status: RequestStatus;
  admin_note: string | null;
  created_at: string;
  requester_name?: string;
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "รอดำเนินการ",
  fulfilled: "เพิ่มแล้ว",
  declined: "ไม่ดำเนินการ",
};

export default function AdminFoodRequests() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [requests, setRequests] = useState<AdminFoodRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPending, setFilterPending] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadRequests() {
    const { data, error } = await supabase
      .from("food_requests")
      .select("id, requester_id, name, quantity_note, photo_base64, photo_media_type, status, admin_note, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const rows = (data as AdminFoodRequestRow[]) ?? [];
    const ids = [...new Set(rows.map((r) => r.requester_id))];
    const { data: names } = ids.length ? await supabase.rpc("get_display_names", { profile_ids: ids }) : { data: [] };
    const nameMap = new Map(((names as { id: string; display_name: string }[]) ?? []).map((n) => [n.id, n.display_name]));
    setRequests(rows.map((r) => ({ ...r, requester_name: nameMap.get(r.requester_id) })));
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) loadRequests();
  }, [isAdmin]);

  async function updateStatus(row: AdminFoodRequestRow, status: RequestStatus) {
    setBusyId(row.id);
    setError(null);
    const note = noteDrafts[row.id] ?? row.admin_note ?? null;
    const { error: rpcError } = await supabase.rpc("set_food_request_status", { request_id: row.id, new_status: status, note });
    setBusyId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await loadRequests();
  }

  if (adminLoading) return <p>กำลังโหลด...</p>;
  if (!isAdmin) return <Navigate to="/settings" replace />;

  const shown = filterPending ? requests.filter((r) => r.status === "pending") : requests;

  return (
    <section className="admin-food-requests">
      <h1>คำขออาหารใหม่</h1>
      <label className="filter-toggle">
        <input type="checkbox" checked={filterPending} onChange={(e) => setFilterPending(e.target.checked)} />
        แสดงเฉพาะที่รอดำเนินการ
      </label>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : shown.length === 0 ? (
        <p className="note">ไม่มีคำขอ</p>
      ) : (
        <ul className="admin-food-request-list">
          {shown.map((r) => (
            <li key={r.id} className="admin-food-request-item">
              <div className="admin-food-request-header">
                <span>{r.name}</span>
                <span className={`food-request-status status-${r.status}`}>{STATUS_LABELS[r.status]}</span>
              </div>
              <p className="admin-food-request-meta">
                {r.quantity_note} — ขอโดย {r.requester_name ?? "?"} · {new Date(r.created_at).toLocaleDateString("th-TH")}
              </p>
              {r.photo_base64 && (
                <img className="admin-food-request-photo" src={`data:${r.photo_media_type};base64,${r.photo_base64}`} alt={r.name} />
              )}
              <textarea
                className="admin-food-request-note-input"
                placeholder="โน้ตถึงผู้ขอ (optional) — เช่น 'มีอยู่แล้วชื่อ X' หรือ 'ขอรูปฉลากเพิ่ม'"
                value={noteDrafts[r.id] ?? r.admin_note ?? ""}
                onChange={(e) => setNoteDrafts({ ...noteDrafts, [r.id]: e.target.value })}
              />
              <div className="admin-food-request-actions">
                <button type="button" onClick={() => updateStatus(r, "fulfilled")} disabled={busyId === r.id}>
                  เพิ่มแล้ว
                </button>
                <button type="button" className="secondary" onClick={() => updateStatus(r, "declined")} disabled={busyId === r.id}>
                  ไม่ดำเนินการ
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
