#!/usr/bin/env node
// D-023 / FR-FOOD-7 condition 2: ground-truth diff before AI Import opens to friends.
// Pulls วี's already-verified custom_foods (public read per D-012) as ground truth, calls
// getNutritionEstimate() with the same name+quantity (no photo), and reports % error per
// macro so วีcan set a real threshold instead of guessing one.
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

function pctError(estimate, actual) {
  if (actual === 0) return estimate === 0 ? 0 : null; // undefined % error against a zero baseline
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
    `${SUPABASE_URL}/rest/v1/custom_foods?is_verified=eq.true&select=name,serving_label,serving_size_g,kcal,protein_g,carbs_g,fat_g&limit=20`,
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
      const errors = Object.fromEntries(MACROS.map((m) => [m, pctError(estimate[m], food[m])]));
      results.push({ name: food.name, quantity, actual: food, estimate, errors });
      console.log("ok");
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      results.push({ name: food.name, quantity, actual: food, estimate: null, errors: null, failed: true });
    }
    // small delay — polite to Anthropic's API, this isn't a latency benchmark
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log();

  console.log("== Step 3: report ==");
  const ok = results.filter((r) => !r.failed);
  console.log(`${ok.length}/${results.length} estimates succeeded.\n`);

  console.log("Per-item:");
  for (const r of results) {
    if (r.failed) {
      console.log(`  ${r.name} (${r.quantity}): FAILED`);
      continue;
    }
    const parts = MACROS.map((m) => {
      const e = r.errors[m];
      const label = e === null ? "n/a (actual=0)" : `${e.toFixed(0)}%`;
      return `${m}=${label} (actual ${r.actual[m]}, est ${r.estimate[m]})`;
    });
    console.log(`  ${r.name} (${r.quantity}): ${parts.join(", ")}`);
  }
  console.log();

  console.log("Summary per macro (over items where actual != 0):");
  for (const m of MACROS) {
    const errs = ok.map((r) => r.errors[m]).filter((e) => e !== null).sort((a, b) => a - b);
    if (errs.length === 0) {
      console.log(`  ${m}: no comparable data`);
      continue;
    }
    const avg = errs.reduce((s, e) => s + e, 0) / errs.length;
    console.log(
      `  ${m}: avg=${avg.toFixed(1)}% median=${percentile(errs, 50).toFixed(1)}% p90=${percentile(errs, 90).toFixed(1)}% (n=${errs.length})`,
    );
  }
  console.log();

  console.log("Worst 3 items by max macro error:");
  const ranked = ok
    .filter((r) => Object.values(r.errors).some((e) => e !== null))
    .map((r) => ({ ...r, worst: Math.max(...Object.values(r.errors).map((e) => e ?? 0)) }))
    .sort((a, b) => b.worst - a.worst)
    .slice(0, 3);
  for (const r of ranked) {
    console.log(`  ${r.name}: worst macro error ${r.worst.toFixed(0)}%`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
