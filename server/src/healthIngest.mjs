// FR-HLTH-3: resolves the Shortcut's opaque per-user token and writes the day's
// workout/HR/active-energy data in one Supabase RPC call — same token-resolution
// pattern as healthToken.mjs (D-020), see the migration for why it's one step.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export async function ingestHealthDataForToken(token, { date, workouts, restingHeartRate, activeEnergyKcal }) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ingest_health_data_for_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      p_token: token,
      p_date: date,
      p_workouts: workouts ?? [],
      p_resting_heart_rate: restingHeartRate ?? null,
      p_active_energy_kcal: activeEnergyKcal ?? null,
    }),
  });
  if (!res.ok) return null;

  const data = await res.json();
  return data ?? null;
}
