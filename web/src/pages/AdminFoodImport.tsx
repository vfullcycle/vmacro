import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { useIsAdmin } from "../lib/use-is-admin";
import { supabase } from "../lib/supabase";
import "./AdminFoodImport.css";

interface ParsedItem {
  name: string;
  serving_label: string | null;
  serving_size_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: Record<string, unknown>;
}

interface ParseResult {
  label: string;
  item: ParsedItem | null;
  error: string | null;
}

interface ImportOutcome {
  name: string;
  id?: string;
  error?: string;
}

const REQUIRED_NUMBER_FIELDS = ["serving_size_g", "kcal", "protein_g", "carbs_g", "fat_g"] as const;

function parseItem(raw: unknown, index: number): ParseResult {
  const label = `รายการที่ ${index + 1}`;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { label, item: null, error: "ไม่ใช่ JSON object" };
  }
  const obj = raw as Record<string, unknown>;
  const displayLabel = typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : label;

  if (typeof obj.name !== "string" || !obj.name.trim()) {
    return { label: displayLabel, item: null, error: "ขาด name หรือไม่ใช่ข้อความ" };
  }
  for (const field of REQUIRED_NUMBER_FIELDS) {
    const value = obj[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { label: displayLabel, item: null, error: `ขาด "${field}" หรือไม่ใช่ตัวเลข` };
    }
  }
  const nutrients =
    typeof obj.nutrients === "object" && obj.nutrients !== null && !Array.isArray(obj.nutrients)
      ? (obj.nutrients as Record<string, unknown>)
      : {};

  return {
    label: displayLabel,
    error: null,
    item: {
      name: obj.name.trim(),
      serving_label: typeof obj.serving_label === "string" && obj.serving_label.trim() ? obj.serving_label.trim() : null,
      serving_size_g: obj.serving_size_g as number,
      kcal: obj.kcal as number,
      protein_g: obj.protein_g as number,
      carbs_g: obj.carbs_g as number,
      fat_g: obj.fat_g as number,
      nutrients,
    },
  };
}

export default function AdminFoodImport() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [text, setText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [results, setResults] = useState<ParseResult[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [outcomes, setOutcomes] = useState<ImportOutcome[] | null>(null);

  if (adminLoading) return <p>กำลังโหลด...</p>;
  if (!isAdmin) return <Navigate to="/settings" replace />;

  function handleParse() {
    setOutcomes(null);
    setParseError(null);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (e) {
      setResults(null);
      setParseError(e instanceof Error ? e.message : "JSON ไม่ถูกต้อง");
      return;
    }
    const items = Array.isArray(json) ? json : [json];
    setResults(items.map(parseItem));
  }

  async function handleImport() {
    if (!results || !user) return;
    const validItems = results.filter((r): r is ParseResult & { item: ParsedItem } => r.item !== null).map((r) => r.item);
    if (!validItems.length) return;

    setImporting(true);
    const rows = validItems.map((item) => ({ ...item, creator_id: user.id }));
    const { data, error } = await supabase.from("custom_foods").insert(rows).select("id, name");
    setImporting(false);

    if (error) {
      setOutcomes(validItems.map((item) => ({ name: item.name, error: error.message })));
      return;
    }
    setOutcomes((data ?? []).map((row) => ({ name: row.name as string, id: row.id as string })));
  }

  const validCount = results?.filter((r) => r.item).length ?? 0;
  const invalidCount = results ? results.length - validCount : 0;

  return (
    <main className="admin-food-import-page">
      <h1>Import อาหาร (JSON)</h1>
      <p className="form-hint">
        วาง JSON object เดียว หรือ array ของหลาย object ตาม schema เดียวกับฟอร์ม "เพิ่มอาหารใหม่"
        ระบบจะ set creator_id เป็นบัญชีที่ login อยู่ตอนนี้ให้อัตโนมัติเสมอ (ไม่สนใจ creator_id ที่ใส่มาใน JSON ถ้ามี)
      </p>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResults(null);
          setOutcomes(null);
          setParseError(null);
        }}
        rows={16}
        spellCheck={false}
        placeholder={'[{"name": "...", "serving_size_g": 100, "kcal": 100, "protein_g": 10, "carbs_g": 10, "fat_g": 5, "nutrients": {}}]'}
      />

      <button type="button" onClick={handleParse} disabled={!text.trim()}>
        ตรวจสอบ JSON
      </button>

      {parseError && <p className="error">JSON parse ไม่ผ่าน: {parseError}</p>}

      {results && (
        <div className="import-preview">
          <p>
            พบ {results.length} รายการ — ผ่าน {validCount}, ไม่ผ่าน {invalidCount}
          </p>
          <ul>
            {results.map((r, i) => (
              <li key={i} className={r.error ? "invalid" : "valid"}>
                {r.label} {r.error ? `— ${r.error}` : "— OK"}
              </li>
            ))}
          </ul>
          <button type="button" onClick={handleImport} disabled={!validCount || importing}>
            {importing ? "กำลัง import..." : `Import ${validCount} รายการ`}
          </button>
        </div>
      )}

      {outcomes && (
        <div className="import-result">
          <p className="form-section-label">ผลการ import</p>
          <ul>
            {outcomes.map((r, i) => (
              <li key={i} className={r.error ? "invalid" : "valid"}>
                {r.name} {r.error ? `— ล้มเหลว: ${r.error}` : "— บันทึกแล้ว"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
