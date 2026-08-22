import { useEffect, useState } from "react";
import BadgeTile from "../components/BadgeTile";
import { useAuth } from "../lib/auth-context";
import { computeTenureDays, fetchBadgeDisplayState, type BadgeDisplayState, type BadgeGroup } from "../lib/badges";
import { supabase } from "../lib/supabase";
import "./Achievements.css";

const GROUP_LABELS: Record<BadgeGroup, string> = {
  consistency: "สม่ำเสมอ",
  creator: "ผู้สร้าง",
  nutrition: "โภชนาการ",
  journey: "การเดินทาง",
};

const GROUP_ORDER: BadgeGroup[] = ["consistency", "creator", "nutrition", "journey"];

export default function Achievements() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeDisplayState[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user.id)
      .single()
      .then(async ({ data }) => {
        const createdAt = (data as { created_at: string } | null)?.created_at;
        if (!createdAt) return;
        setBadges(await fetchBadgeDisplayState(user.id, computeTenureDays(createdAt)));
      });
  }, [user]);

  if (!badges) return <p>กำลังโหลด...</p>;

  return (
    <section className="achievements-page">
      <h1>ความสำเร็จ</h1>
      {GROUP_ORDER.map((group) => {
        const groupBadges = badges.filter((b) => b.group === group);
        if (groupBadges.length === 0) return null;
        return (
          <div key={group} className="achievements-group">
            <h2>{GROUP_LABELS[group]}</h2>
            <div className="achievements-grid">
              {groupBadges.map((b) => (
                <BadgeTile key={b.key} badge={b} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
