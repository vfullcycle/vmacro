import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BodyDataFields, { type BodyDataValue } from "../components/BodyDataFields";
import TdeePreview from "../components/TdeePreview";
import { computeFullPreview } from "../lib/preview";
import "./Calculator.css";

const EMPTY_VALUE: BodyDataValue = {
  sex: null,
  birth_date: null,
  height_cm: null,
  weight_kg: null,
  body_fat_pct: null,
  activity_level: null,
  goal: null,
  formula_choice: "mifflin",
};

export default function Calculator() {
  const [value, setValue] = useState<BodyDataValue>(EMPTY_VALUE);

  const preview = useMemo(() => {
    if (!value.sex || !value.birth_date || !value.height_cm || !value.weight_kg || !value.activity_level || !value.goal) {
      return null;
    }
    return computeFullPreview({
      formula: value.formula_choice,
      sex: value.sex,
      birth_date: value.birth_date,
      height_cm: value.height_cm,
      weight_kg: value.weight_kg,
      body_fat_pct: value.body_fat_pct,
      activity_level: value.activity_level,
      goal: value.goal,
    });
  }, [value]);

  return (
    <main className="calculator-page">
      <h1>คำนวณ TDEE / Macro</h1>
      <p className="hint">ลองคำนวณได้เลยโดยไม่ต้อง login — ข้อมูลจะไม่ถูกบันทึกไว้ที่ไหนทั้งสิ้น</p>

      <form onSubmit={(e) => e.preventDefault()}>
        <BodyDataFields value={value} onChange={setValue} showKatchWarning={!!preview?.bmrResult.fallback_applied} />
      </form>

      {preview && <TdeePreview preview={preview} />}

      <div className="calculator-cta">
        <p>อยากบันทึกโปรไฟล์ ดูกราฟน้ำหนักย้อนหลัง และใช้ฟีเจอร์อื่นๆ?</p>
        <Link to="/login" className="cta-button">
          Login เพื่อบันทึก
        </Link>
      </div>
    </main>
  );
}
