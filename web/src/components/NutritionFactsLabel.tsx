import type { NutrientPanel, ScalableNutrients } from "../lib/scaling";
import "./NutritionFactsLabel.css";

interface NutrientDef {
  key: string;
  label: string;
}

const FAT_ROWS: NutrientDef[] = [
  { key: "saturated_fat", label: "ไขมันอิ่มตัว" },
  { key: "trans_fat", label: "ไขมันทรานส์" },
  { key: "polyunsaturated_fat", label: "ไขมันไม่อิ่มตัวหลายตำแหน่ง" },
  { key: "monounsaturated_fat", label: "ไขมันไม่อิ่มตัวตำแหน่งเดียว" },
];

const CARB_ROWS: NutrientDef[] = [
  { key: "fiber", label: "ใยอาหาร" },
  { key: "sugar", label: "น้ำตาล" },
  { key: "added_sugars", label: "น้ำตาลที่เติมเพิ่ม" },
];

const OTHER_ROWS: NutrientDef[] = [
  { key: "cholesterol", label: "คอเลสเตอรอล" },
  { key: "sodium", label: "โซเดียม" },
];

const VITAMIN_ROWS: NutrientDef[] = [
  { key: "vitamin_a", label: "วิตามินเอ" },
  { key: "vitamin_c", label: "วิตามินซี" },
  { key: "vitamin_d", label: "วิตามินดี" },
  { key: "vitamin_e", label: "วิตามินอี" },
  { key: "vitamin_k", label: "วิตามินเค" },
  { key: "vitamin_b1", label: "วิตามินบี1 (ไทอามีน)" },
  { key: "vitamin_b2", label: "วิตามินบี2 (ไรโบฟลาวิน)" },
  { key: "vitamin_b3", label: "วิตามินบี3 (ไนอาซิน)" },
  { key: "vitamin_b6", label: "วิตามินบี6" },
  { key: "vitamin_b12", label: "วิตามินบี12" },
  { key: "folate", label: "โฟเลต (บี9)" },
  { key: "biotin", label: "ไบโอติน (บี7)" },
  { key: "pantothenic_acid", label: "กรดแพนโททีนิก (บี5)" },
];

const MINERAL_ROWS: NutrientDef[] = [
  { key: "calcium", label: "แคลเซียม" },
  { key: "iron", label: "ธาตุเหล็ก" },
  { key: "potassium", label: "โพแทสเซียม" },
  { key: "magnesium", label: "แมกนีเซียม" },
  { key: "zinc", label: "สังกะสี" },
  { key: "phosphorus", label: "ฟอสฟอรัส" },
  { key: "iodine", label: "ไอโอดีน" },
  { key: "selenium", label: "ซีลีเนียม" },
  { key: "copper", label: "ทองแดง" },
  { key: "manganese", label: "แมงกานีส" },
  { key: "chloride", label: "คลอไรด์" },
];

// A nutrient can be stored either as an absolute amount (_g/_mg/_mcg) or as a
// percent of daily value (_pct) — CustomFoodForm lets the creator pick per field,
// since many Thai nutrition labels only print one or the other.
const VALUE_SUFFIXES = ["_g", "_mg", "_mcg", "_pct"] as const;

function readNutrient(panel: NutrientPanel, baseKey: string): { value: number; suffix: (typeof VALUE_SUFFIXES)[number] } | null {
  for (const suffix of VALUE_SUFFIXES) {
    const v = panel[`${baseKey}${suffix}`];
    if (typeof v === "number") return { value: v, suffix };
  }
  return null;
}

function formatBySuffix(suffix: string, value: number): string {
  if (suffix === "_pct") return `${value}%`;
  if (suffix === "_mg") return `${value}mg`;
  if (suffix === "_mcg") return `${value}mcg`;
  return `${value}g`;
}

function Row({ label, value, indent }: { label: string; value: string; indent?: boolean }) {
  return (
    <div className={`nfl-row${indent ? " nfl-row-indent" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function NutrientRows({ rows, panel, indent }: { rows: NutrientDef[]; panel: NutrientPanel; indent?: boolean }) {
  return (
    <>
      {rows.map((r) => {
        const found = readNutrient(panel, r.key);
        if (!found) return null;
        return <Row key={r.key} label={r.label} value={formatBySuffix(found.suffix, found.value)} indent={indent} />;
      })}
    </>
  );
}

function NestedGroup({ title, panel, rows }: { title: string; panel: NutrientPanel | undefined; rows: NutrientDef[] }) {
  if (!panel) return null;
  const hasAny = rows.some((r) => readNutrient(panel, r.key));
  if (!hasAny) return null;
  return (
    <div className="nfl-section">
      <div className="nfl-section-title">{title}</div>
      <NutrientRows rows={rows} panel={panel} />
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
      <NutrientRows rows={FAT_ROWS} panel={panel} indent />

      <NutrientRows rows={OTHER_ROWS} panel={panel} />

      <Row label="คาร์โบไฮเดรตทั้งหมด" value={`${nutrients.carbs_g}g`} />
      <NutrientRows rows={CARB_ROWS} panel={panel} indent />

      <div className="nfl-divider" />
      <Row label="โปรตีน" value={`${nutrients.protein_g}g`} />
      <div className="nfl-divider-thick" />

      <NestedGroup title="วิตามิน" panel={panel.vitamins as NutrientPanel | undefined} rows={VITAMIN_ROWS} />
      <NestedGroup title="แร่ธาตุ" panel={panel.minerals as NutrientPanel | undefined} rows={MINERAL_ROWS} />
    </div>
  );
}
