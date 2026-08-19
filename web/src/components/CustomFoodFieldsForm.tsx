// Shared field markup between CustomFoodForm.tsx (manual entry/edit) and AiFoodImport.tsx
// (D-023 AI pre-fill) — same fields, same editability, by construction rather than by
// convention. Purely presentational: caller owns the state and the <form>/submit button.
import { EXTRA_FIELDS, GROUP_LABELS, GROUP_ORDER, type CoreFormState, type ExtraFormState, type ExtraUnit } from "../lib/customFoodNutrients";

type CoreRangeKey = "kcal" | "protein_g" | "carbs_g" | "fat_g";

function RangeHint({ range }: { range?: [number, number] }) {
  if (!range) return null;
  return (
    <span className="core-range-hint">
      ช่วงประมาณ {range[0]}–{range[1]}
    </span>
  );
}

export default function CustomFoodFieldsForm({
  core,
  setCore,
  extras,
  setExtras,
  ranges,
}: {
  core: CoreFormState;
  setCore: (core: CoreFormState) => void;
  extras: ExtraFormState;
  setExtras: (extras: ExtraFormState) => void;
  // AI Import only (D-023) — manual entry (CustomFoodForm.tsx) never passes this, so it
  // never renders there. Purely a hint; every field stays editable regardless.
  ranges?: Partial<Record<CoreRangeKey, [number, number]>>;
}) {
  return (
    <>
      <label>
        ชื่ออาหาร
        <input value={core.name} onChange={(e) => setCore({ ...core, name: e.target.value })} required />
      </label>

      <label>
        ชื่อ serving (เช่น "1 จาน", "1 ทัพพี") — ไม่บังคับ
        <input value={core.serving_label} onChange={(e) => setCore({ ...core, serving_label: e.target.value })} />
      </label>

      <label>
        น้ำหนัก 1 serving (กรัม)
        <input
          type="number"
          step="0.1"
          value={core.serving_size_g}
          onChange={(e) => setCore({ ...core, serving_size_g: e.target.value })}
          required
        />
      </label>

      <div className="form-row">
        <label>
          Kcal
          <RangeHint range={ranges?.kcal} />
          <input type="number" step="0.1" value={core.kcal} onChange={(e) => setCore({ ...core, kcal: e.target.value })} required />
        </label>
        <label>
          Protein (g)
          <RangeHint range={ranges?.protein_g} />
          <input type="number" step="0.1" value={core.protein_g} onChange={(e) => setCore({ ...core, protein_g: e.target.value })} required />
        </label>
      </div>

      <div className="form-row">
        <label>
          Carbs (g)
          <RangeHint range={ranges?.carbs_g} />
          <input type="number" step="0.1" value={core.carbs_g} onChange={(e) => setCore({ ...core, carbs_g: e.target.value })} required />
        </label>
        <label>
          Fat (g)
          <RangeHint range={ranges?.fat_g} />
          <input type="number" step="0.1" value={core.fat_g} onChange={(e) => setCore({ ...core, fat_g: e.target.value })} required />
        </label>
      </div>

      <p className="form-hint">
        ข้อมูลเสริมด้านล่างไม่บังคับ — กรอกเท่าที่มีข้อมูลจริง (เช่น จากฉลากโภชนาการ) เลือกหน่วยได้ทั้งค่าจริง ({"มก./ไมโครกรัม"})
        หรือ % ของปริมาณที่แนะนำต่อวัน ถ้าฉลากให้มาแค่ %
      </p>

      {GROUP_ORDER.map((group) => (
        <div key={group} className="extra-group">
          <p className="form-section-label">{GROUP_LABELS[group]}</p>
          <div className="form-grid">
            {EXTRA_FIELDS.filter((f) => f.group === group).map((field) => {
              const entry = extras[field.key] ?? { value: "", unit: "abs" as const };
              return (
                <label key={field.key} className="extra-field-row">
                  {field.label}
                  <span className="extra-field-input-group">
                    <input
                      type="number"
                      step="0.1"
                      value={entry.value}
                      onChange={(e) => setExtras({ ...extras, [field.key]: { ...entry, value: e.target.value } })}
                    />
                    <select
                      value={entry.unit}
                      onChange={(e) => setExtras({ ...extras, [field.key]: { ...entry, unit: e.target.value as ExtraUnit } })}
                    >
                      <option value="abs">{field.unit}</option>
                      <option value="pct">%</option>
                    </select>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
