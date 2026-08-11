import type { computeFullPreview } from "../lib/preview";
import "./TdeePreview.css";

type Preview = ReturnType<typeof computeFullPreview>;

export default function TdeePreview({ preview }: { preview: Preview }) {
  return (
    <div className="tdee-preview">
      <h2>ผลคำนวณ</h2>
      <dl>
        <dt>อายุ</dt>
        <dd>{preview.age} ปี</dd>
        <dt>BMR</dt>
        <dd>{Math.round(preview.bmrResult.bmr)} kcal</dd>
        <dt>TDEE</dt>
        <dd>{Math.round(preview.tdee)} kcal</dd>
        <dt>เป้าหมาย</dt>
        <dd>
          {preview.target.target_kcal} kcal ({preview.target.weekly_rate_kg >= 0 ? "+" : ""}
          {preview.target.weekly_rate_kg.toFixed(2)} kg/สัปดาห์)
        </dd>
        <dt>Macro</dt>
        <dd>
          P {preview.macros.protein_g}g / F {preview.macros.fat_g}g / C {preview.macros.carb_g}g
        </dd>
      </dl>
    </div>
  );
}
