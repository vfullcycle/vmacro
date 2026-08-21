import { useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { hasUnseenFeed } from "./feed";
import { supabase } from "./supabase";

// Checked once per app load (Layout mounts once per session), not on every navigation —
// matches "เช็คตอนเปิดแอปเท่านั้น ไม่ใช้ push" (FR-DASH-2).
export function useFeedBadge(): boolean {
  const { user } = useAuth();
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("feed_last_seen_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const lastSeen = (data as { feed_last_seen_at: string } | null)?.feed_last_seen_at;
        if (!lastSeen) return;
        hasUnseenFeed(user.id, lastSeen).then(setHasUnseen);
      });
  }, [user]);

  return hasUnseen;
}
