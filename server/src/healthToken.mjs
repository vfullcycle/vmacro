// Resolves the Apple Shortcut's opaque per-user API token (D-020) to that day's
// diary totals via one Supabase RPC call. The token is the only credential —
// get_daily_totals_for_token() looks up the owning user_id itself and returns
// null for an invalid/revoked token, so there's no separate step here that
// could be called with an arbitrary user_id.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export async function getDailyTotalsForToken(token, date) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_daily_totals_for_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ p_token: token, p_date: date }),
  });
  if (!res.ok) return null;

  const data = await res.json();
  return data ?? null;
}
