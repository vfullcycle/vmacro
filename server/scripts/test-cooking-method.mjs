#!/usr/bin/env node
// D-023 round 3 — within-item test for the cooking-method context feature (see
// docs/research/ai-import.md §4 "oil absorption" ceiling). วีpicked 4 dishes he knows the
// real cooking method + verified macros for, specifically including a same-ingredient
// pair (อกไก่ทอด vs อกไก่จี่) that differ ONLY in cooking method, as a reference for how
// large the true effect of oil absorption should be.
//
// For each item, calls getNutritionEstimate() twice with the identical name+quantity:
//   (a) no cookingMethod passed at all
//   (b) cookingMethod passed as วีstates it was actually cooked
// Both calls still see the cooking method mentioned in the free-text name itself (Thai
// dish names like "อกไก่ทอด"/"อกไก่จี่" already say it) — the question this isolates is
// whether the *dedicated* cookingMethod field moves the estimate any further than what's
// already implied by the name text alone.
//
// Usage: node server/scripts/test-cooking-method.mjs
// Needs server/.env (same file the proxy itself uses).

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getNutritionEstimate } from "../src/anthropic.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.join(__dirname, "../.env");

async function loadEnv() {
  const raw = await readFile(ENV_FILE, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

// วี's 4-item set (2026-08-20), with the cookingMethod each maps to from
// web/src/lib/aiImport.ts COOKING_METHODS. "ไข่เจียว" doesn't literally match any option
// perfectly — mapped to the closest (ทอดน้ำมันน้อย), flagged in the report as a judgment
// call rather than an exact fit.
const ITEMS = [
  {
    name: "อกไก่ทอด ไม่ชุบแป้ง",
    quantity: "100 g เนื้อสุก",
    cookingMethod: "ทอดน้ำมันน้อย",
    actual: { kcal: 190, protein_g: 30, carbs_g: 0, fat_g: 7 },
  },
  {
    name: "หมูสันในผัดน้ำมัน",
    quantity: "100 g เนื้อสุก",
    cookingMethod: "ผัด",
    actual: { kcal: 195, protein_g: 28, carbs_g: 0, fat_g: 9 },
  },
  {
    name: "ไข่เจียว",
    quantity: "ไข่ไก่ 1 ฟอง",
    cookingMethod: "ทอดน้ำมันน้อย", // judgment call — no exact match in COOKING_METHODS, see header
    actual: { kcal: 130, protein_g: 6.5, carbs_g: 0.5, fat_g: 11 },
  },
  {
    name: "อกไก่จี่ ไม่ใช้น้ำมัน",
    quantity: "100 g เนื้อสุก",
    cookingMethod: "ปิ้ง/จี่ ไม่ใช้น้ำมัน",
    actual: { kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
  },
];

const MACROS = ["kcal", "protein_g", "carbs_g", "fat_g"];

async function main() {
  await loadEnv();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY in server/.env");
    process.exit(1);
  }

  const results = [];
  for (const item of ITEMS) {
    console.log(`\n== ${item.name} (${item.quantity}) — actual cooking method: ${item.cookingMethod} ==`);

    process.stdout.write("  (a) without cookingMethod... ");
    const without = await getNutritionEstimate(item.name, item.quantity, null, undefined, "estimate", null);
    console.log("ok");
    await new Promise((r) => setTimeout(r, 500));

    process.stdout.write("  (b) with cookingMethod...    ");
    const withMethod = await getNutritionEstimate(item.name, item.quantity, null, undefined, "estimate", item.cookingMethod);
    console.log("ok");
    await new Promise((r) => setTimeout(r, 500));

    results.push({ item, without, withMethod });
  }

  console.log("\n\n== Report ==\n");
  for (const { item, without, withMethod } of results) {
    console.log(`${item.name} (actual cooking method: ${item.cookingMethod})`);
    for (const m of MACROS) {
      const a = item.actual[m];
      const w = without[m];
      const wm = withMethod[m];
      const shift = wm - w;
      const towardActual = Math.abs(wm - a) < Math.abs(w - a) ? "toward actual" : Math.abs(wm - a) > Math.abs(w - a) ? "AWAY from actual" : "no change";
      console.log(
        `  ${m}: actual=${a}  without=${w.toFixed(1)}  with=${wm.toFixed(1)}  shift=${shift >= 0 ? "+" : ""}${shift.toFixed(1)} (${towardActual})`,
      );
    }
    console.log();
  }

  console.log("== Reference pair: อกไก่ทอด vs อกไก่จี่ (same ingredient, cooking method is the only real difference) ==");
  const fried = results.find((r) => r.item.name === "อกไก่ทอด ไม่ชุบแป้ง");
  const grilled = results.find((r) => r.item.name === "อกไก่จี่ ไม่ใช้น้ำมัน");
  if (fried && grilled) {
    const actualDiffKcal = fried.item.actual.kcal - grilled.item.actual.kcal;
    const actualDiffFat = fried.item.actual.fat_g - grilled.item.actual.fat_g;
    const withoutDiffKcal = fried.without.kcal - grilled.without.kcal;
    const withoutDiffFat = fried.without.fat_g - grilled.without.fat_g;
    const withDiffKcal = fried.withMethod.kcal - grilled.withMethod.kcal;
    const withDiffFat = fried.withMethod.fat_g - grilled.withMethod.fat_g;
    console.log(`  Ground truth gap (ทอด - จี่): kcal +${actualDiffKcal}, fat +${actualDiffFat}g`);
    console.log(`  Model gap WITHOUT cookingMethod: kcal ${withoutDiffKcal >= 0 ? "+" : ""}${withoutDiffKcal.toFixed(1)}, fat ${withoutDiffFat >= 0 ? "+" : ""}${withoutDiffFat.toFixed(1)}g`);
    console.log(`  Model gap WITH cookingMethod:    kcal ${withDiffKcal >= 0 ? "+" : ""}${withDiffKcal.toFixed(1)}, fat ${withDiffFat >= 0 ? "+" : ""}${withDiffFat.toFixed(1)}g`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
