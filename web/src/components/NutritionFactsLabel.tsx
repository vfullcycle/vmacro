import type { NutrientPanel, ScalableNutrients } from "../lib/scaling";
import "./NutritionFactsLabel.css";

const FAT_ROWS: { key: string; label: string }[] = [
  { key: "saturated_fat_g", label: "ไขมันอิ่มตัว" },
  { key: "trans_fat_g", label: "ไขมันทรานส์" },
  { key: "polyunsaturated_fat_g", label: "ไขมันไม่อิ่มตัวหลายตำแหน่ง" },
  { key: "monounsaturated_fat_g", label: "ไขมันไม่อิ่มตัวตำแหน่งเดียว" },
];

const CARB_ROWS: { key: string; label: string }[] = [
  { key: "fiber_g", label: "ใยอาหาร" },
  { key: "sugar_g", label: "น้ำตาล" },
  { key: "added_sugars_g", label: "น้ำตาลที่เติมเพิ่ม" },
];

const OTHER_ROWS: { key: string; label: string }[] = [
  { key: "cholesterol_mg", label: "คอเลสเตอรอล" },
  { key: "sodium_mg", label: "โซเดียม" },
];

const VITAMIN_LABELS: Record<string, string> = {
  vitamin_a_mcg: "วิตามินเอ",
  vitamin_c_mg: "วิตามินซี",
  vitamin_d_mcg: "วิตามินดี",
};

const MINERAL_LABELS: Record<string, string> = {
  calcium_mg: "แคลเซียม",
  iron_mg: "ธาตุเหล็ก",
  potassium_mg: "โพแทสเซียม",
};

function formatValue(key: string, value: number): string {
  const unit = key.endsWith("_mg") ? "mg" : key.endsWith("_mcg") ? "mcg" : key.endsWith("_g") ? "g" : "";
  return `${value}${unit}`;
}

function Row({ label, value, indent }: { label: string; value: string; indent?: boolean }) {
  return (
    <div className={`nfl-row${indent ? " nfl-row-indent" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function NestedGroup({ title, panel, labels }: { title: string; panel: NutrientPanel | undefined; labels: Record<string, string> }) {
  if (!panel) return null;
  const entries = Object.entries(labels).filter(([key]) => typeof panel[key] === "number");
  if (!entries.length) return null;
  return (
    <div className="nfl-section">
      <div className="nfl-section-title">{title}</div>
      {entries.map(([key, label]) => (
        <Row key={key} label={label} value={formatValue(key, panel[key] as number)} />
      ))}
    </div>
  );
}

export default function NutritionFactsLabel({
  nutrients,
  servingDescription,
}: {
  nutrients: ScalableNutrients;
  servingDescription: string;
}) {
  const panel = nutrients.nutrients ?? {};

  return (
    <div className="nutrition-facts-label">
      <h2>ข้อมูลโภชนาการ</h2>
      <p className="nfl-serving">{servingDescription}</p>
      <div className="nfl-divider-thick" />
      <div className="nfl-row nfl-calories">
        <span>แคลอรี่</span>
        <span>{Math.round(nutrients.kcal)}</span>
      </div>
      <div className="nfl-divider-thick" />

      <Row label="ไขมันทั้งหมด" value={`${nutrients.fat_g}g`} />
      {FAT_ROWS.filter((r) => typeof panel[r.key] === "number").map((r) => (
        <Row key={r.key} label={r.label} value={formatValue(r.key, panel[r.key] as number)} indent />
      ))}

      {OTHER_ROWS.filter((r) => typeof panel[r.key] === "number").map((r) => (
        <Row key={r.key} label={r.label} value={formatValue(r.key, panel[r.key] as number)} />
      ))}

      <Row label="คาร์โบไฮเดรตทั้งหมด" value={`${nutrients.carbs_g}g`} />
      {CARB_ROWS.filter((r) => typeof panel[r.key] === "number").map((r) => (
        <Row key={r.key} label={r.label} value={formatValue(r.key, panel[r.key] as number)} indent />
      ))}

      <div className="nfl-divider" />
      <Row label="โปรตีน" value={`${nutrients.protein_g}g`} />
      <div className="nfl-divider-thick" />

      <NestedGroup title="วิตามิน" panel={panel.vitamins as NutrientPanel | undefined} labels={VITAMIN_LABELS} />
      <NestedGroup title="แร่ธาตุ" panel={panel.minerals as NutrientPanel | undefined} labels={MINERAL_LABELS} />
    </div>
  );
}
