import { createServer } from "node:http";
import { translateBatch } from "./anthropic.mjs";
import { getFood, searchFoods } from "./fatsecret.mjs";

const PORT = process.env.PORT || 3000;
const HOST = "127.0.0.1";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://vfullcycle.github.io";
const MAX_BODY_BYTES = 64 * 1024;

function withCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

  if (req.method === "POST" && url.pathname === "/translate") {
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

  sendJson(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`vmacro proxy listening on http://${HOST}:${PORT}`);
});
