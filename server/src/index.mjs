import { createServer } from "node:http";
import { searchFoods } from "./fatsecret.mjs";

const PORT = process.env.PORT || 3000;
const HOST = "127.0.0.1";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://vfullcycle.github.io";

function withCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
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

  sendJson(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`vmacro proxy listening on http://${HOST}:${PORT}`);
});
