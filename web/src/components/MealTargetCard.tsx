import { MEAL_LABELS } from "../lib/diary";
import type { MealTargetView } from "../lib/mealTargets";
import "./MealTargetCard.css";

// Tone is load-bearing here (FR-CALC-5 AC): every line is a fact ("เหลืออีก"/"เกินไป"),
// never a judgment ("ควร"/"มากไป"/"ดีแล้ว") — applies identically whether under or over
// target, since the whole point of this card is to inform without making anyone feel
// bad about what they ate. At exactly target (remaining = 0) there's no message at all.
function MealProgressRow({ label, target, logged, unit }: { label: string; target: number; logged: number; unit: string }) {
  const remaining = target - logged;
  const pct = target > 0 ? Math.min(100, Math.round((logged / target) * 100)) : 0;
  const isOver = remaining < 0;
  const note = remaining > 0 ? `เหลืออีก ${Math.round(remaining)}${unit}` : isOver ? `เกินเป้ามื้อนี้ไปแล้ว ${Math.round(-remaining)}${unit}` : null;

  return (
    <div className="meal-target-row">
      <div className="meal-target-row-top">
        <span className="meal-target-row-label">
          {label}
          {note && <span className="meal-target-row-note"> ({note})</span>}
        </span>
        <span className="meal-target-row-value">
          {Math.round(logged)}/{Math.round(target)}
          {unit.trim() === "kcal" && " kcal"}
        </span>
      </div>
      <div className="meal-target-row-track">
        <div className={`meal-target-row-fill ${isOver ? "over" : "under"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function MealTargetCard({ view }: { view: MealTargetView }) {
  const { meal, isCurrent, window, target, logged } = view;

  if (!isCurrent || !logged) {
    return (
      <div className="meal-target-card">
        <div className="meal-target-header">
          <span>มื้อถัดไป: {MEAL_LABELS[meal]}</span>
          <span className="meal-target-window">
            ช่วงเวลาโดยประมาณ {window.start}–{window.end}
          </span>
        </div>
        <p className="meal-target-upcoming">เป้า {Math.round(target.kcal)} kcal</p>
      </div>
    );
  }

  return (
    <div className="meal-target-card">
      <div className="meal-target-header">
        <span>{MEAL_LABELS[meal]}</span>
        <span className="meal-target-window">
          {window.start}–{window.end}
        </span>
      </div>
      <MealProgressRow label="แคลอรี่" target={target.kcal} logged={logged.kcal} unit=" kcal" />
      <MealProgressRow label="โปรตีน" target={target.protein_g} logged={logged.protein_g} unit="g" />
      <MealProgressRow label="คาร์บ" target={target.carbs_g} logged={logged.carbs_g} unit="g" />
      <MealProgressRow label="ไขมัน" target={target.fat_g} logged={logged.fat_g} unit="g" />
    </div>
  );
}
