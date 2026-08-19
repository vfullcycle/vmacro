#!/usr/bin/env node
// D-023 / FR-FOOD-7 condition 2: ground-truth diff before AI Import opens to friends.
// Pulls วี's already-verified custom_foods (public read per D-012) as ground truth, calls
// getNutritionEstimate() with the same name+quantity (no photo), and reports absolute
// error per macro (kcal / g) so วีcan set a real threshold instead of guessing one.
//
// (2026-08-19, round 2) Switched from % error to absolute error as the primary metric —
// % error is dominated by items with a tiny actual value (e.g. 0.8g protein), where being
// off by 1.4g reads as "275%" and drowns out everything else. Absolute error is what a
// user actually experiences when editing the pre-filled form, and it has no divide-by-zero
// edge case (an item with actual fat=0g and an estimate of 16g is simply "16g off").
//
// Branded/packaged vs home-cooked grouping is NOT done in this script — see the report
// step's printed per-item list; a human sorts that by eye (more reliable than a keyword
// heuristic that could misclassify silently).
//
// Usage: node server/scripts/validate-ai-import.mjs
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

const MACROS = ["kcal", "protein_g", "carbs_g", "fat_g"];

function absError(estimate, actual) {
  return Math.abs(estimate - actual);
}

// secondary/annotation only — not used for summary stats anymore, see file header
function pctError(estimate, actual) {
  if (actual === 0) return estimate === 0 ? 0 : null;
  return (Math.abs(estimate - actual) / actual) * 100;
}

function percentile(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  await loadEnv();
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !process.env.ANTHROPIC_API_KEY) {
    console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY / ANTHROPIC_API_KEY in server/.env");
    process.exit(1);
  }

  console.log("== Step 1: fetching verified custom_foods as ground truth ==");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/custom_foods?is_verified=eq.true&select=name,serving_label,serving_size_g,kcal,protein_g,carbs_g,fat_g&limit=50`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
  );
  if (!res.ok) {
    console.error(`Supabase query failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const groundTruth = await res.json();
  console.log(`Got ${groundTruth.length} verified custom_foods.`);
  if (groundTruth.length < 15) {
    console.warn(
      `WARNING: only ${groundTruth.length} verified rows found — fewer than the 15-20 the plan called for. Numbers below are still real, but treat the summary as extra-provisional.`,
    );
  }
  console.log();

  console.log("== Step 2: calling getNutritionEstimate() per item (no photo) ==");
  const results = [];
  for (const [i, food] of groundTruth.entries()) {
    const quantity = food.serving_label?.trim() || `${food.serving_size_g}g`;
    process.stdout.write(`[${i + 1}/${groundTruth.length}] ${food.name} (${quantity})... `);
    try {
      const estimate = await getNutritionEstimate(food.name, quantity, null, undefined);
      const abs = Object.fromEntries(MACROS.map((m) => [m, absError(estimate[m], food[m])]));
      const pct = Object.fromEntries(MACROS.map((m) => [m, pctError(estimate[m], food[m])]));
      results.push({ name: food.name, quantity, actual: food, estimate, abs, pct });
      console.log("ok");
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      results.push({ name: food.name, quantity, actual: food, estimate: null, abs: null, pct: null, failed: true });
    }
    // small delay — polite to Anthropic's API, this isn't a latency benchmark
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log();

  console.log("== Step 3: report ==");
  const ok = results.filter((r) => !r.failed);
  console.log(`${ok.length}/${results.length} estimates succeeded.\n`);

  console.log("Per-item (absolute error, unit per macro: kcal/g/g/g — % shown for reference only):");
  for (const r of results) {
    if (r.failed) {
      console.log(`  ${r.name} (${r.quantity}): FAILED`);
      continue;
    }
    const parts = MACROS.map((m) => {
      const pctLabel = r.pct[m] === null ? "n/a%" : `${r.pct[m].toFixed(0)}%`;
      return `${m}=${r.abs[m].toFixed(1)} (${pctLabel}) [actual ${r.actual[m]}, est ${r.estimate[m]}]`;
    });
    console.log(`  ${r.name} (${r.quantity}): ${parts.join(", ")}`);
  }
  console.log();

  console.log("Summary per macro — ABSOLUTE error (primary metric, 2026-08-19 round 2):");
  for (const m of MACROS) {
    const errs = ok.map((r) => r.abs[m]).sort((a, b) => a - b);
    const avg = errs.reduce((s, e) => s + e, 0) / errs.length;
    const unit = m === "kcal" ? "kcal" : "g";
    console.log(
      `  ${m}: avg=${avg.toFixed(1)}${unit} median=${percentile(errs, 50).toFixed(1)}${unit} p90=${percentile(errs, 90).toFixed(1)}${unit} (n=${errs.length})`,
    );
  }
  console.log();

  console.log("Worst 3 items by kcal absolute error:");
  const ranked = [...ok].sort((a, b) => b.abs.kcal - a.abs.kcal).slice(0, 3);
  for (const r of ranked) {
    console.log(
      `  ${r.name}: kcal off by ${r.abs.kcal.toFixed(0)} (actual ${r.actual.kcal}, est ${r.estimate.kcal}) — protein ${r.abs.protein_g.toFixed(1)}g, carbs ${r.abs.carbs_g.toFixed(1)}g, fat ${r.abs.fat_g.toFixed(1)}g off`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
