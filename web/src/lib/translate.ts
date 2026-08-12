import { API_BASE_URL } from "../config";

export async function translateTexts(texts: string[], targetLang: "th" | "en"): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, targetLang }),
  });
  if (!res.ok) {
    throw new Error(`translate failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.translations;
}
