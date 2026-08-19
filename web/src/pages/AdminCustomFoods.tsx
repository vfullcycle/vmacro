import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import VerifiedBadge from "../components/VerifiedBadge";
import { useIsAdmin } from "../lib/use-is-admin";
import { supabase } from "../lib/supabase";
import "./AdminCustomFoods.css";

type Filter = "unverified" | "all";

interface FoodRow {
  id: string;
  name: string;
  creator_id: string;
  is_verified: boolean;
  verified_source: string | null;
  creator_name?: string;
}

export default function AdminCustomFoods() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [filter, setFilter] = useState<Filter>("unverified");
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      let query = supabase.from("custom_foods").select("id, name, creator_id, is_verified, verified_source").order("name");
      if (filter === "unverified") query = query.eq("is_verified", false);
      const { data, error: queryError } = await query;
      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as FoodRow[];
      const ids = [...new Set(rows.map((r) => r.creator_id))];
      const { data: names } = ids.length ? await supabase.rpc("get_display_names", { profile_ids: ids }) : { data: [] };
      if (cancelled) return;
      const nameById = new Map((names as { id: string; display_name: string }[] | null ?? []).map((row) => [row.id, row.display_name]));
      setFoods(rows.map((r) => ({ ...r, creator_name: nameById.get(r.creator_id) })));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, filter]);

  if (adminLoading) return <p>กำลังโหลด...</p>;
  if (!isAdmin) return <Navigate to="/settings" replace />;

  async function toggleVerified(food: FoodRow) {
    const nextVerified = !food.is_verified;

    let source: string | null = null;
    if (nextVerified) {
      source = window.prompt("แหล่งข้อมูลที่ใช้ตรวจสอบ (เช่น Thai FCD v3) — เว้นว่างได้", "");
      if (source === null) return; // cancelled
      source = source.trim() || null;
    }

    setSavingId(food.id);
    const { error: rpcError } = await supabase.rpc("set_food_verified", { food_id: food.id, verified: nextVerified, source });
    setSavingId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    if (filter === "unverified" && nextVerified) {
      setFoods((prev) => prev.filter((f) => f.id !== food.id));
    } else {
      setFoods((prev) => prev.map((f) => (f.id === food.id ? { ...f, is_verified: nextVerified, verified_source: source } : f)));
    }
  }

  return (
    <main className="admin-custom-foods-page">
      <h1>Custom Food</h1>

      <div className="admin-custom-foods-filter">
        <button type="button" className={filter === "unverified" ? "active" : ""} onClick={() => setFilter("unverified")}>
          ยังไม่ verify
        </button>
        <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
          ทั้งหมด
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>กำลังโหลด...</p>}

      {!loading && foods.length === 0 && <p className="admin-custom-foods-empty">ไม่มีรายการ</p>}

      <ul className="admin-custom-foods-list">
        {foods.map((food) => (
          <li key={food.id}>
            <Link to={`/food/custom/${food.id}`} className="admin-custom-foods-info">
              <span className="admin-custom-foods-name">
                {food.name}
                {food.is_verified && <VerifiedBadge className="verified-badge" />}
              </span>
              <span className="admin-custom-foods-creator">โดย {food.creator_name ?? "?"}</span>
            </Link>
            <button type="button" onClick={() => toggleVerified(food)} disabled={savingId === food.id}>
              {savingId === food.id ? "..." : food.is_verified ? "ยกเลิก verify" : "Verify"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
