import { MEAL_LABELS } from "../lib/diary";
import type { MealTargetView } from "../lib/mealTargets";
import "./MealTargetCard.css";

// Tone is load-bearing here (FR-CALC-5 AC): every line is a fact ("เหลืออีก"/"เกินไป"),
// never a judgment ("ควร"/"มากไป"/"ดีแล้ว") — applies identically whether under or over
// target, since the whole point of this card is to inform without making anyone feel
// bad about what they ate.
function RemainingRow({ label, target, logged, unit }: { label: string; target: number; logged: number; unit: string }) {
  const remaining = target - logged;
  return (
    <div className="meal-target-row">
      <span className="meal-target-row-label">{label}</span>
      <span className="meal-target-row-value">
        เป้า {Math.round(target)}{unit} — กินไปแล้ว {Math.round(logged)}
        {unit} —{" "}
        {remaining >= 0 ? (
          <>เหลืออีก {Math.round(remaining)}{unit}</>
        ) : (
          <>เกินเป้ามื้อนี้ไปแล้ว {Math.round(-remaining)}{unit}</>
        )}
      </span>
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
      <RemainingRow label="แคลอรี่" target={target.kcal} logged={logged.kcal} unit=" kcal" />
      <RemainingRow label="โปรตีน" target={target.protein_g} logged={logged.protein_g} unit="g" />
      <RemainingRow label="คาร์บ" target={target.carbs_g} logged={logged.carbs_g} unit="g" />
      <RemainingRow label="ไขมัน" target={target.fat_g} logged={logged.fat_g} unit="g" />
    </div>
  );
}
