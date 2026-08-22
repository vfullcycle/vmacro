import type { BadgeDisplayState } from "../lib/badges";
import "./BadgeTile.css";

// Apple Fitness style: locked = monochrome silhouette + lock, unlocked = full color + date
// (BL-21/FR-BADGE-1) — locked always shows the condition + progress, never a riddle.
export default function BadgeTile({ badge }: { badge: BadgeDisplayState }) {
  return (
    <div className={`badge-tile ${badge.unlocked ? "unlocked" : "locked"}`}>
      <div className="badge-tile-icon">{badge.unlocked ? "🏅" : "🔒"}</div>
      <div className="badge-tile-title">{badge.title}</div>
      {badge.unlocked ? (
        <div className="badge-tile-date">{new Date(badge.unlockedAt!).toLocaleDateString("th-TH")}</div>
      ) : (
        <>
          <div className="badge-tile-desc">{badge.description}</div>
          <div className="badge-tile-progress">
            {badge.current}/{badge.threshold}
          </div>
        </>
      )}
    </div>
  );
}
