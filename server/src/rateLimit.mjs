// Fixed-window rate limiter, in memory — fine at this app's scale (≤5 users, single
// process, no clustering). Resets on process restart; that's acceptable here since the
// goal is only to catch an accidental runaway loop, not enforce a hard billing cap.
const windows = new Map();

export function checkRateLimit(key, { max, windowMs }) {
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    windows.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
