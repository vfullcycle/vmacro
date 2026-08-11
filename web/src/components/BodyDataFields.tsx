import { ACTIVITY_LABELS, FORMULA_HELP, FORMULA_LABELS, GOAL_LABELS } from "../lib/labels";
import type { ActivityLevel, Formula, Goal, Sex } from "../lib/tdee";
import "./BodyDataFields.css";

export interface BodyDataValue {
  sex: Sex | null;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  formula_choice: Formula;
}

interface Props {
  value: BodyDataValue;
  onChange: (value: BodyDataValue) => void;
  showKatchWarning: boolean;
}

export default function BodyDataFields({ value, onChange, showKatchWarning }: Props) {
  return (
    <div className="body-data-fields">
      <label>
        เพศ
        <select value={value.sex ?? ""} onChange={(e) => onChange({ ...value, sex: e.target.value as Sex })} required>
          <option value="" disabled>
            เลือก
          </option>
          <option value="male">ชาย</option>
          <option value="female">หญิง</option>
        </select>
      </label>

      <label>
        วันเกิด
        <input type="date" value={value.birth_date ?? ""} onChange={(e) => onChange({ ...value, birth_date: e.target.value })} required />
      </label>

      <label>
        ส่วนสูง (cm)
        <input
          type="number"
          value={value.height_cm ?? ""}
          onChange={(e) => onChange({ ...value, height_cm: e.target.value ? Number(e.target.value) : null })}
          required
        />
      </label>

      <label>
        น้ำหนัก (kg)
        <input
          type="number"
          step="0.1"
          value={value.weight_kg ?? ""}
          onChange={(e) => onChange({ ...value, weight_kg: e.target.value ? Number(e.target.value) : null })}
          required
        />
      </label>

      <label>
        Body fat % (ไม่บังคับ — จำเป็นเฉพาะสูตร Katch-McArdle)
        <input
          type="number"
          step="0.1"
          value={value.body_fat_pct ?? ""}
          onChange={(e) => onChange({ ...value, body_fat_pct: e.target.value ? Number(e.target.value) : null })}
        />
      </label>

      <label>
        Activity level
        <select
          value={value.activity_level ?? ""}
          onChange={(e) => onChange({ ...value, activity_level: e.target.value as ActivityLevel })}
          required
        >
          <option value="" disabled>
            เลือก
          </option>
          {Object.entries(ACTIVITY_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label>
        เป้าหมาย
        <select value={value.goal ?? ""} onChange={(e) => onChange({ ...value, goal: e.target.value as Goal })} required>
          <option value="" disabled>
            เลือก
          </option>
          {Object.entries(GOAL_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label>
        สูตรคำนวณ
        <select value={value.formula_choice} onChange={(e) => onChange({ ...value, formula_choice: e.target.value as Formula })}>
          {Object.entries(FORMULA_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <span className="field-help">{FORMULA_HELP[value.formula_choice]}</span>
      </label>

      {showKatchWarning && (
        <p className="warning">เลือก Katch-McArdle ไว้แต่ยังไม่มี body fat % — คำนวณด้วย Mifflin-St Jeor ไปก่อนจนกว่าจะกรอก</p>
      )}
    </div>
  );
}
