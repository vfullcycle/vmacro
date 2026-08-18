import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import "./FavoriteToggle.css";

type FavoriteSource = "custom_food" | "dish" | "fatsecret";

interface Props {
  source: FavoriteSource;
  refId: string;
  /** Required (and only used) when source is "fatsecret" — favorites has no join target to read a name from later. */
  fatsecretName?: string;
}

const REF_COLUMN: Record<FavoriteSource, string> = {
  custom_food: "custom_food_id",
  dish: "dish_id",
  fatsecret: "fatsecret_food_id",
};

export default function FavoriteToggle({ source, refId, fatsecretName }: Props) {
  const { user } = useAuth();
  const [favoriteId, setFavoriteId] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFavoriteId(undefined);
    supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("source", source)
      .eq(REF_COLUMN[source], refId)
      .maybeSingle()
      .then(({ data }) => setFavoriteId(data?.id ?? null));
  }, [user, source, refId]);

  async function toggle() {
    if (!user || favoriteId === undefined || busy) return;
    setBusy(true);

    if (favoriteId) {
      const { error } = await supabase.from("favorites").delete().eq("id", favoriteId);
      setBusy(false);
      if (!error) setFavoriteId(null);
      return;
    }

    const { data, error } = await supabase
      .from("favorites")
      .insert({
        user_id: user.id,
        source,
        [REF_COLUMN[source]]: refId,
        ...(source === "fatsecret" ? { fatsecret_food_name: fatsecretName } : {}),
      })
      .select("id")
      .single();
    setBusy(false);
    if (!error) setFavoriteId(data.id);
  }

  if (favoriteId === undefined) return null;

  return (
    <button
      type="button"
      className={`favorite-toggle${favoriteId ? " favorite-toggle-active" : ""}`}
      onClick={toggle}
      disabled={busy}
      aria-label={favoriteId ? "เอาออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
    >
      {favoriteId ? "★" : "☆"}
    </button>
  );
}
