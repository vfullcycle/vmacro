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
// (2026-08-19, round 3) Absolute error alone has its own blind spot the other direction —
// it scales with dish size (a 500kcal dish naturally has more room for absolute miss than
// a 50kcal one), so items with explicit large gram servings looked artificially "worse"
// than small ones even at similar real accuracy. Added a size-normalized companion metric:
// each macro's absolute error converted to its kcal-equivalent (protein/carbs x4, fat x9)
// then expressed as % of that item's own actual kcal — comparable across items regardless
// of dish size, and never blows up the way %-of-that-macro's-own-actual did for
// near-zero-gram macros (kcal is essentially never near zero for a real dish).
//
// Also added: range coverage (does actual fall inside the model's [low, high]?) and mean
// range width per macro — a model that's "right" 100% of the time by giving an absurdly
// wide range is not useful; coverage and width must be read together.
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
const KCAL_FACTOR = { kcal: 1, protein_g: 4, carbs_g: 4, fat_g: 9 };

function absError(estimate, actual) {
  return Math.abs(estimate - actual);
}

// secondary/annotation only — not used for summary stats anymore, see file header
function pctError(estimate, actual) {
  if (actual === 0) return estimate === 0 ? 0 : null;
  return (Math.abs(estimate - actual) / actual) * 100;
}

// this macro's absolute error, converted to kcal and expressed as % of the item's own
// actual total kcal — size-normalized, comparable across items and across macros
function relToDishKcal(estimate, actual, macro, actualKcal) {
  if (actualKcal === 0) return null;
  const kcalEquivError = Math.abs(estimate - actual) * KCAL_FACTOR[macro];
  return (kcalEquivError / actualKcal) * 100;
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
      const relKcal = Object.fromEntries(MACROS.map((m) => [m, relToDishKcal(estimate[m], food[m], m, food.kcal)]));
      const covered = Object.fromEntries(
        MACROS.map((m) => [m, estimate.ranges ? food[m] >= estimate.ranges[m][0] && food[m] <= estimate.ranges[m][1] : null]),
      );
      const width = Object.fromEntries(MACROS.map((m) => [m, estimate.ranges ? estimate.ranges[m][1] - estimate.ranges[m][0] : null]));
      results.push({ name: food.name, quantity, actual: food, estimate, abs, pct, relKcal, covered, width });
      console.log("ok");
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      results.push({
        name: food.name,
        quantity,
        actual: food,
        estimate: null,
        abs: null,
        pct: null,
        relKcal: null,
        covered: null,
        width: null,
        failed: true,
      });
    }
    // small delay — polite to Anthropic's API, this isn't a latency benchmark
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log();

  console.log("== Step 3: report ==");
  const ok = results.filter((r) => !r.failed);
  console.log(`${ok.length}/${results.length} estimates succeeded.\n`);

  console.log("Per-item (absolute error, unit per macro: kcal/g/g/g — %-of-that-macro and %-of-dish-kcal shown for reference):");
  for (const r of results) {
    if (r.failed) {
      console.log(`  ${r.name} (${r.quantity}): FAILED`);
      continue;
    }
    const parts = MACROS.map((m) => {
      const pctLabel = r.pct[m] === null ? "n/a%" : `${r.pct[m].toFixed(0)}%`;
      const relLabel = r.relKcal[m] === null ? "n/a%dish" : `${r.relKcal[m].toFixed(1)}%dish`;
      const covLabel = r.covered[m] === null ? "" : r.covered[m] ? " [covered]" : " [MISSED]";
      return `${m}=${r.abs[m].toFixed(1)} (${pctLabel}, ${relLabel})${covLabel} [actual ${r.actual[m]}, est ${r.estimate[m]}]`;
    });
    console.log(`  ${r.name} (${r.quantity}): ${parts.join(", ")}`);
  }
  console.log();

  console.log("Summary per macro — ABSOLUTE error:");
  for (const m of MACROS) {
    const errs = ok.map((r) => r.abs[m]).sort((a, b) => a - b);
    const avg = errs.reduce((s, e) => s + e, 0) / errs.length;
    const unit = m === "kcal" ? "kcal" : "g";
    console.log(
      `  ${m}: avg=${avg.toFixed(1)}${unit} median=${percentile(errs, 50).toFixed(1)}${unit} p90=${percentile(errs, 90).toFixed(1)}${unit} (n=${errs.length})`,
    );
  }
  console.log();

  console.log("Summary per macro — error as % of that item's own dish kcal (size-normalized, round 3):");
  for (const m of MACROS) {
    const errs = ok.map((r) => r.relKcal[m]).filter((v) => v !== null).sort((a, b) => a - b);
    const avg = errs.reduce((s, e) => s + e, 0) / errs.length;
    console.log(
      `  ${m}: avg=${avg.toFixed(1)}% median=${percentile(errs, 50).toFixed(1)}% p90=${percentile(errs, 90).toFixed(1)}% (n=${errs.length})`,
    );
  }
  console.log();

  console.log("Summary per macro — range coverage + mean width (round 3):");
  for (const m of MACROS) {
    const withRanges = ok.filter((r) => r.covered[m] !== null);
    if (withRanges.length === 0) {
      console.log(`  ${m}: no range data`);
      continue;
    }
    const coverageRate = (withRanges.filter((r) => r.covered[m]).length / withRanges.length) * 100;
    const avgWidth = withRanges.reduce((s, r) => s + r.width[m], 0) / withRanges.length;
    const unit = m === "kcal" ? "kcal" : "g";
    console.log(`  ${m}: coverage=${coverageRate.toFixed(0)}% (actual within [low,high]) avg width=${avgWidth.toFixed(1)}${unit} (n=${withRanges.length})`);
  }
  console.log();

  console.log("Worst 3 items by kcal absolute error:");
  const ranked = [...ok].sort((a, b) => b.abs.kcal - a.abs.kcal).slice(0, 3);
  for (const r of ranked) {
    console.log(
      `  ${r.name}: kcal off by ${r.abs.kcal.toFixed(0)} (actual ${r.actual.kcal}, est ${r.estimate.kcal}, ${r.relKcal.kcal.toFixed(1)}% of dish) — protein ${r.abs.protein_g.toFixed(1)}g, carbs ${r.abs.carbs_g.toFixed(1)}g, fat ${r.abs.fat_g.toFixed(1)}g off`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
