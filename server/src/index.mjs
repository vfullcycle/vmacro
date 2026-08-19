import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getNutritionEstimate, translateBatch } from "./anthropic.mjs";
import { getAuthedUser } from "./auth.mjs";
import { getFood, searchFoods } from "./fatsecret.mjs";
import { getDailyTotalsForToken } from "./healthToken.mjs";
import { checkRateLimit } from "./rateLimit.mjs";

const PORT = process.env.PORT || 3000;
const HOST = "127.0.0.1";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://vfullcycle.github.io";
// Raised from 64KB (2026-08-19, FR-FOOD-7/D-023) — /ai-import can carry a base64 food
// photo, which blows past 64KB even after client-side resize. Other routes' bodies are
// tiny (a JSON array of strings at most), so this is effectively only a ceiling change
// for the one route that needs it.
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const TRANSLATE_RATE_LIMIT = { max: 20, windowMs: 60_000 };
const HEALTH_SUMMARY_RATE_LIMIT = { max: 30, windowMs: 60_000 };
// Lower than translate's 20/min — vision calls are slower/pricier, and this is a
// deliberate one-at-a-time "fill in this form" action, not a batch operation.
const AI_IMPORT_RATE_LIMIT = { max: 10, windowMs: 60_000 };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION_FILE = path.join(__dirname, "../deploy/version.json");

function withCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  withCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/version") {
    try {
      const raw = await readFile(VERSION_FILE, "utf8");
      sendJson(res, 200, JSON.parse(raw));
    } catch {
      sendJson(res, 200, { commit: "unknown", deployed_at: null });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/food/search") {
    const q = url.searchParams.get("q");
    if (!q) {
      sendJson(res, 400, { error: "missing query param: q" });
      return;
    }
    try {
      const data = await searchFoods(q);
      sendJson(res, 200, data);
    } catch (err) {
      console.error(err);
      sendJson(res, 502, { error: "upstream FatSecret request failed" });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/food/get") {
    const id = url.searchParams.get("id");
    if (!id) {
      sendJson(res, 400, { error: "missing query param: id" });
      return;
    }
    try {
      const data = await getFood(id);
      sendJson(res, 200, data);
    } catch (err) {
      console.error(err);
      sendJson(res, 502, { error: "upstream FatSecret request failed" });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/health/daily-summary") {
    // FR-HLTH-1: called by an unattended Apple Shortcut, so auth is a long-lived
    // per-user token (D-020) instead of a short-lived Supabase JWT — see
    // healthToken.mjs for why token verification and the totals query are one
    // Postgres RPC call rather than two separate steps.
    const authHeader = req.headers["authorization"];
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      sendJson(res, 401, { error: "unauthorized" });
      return;
    }
    if (!checkRateLimit(token, HEALTH_SUMMARY_RATE_LIMIT)) {
      sendJson(res, 429, { error: "rate limited" });
      return;
    }

    const date = url.searchParams.get("date");
    if (!date || !DATE_RE.test(date)) {
      sendJson(res, 400, { error: "missing or invalid query param: date (expected YYYY-MM-DD)" });
      return;
    }

    try {
      const totals = await getDailyTotalsForToken(token, date);
      if (!totals) {
        sendJson(res, 401, { error: "unauthorized" });
        return;
      }
      sendJson(res, 200, totals);
    } catch (err) {
      console.error(err);
      sendJson(res, 502, { error: "daily summary request failed" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/translate") {
    // D-015 amendment: /translate spends วี's own prepaid Anthropic credit, so it must
    // require a logged-in user (unlike /food/search + /food/get, which stay public per
    // D-012) and be rate-limited against an accidental loop or abuse.
    const user = await getAuthedUser(req);
    if (!user) {
      sendJson(res, 401, { error: "unauthorized" });
      return;
    }
    if (!checkRateLimit(user.id, TRANSLATE_RATE_LIMIT)) {
      sendJson(res, 429, { error: "rate limited" });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
      return;
    }

    const { texts, targetLang } = body;
    if (!Array.isArray(texts) || texts.length === 0 || texts.some((t) => typeof t !== "string")) {
      sendJson(res, 400, { error: "texts must be a non-empty array of strings" });
      return;
    }
    if (texts.length > 50) {
      sendJson(res, 400, { error: "too many texts (max 50 per request)" });
      return;
    }
    if (targetLang !== "th" && targetLang !== "en") {
      sendJson(res, 400, { error: "targetLang must be 'th' or 'en'" });
      return;
    }

    try {
      const translations = await translateBatch(texts, targetLang);
      sendJson(res, 200, { translations });
    } catch (err) {
      console.error(err);
      sendJson(res, 502, { error: "translation request failed" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/ai-import") {
    // FR-FOOD-7 / D-023: same cost-ownership + auth rules as /translate — spends วี's
    // Anthropic credit, so it requires a logged-in user and a (tighter) rate limit.
    const user = await getAuthedUser(req);
    if (!user) {
      sendJson(res, 401, { error: "unauthorized" });
      return;
    }
    if (!checkRateLimit(user.id, AI_IMPORT_RATE_LIMIT)) {
      sendJson(res, 429, { error: "rate limited" });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
      return;
    }

    const { name, quantity, photoBase64, photoMediaType } = body;
    if (typeof name !== "string" || !name.trim()) {
      sendJson(res, 400, { error: "name must be a non-empty string" });
      return;
    }
    if (typeof quantity !== "string" || !quantity.trim()) {
      sendJson(res, 400, { error: "quantity must be a non-empty string" });
      return;
    }
    if (photoBase64 != null && typeof photoBase64 !== "string") {
      sendJson(res, 400, { error: "photoBase64 must be a string" });
      return;
    }

    try {
      const estimate = await getNutritionEstimate(name, quantity, photoBase64 || null, photoMediaType);
      sendJson(res, 200, estimate);
    } catch (err) {
      console.error(err);
      sendJson(res, 502, { error: "AI import request failed" });
    }
    return;
  }

  sendJson(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`vmacro proxy listening on http://${HOST}:${PORT}`);
});
