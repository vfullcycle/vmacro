import "./PriceInput.css";

// FR-DIARY-4 (BL-01) — shown only at the 4 diary-entry creation points that already have a
// form step (FoodDetail x3 sources, QuickAddFoodModal); deliberately not added to any
// tap-to-add flow (favorites/recent/templates/copy-from-yesterday) since that would break
// the "≤3 taps" goal those flows are built around.
export default function PriceInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="price-input">
      ราคา (บาท, ไม่บังคับ)
      <input type="number" step="1" min="0" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder="เว้นว่างได้" />
    </label>
  );
}
