const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const SEARCH_URL = "https://platform.fatsecret.com/rest/foods/search/v1";
const FOOD_GET_URL = "https://platform.fatsecret.com/rest/food/v4";

let cachedToken = null;
let cachedExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
  const scope = process.env.FATSECRET_SCOPE || "premier";

  if (!clientId || !clientSecret) {
    throw new Error("FATSECRET_CLIENT_ID / FATSECRET_CLIENT_SECRET not set");
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`,
  });

  if (!res.ok) {
    throw new Error(`FatSecret token request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // refresh 60s before actual expiry as a safety margin
  cachedExpiresAt = now + (data.expires_in - 60) * 1000;
  return cachedToken;
}

// Every result has to be AI-translated to Thai before the search page shows anything
// (DF7), so more results means more translation calls on cache miss. Raised 10 -> 50
// (2026-08-19, วีrequest) after friend feedback that FatSecret coverage felt thin —
// re-evaluate against BL-11 latency numbers once they're in.
const DEFAULT_MAX_RESULTS = 50;

export async function searchFoods(searchExpression, maxResults = DEFAULT_MAX_RESULTS) {
  const token = await getAccessToken();
  const url = new URL(SEARCH_URL);
  url.searchParams.set("search_expression", searchExpression);
  url.searchParams.set("max_results", String(maxResults));
  url.searchParams.set("format", "json");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`FatSecret search failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export async function getFood(foodId) {
  const token = await getAccessToken();
  const url = new URL(FOOD_GET_URL);
  url.searchParams.set("food_id", foodId);
  url.searchParams.set("format", "json");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`FatSecret food.get failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
