import type { NutrientPanel, ScalableNutrients } from "../lib/scaling";
import "./NutritionFactsLabel.css";

const FAT_ROWS: { key: string; label: string }[] = [
  { key: "saturated_fat_g", label: "Saturated Fat" },
  { key: "trans_fat_g", label: "Trans Fat" },
  { key: "polyunsaturated_fat_g", label: "Polyunsaturated Fat" },
  { key: "monounsaturated_fat_g", label: "Monounsaturated Fat" },
];

const CARB_ROWS: { key: string; label: string }[] = [
  { key: "fiber_g", label: "Dietary Fiber" },
  { key: "sugar_g", label: "Sugars" },
  { key: "added_sugars_g", label: "Added Sugars" },
];

const OTHER_ROWS: { key: string; label: string }[] = [
  { key: "cholesterol_mg", label: "Cholesterol" },
  { key: "sodium_mg", label: "Sodium" },
];

const VITAMIN_LABELS: Record<string, string> = {
  vitamin_a_mcg: "Vitamin A",
  vitamin_c_mg: "Vitamin C",
  vitamin_d_mcg: "Vitamin D",
};

const MINERAL_LABELS: Record<string, string> = {
  calcium_mg: "Calcium",
  iron_mg: "Iron",
  potassium_mg: "Potassium",
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
      <h2>Nutrition Facts</h2>
      <p className="nfl-serving">{servingDescription}</p>
      <div className="nfl-divider-thick" />
      <div className="nfl-row nfl-calories">
        <span>Calories</span>
        <span>{Math.round(nutrients.kcal)}</span>
      </div>
      <div className="nfl-divider-thick" />

      <Row label="Total Fat" value={`${nutrients.fat_g}g`} />
      {FAT_ROWS.filter((r) => typeof panel[r.key] === "number").map((r) => (
        <Row key={r.key} label={r.label} value={formatValue(r.key, panel[r.key] as number)} indent />
      ))}

      {OTHER_ROWS.filter((r) => typeof panel[r.key] === "number").map((r) => (
        <Row key={r.key} label={r.label} value={formatValue(r.key, panel[r.key] as number)} />
      ))}

      <Row label="Total Carbohydrate" value={`${nutrients.carbs_g}g`} />
      {CARB_ROWS.filter((r) => typeof panel[r.key] === "number").map((r) => (
        <Row key={r.key} label={r.label} value={formatValue(r.key, panel[r.key] as number)} indent />
      ))}

      <div className="nfl-divider" />
      <Row label="Protein" value={`${nutrients.protein_g}g`} />
      <div className="nfl-divider-thick" />

      <NestedGroup title="Vitamins" panel={panel.vitamins as NutrientPanel | undefined} labels={VITAMIN_LABELS} />
      <NestedGroup title="Minerals" panel={panel.minerals as NutrientPanel | undefined} labels={MINERAL_LABELS} />
    </div>
  );
}
