import { API_BASE_URL } from "../config";
import { supabase } from "./supabase";

export async function translateTexts(texts: string[], targetLang: "th" | "en"): Promise<string[]> {
  // /translate spends วี's own Anthropic credit, so it requires a logged-in caller
  // (D-015 amendment) — anonymous visitors (public search, D-012) get a 401 here and
  // every call site already falls back to showing English on any /translate failure.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${API_BASE_URL}/translate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ texts, targetLang }),
  });
  if (!res.ok) {
    throw new Error(`translate failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.translations;
}
