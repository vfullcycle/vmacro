import { Link } from "react-router-dom";
import type { BadgeDisplayState } from "../lib/badges";
import { selectCardBadges } from "../lib/badges";
import BadgeTile from "./BadgeTile";
import "./AchievementCard.css";

export default function AchievementCard({ badges }: { badges: BadgeDisplayState[] }) {
  const shown = selectCardBadges(badges);
  return (
    <div className="dash-card achievement-card">
      <h2>ความสำเร็จ</h2>
      {shown.length === 0 ? (
        <p className="dash-summary-missing">ยังไม่มีความสำเร็จ — เริ่มบันทึกอาหารเพื่อปลดล็อก badge แรก</p>
      ) : (
        <div className="achievement-card-grid">
          {shown.map((b) => (
            <BadgeTile key={b.key} badge={b} />
          ))}
        </div>
      )}
      <Link className="dash-diary-link" to="/achievements">
        ดูทั้งหมด
      </Link>
    </div>
  );
}
