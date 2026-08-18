import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { entryDisplayName, entryQuantityLabel, type DiaryEntryRow, type Meal } from "../lib/diary";
import { applyFavorite, applyRecent, dedupeRecent, favoriteDisplayName, type FavoriteRow } from "../lib/favorites";
import { supabase } from "../lib/supabase";
import "./MealTemplatePickerModal.css";
import "./RecentFavoritesModal.css";

type Tab = "favorites" | "recent";

export default function RecentFavoritesModal({
  diary,
  onClose,
  onApplied,
}: {
  diary: { date: string; meal: Meal };
  onClose: () => void;
  onApplied: () => void;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("favorites");
  const [favorites, setFavorites] = useState<FavoriteRow[] | null>(null);
  const [recent, setRecent] = useState<DiaryEntryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("favorites")
      .select("id, source, custom_food_id, dish_id, fatsecret_food_id, fatsecret_food_name, custom_foods(name), dishes(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else setFavorites((data as unknown as FavoriteRow[]) ?? []);
      });

    supabase
      .from("diary_entries")
      .select(
        "id, entry_date, meal, source, custom_food_id, dish_id, fatsecret_food_id, fatsecret_food_name, quick_name, quantity, serving_size_g, kcal, protein_g, carbs_g, fat_g, nutrients, custom_foods(name), dishes(name)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else setRecent(dedupeRecent((data as unknown as DiaryEntryRow[]) ?? [], 15));
      });
  }, [user]);

  async function handleApplyFavorite(item: FavoriteRow) {
    if (!user) return;
    setApplyingKey(item.id);
    setError(null);
    const { error: applyError } = await applyFavorite(item, diary, user.id);
    setApplyingKey(null);
    if (applyError) {
      setError(applyError);
      return;
    }
    onApplied();
  }

  async function handleApplyRecent(item: DiaryEntryRow) {
    if (!user) return;
    setApplyingKey(item.id);
    setError(null);
    const { error: applyError } = await applyRecent(item, diary, user.id);
    setApplyingKey(null);
    if (applyError) {
      setError(applyError);
      return;
    }
    onApplied();
  }

  return (
    <div className="template-picker-backdrop" onClick={onClose}>
      <div className="template-picker-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="recent-favorites-tabs">
          <button type="button" className={tab === "favorites" ? "active" : ""} onClick={() => setTab("favorites")}>
            รายการโปรด
          </button>
          <button type="button" className={tab === "recent" ? "active" : ""} onClick={() => setTab("recent")}>
            ล่าสุด
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {tab === "favorites" && (
          <>
            {favorites === null && <p className="hint">กำลังโหลด...</p>}
            {favorites && favorites.length === 0 && (
              <p className="hint">ยังไม่มีรายการโปรด — กด ☆ ที่หน้ารายละเอียดอาหารเพื่อเพิ่ม</p>
            )}
            {favorites && favorites.length > 0 && (
              <ul className="template-picker-list">
                {favorites.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => handleApplyFavorite(f)} disabled={applyingKey === f.id}>
                      <span className="template-picker-name">{favoriteDisplayName(f)}</span>
                      <span className="template-picker-meta">1 หน่วยบริโภค</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "recent" && (
          <>
            {recent === null && <p className="hint">กำลังโหลด...</p>}
            {recent && recent.length === 0 && <p className="hint">ยังไม่มีประวัติการบันทึก</p>}
            {recent && recent.length > 0 && (
              <ul className="template-picker-list">
                {recent.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => handleApplyRecent(r)} disabled={applyingKey === r.id}>
                      <span className="template-picker-name">{entryDisplayName(r)}</span>
                      <span className="template-picker-meta">
                        {entryQuantityLabel(r)} · {Math.round(r.kcal)} kcal
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <button type="button" className="template-picker-cancel" onClick={onClose}>
          ปิด
        </button>
      </div>
    </div>
  );
}
