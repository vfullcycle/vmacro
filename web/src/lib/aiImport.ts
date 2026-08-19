// FR-FOOD-7 / D-023 — calls the /ai-import proxy endpoint. Same auth pattern as
// translateTexts() in ./translate.ts (Supabase session bearer token).
import { API_BASE_URL } from "../config";
import { supabase } from "./supabase";

export interface AiNutritionEstimate {
  name: string;
  serving_label: string | null;
  serving_size_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: Record<string, unknown>;
  // ~80%-confidence range per core macro (server computes kcal/protein_g/carbs_g/fat_g
  // above as the midpoint of these) — shown as a hint in the preview, never blocks editing.
  ranges: {
    kcal: [number, number];
    protein_g: [number, number];
    carbs_g: [number, number];
    fat_g: [number, number];
  };
}

export type AiImportMode = "estimate" | "read_label";

export async function getAiNutritionEstimate(
  name: string,
  quantity: string,
  photo?: { base64: string; mediaType: string },
  mode: AiImportMode = "estimate",
): Promise<AiNutritionEstimate> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${API_BASE_URL}/ai-import`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name,
      quantity,
      photoBase64: photo?.base64,
      photoMediaType: photo?.mediaType,
      mode,
    }),
  });
  if (!res.ok) {
    throw new Error(`AI import failed: HTTP ${res.status}`);
  }
  return res.json();
}

// Downscales + compresses before base64-encoding, so a raw camera photo doesn't blow up
// request size/cost/latency — the model only needs enough resolution to identify
// ingredients, not full camera resolution.
export function resizeImageToBase64(file: File, maxDim = 1024, quality = 0.7): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("โหลดรูปไม่สำเร็จ"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas ไม่พร้อมใช้งาน"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg" });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
