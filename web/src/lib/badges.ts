import { computeStreakLength } from "./activityEvents";
import { addDays, todayLocalDate } from "./diary";
import { supabase } from "./supabase";

export type BadgeGroup = "consistency" | "creator" | "nutrition" | "journey";

export interface BadgeDef {
  key: string;
  group: BadgeGroup;
  title: string;
  // Shown on the locked badge — must state the condition plainly, never a riddle (FR-BADGE-1 AC 7).
  description: string;
  counterKey: string;
  threshold: number;
}

// badge_key is append-only forever (CLAUDE.md §Append-only identifiers) — add new entries,
// never rename/remove one that has shipped; user_badges rows reference these by text.
export const BADGE_CATALOG: BadgeDef[] = [
  { key: "first_day", group: "consistency", title: "ก้าวแรก", description: "บันทึกอาหารวันแรก", counterKey: "diary_days_total", threshold: 1 },
  { key: "week_complete", group: "consistency", title: "สัปดาห์ครบถ้วน", description: "บันทึกอาหารสะสมครบ 7 วัน", counterKey: "diary_days_total", threshold: 7 },
  { key: "month_complete", group: "consistency", title: "เดือนครบถ้วน", description: "บันทึกอาหารสะสมครบ 30 วัน", counterKey: "diary_days_total", threshold: 30 },
  { key: "streak_7", group: "consistency", title: "ไม่ขาดสาย 7 วัน", description: "บันทึกต่อเนื่อง 7 วันติดกัน", counterKey: "diary_streak_current", threshold: 7 },
  { key: "streak_30", group: "consistency", title: "ไม่ขาดสาย 30 วัน", description: "บันทึกต่อเนื่อง 30 วันติดกัน", counterKey: "diary_streak_current", threshold: 30 },
  { key: "streak_100", group: "consistency", title: "ไม่ขาดสาย 100 วัน", description: "บันทึกต่อเนื่อง 100 วันติดกัน", counterKey: "diary_streak_current", threshold: 100 },
  { key: "foods_first", group: "creator", title: "เชฟฝึกหัด", description: "สร้างอาหารสำเร็จรายการแรก", counterKey: "custom_foods_created_total", threshold: 1 },
  { key: "foods_10", group: "creator", title: "นักสะสมสูตร (10)", description: "สร้างอาหารครบ 10 รายการ", counterKey: "custom_foods_created_total", threshold: 10 },
  { key: "foods_50", group: "creator", title: "นักสะสมสูตร (50)", description: "สร้างอาหารครบ 50 รายการ", counterKey: "custom_foods_created_total", threshold: 50 },
  { key: "creator_certified", group: "creator", title: "ตรารับรอง", description: "มีอาหารที่สร้างได้รับการยืนยันจาก admin", counterKey: "custom_foods_verified_own_total", threshold: 1 },
  { key: "foods_used_10", group: "creator", title: "ของดีบอกต่อ (10)", description: "อาหารของคุณถูกใช้ 10 ครั้ง", counterKey: "food_used_by_others_total", threshold: 10 },
  { key: "foods_used_100", group: "creator", title: "ของดีบอกต่อ (100)", description: "อาหารของคุณถูกใช้ 100 ครั้ง", counterKey: "food_used_by_others_total", threshold: 100 },
  { key: "dishes_1", group: "creator", title: "นักปรุง", description: "สร้างจานสำเร็จรายการแรก", counterKey: "dishes_created_total", threshold: 1 },
  { key: "dishes_10", group: "creator", title: "นักปรุง (10)", description: "สร้างจานครบ 10 รายการ", counterKey: "dishes_created_total", threshold: 10 },
  { key: "protein_goal_7", group: "nutrition", title: "โปรตีนครบสะสม 7 วัน", description: "ถึงเป้าโปรตีนสะสมครบ 7 วัน", counterKey: "protein_goal_hit_total", threshold: 7 },
  { key: "protein_goal_30", group: "nutrition", title: "โปรตีนครบสะสม 30 วัน", description: "ถึงเป้าโปรตีนสะสมครบ 30 วัน", counterKey: "protein_goal_hit_total", threshold: 30 },
  { key: "tenure_30", group: "journey", title: "หนึ่งเดือน", description: "ใช้แอปครบ 30 วัน", counterKey: "tenure_days", threshold: 30 },
  { key: "tenure_100", group: "journey", title: "ร้อยวัน", description: "ใช้แอปครบ 100 วัน", counterKey: "tenure_days", threshold: 100 },
  { key: "tenure_365", group: "journey", title: "หนึ่งปี", description: "ใช้แอปครบ 365 วัน", counterKey: "tenure_days", threshold: 365 },
  { key: "weight_logs_10", group: "journey", title: "ขาประจำตาชั่ง (10)", description: "บันทึกน้ำหนักครบ 10 ครั้ง", counterKey: "weight_logs_total", threshold: 10 },
  { key: "weight_logs_50", group: "journey", title: "ขาประจำตาชั่ง (50)", description: "บันทึกน้ำหนักครบ 50 ครั้ง", counterKey: "weight_logs_total", threshold: 50 },
];

export function determineNewlyUnlocked(counters: Record<string, number>, alreadyUnlocked: Set<string>): string[] {
  return BADGE_CATALOG.filter((b) => !alreadyUnlocked.has(b.key) && (counters[b.counterKey] ?? 0) >= b.threshold).map((b) => b.key);
}

async function fetchCounters(userId: string): Promise<Record<string, number>> {
  const { data } = await supabase.from("badge_progress").select("counter_key, current_value").eq("user_id", userId);
  const counters: Record<string, number> = {};
  for (const row of (data as { counter_key: string; current_value: number }[]) ?? []) counters[row.counter_key] = row.current_value;
  return counters;
}

async function fetchUnlocked(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from("user_badges").select("badge_key").eq("user_id", userId);
  return new Set(((data as { badge_key: string }[]) ?? []).map((r) => r.badge_key));
}

async function upsertCounter(userId: string, counterKey: string, value: number): Promise<void> {
  await supabase
    .from("badge_progress")
    .upsert({ user_id: userId, counter_key: counterKey, current_value: value, updated_at: new Date().toISOString() }, { onConflict: "user_id,counter_key" });
}

async function unlockBadges(userId: string, badgeKeys: string[]): Promise<void> {
  // One insert per badge, not batched — a duplicate on one (concurrent trigger firing twice)
  // would otherwise fail the whole statement and block a genuinely new unlock alongside it,
  // same lesson as FR-FRIEND-3's activity_events inserts.
  for (const badgeKey of badgeKeys) {
    await supabase.from("user_badges").insert({ user_id: userId, badge_key: badgeKey });
    await supabase.from("activity_events").insert({ user_id: userId, event_type: "badge_unlocked", occurred_on: todayLocalDate(), badge_key: badgeKey });
  }
}

// Shared by every trigger context: read current state (real counters + any ad-hoc ones like
// tenure_days that are never persisted), diff against what's already unlocked, write new ones.
async function runUnlockCheck(userId: string, extraCounters?: Record<string, number>): Promise<void> {
  const [counters, unlocked] = await Promise.all([fetchCounters(userId), fetchUnlocked(userId)]);
  const merged = { ...counters, ...extraCounters };
  const newlyUnlocked = determineNewlyUnlocked(merged, unlocked);
  if (newlyUnlocked.length > 0) await unlockBadges(userId, newlyUnlocked);
}

interface DiaryEntryForBadges {
  entry_date: string;
}

// Bounded lookback wide enough for the longest threshold this module checks live
// (streak_100 / month_complete) — a user whose streak predates this window undercounts
// slightly, self-heals via the recompute script's unbounded query.
const DIARY_LOOKBACK_DAYS = 120;

async function recomputeDiaryCounters(userId: string, date: string): Promise<void> {
  const { data } = await supabase
    .from("diary_entries")
    .select("entry_date")
    .eq("user_id", userId)
    .gte("entry_date", addDays(date, -DIARY_LOOKBACK_DAYS))
    .lte("entry_date", date);
  const loggedDates = new Set(((data as DiaryEntryForBadges[]) ?? []).map((r) => r.entry_date));
  await upsertCounter(userId, "diary_days_total", loggedDates.size);
  await upsertCounter(userId, "diary_streak_current", computeStreakLength(loggedDates, date));

  const { count } = await supabase
    .from("activity_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "protein_goal_hit");
  await upsertCounter(userId, "protein_goal_hit_total", count ?? 0);
}

// Call alongside checkAndRecordDailyEvents in Diary.tsx, same "today only" guard.
export async function checkBadgesAfterDiarySave(userId: string, date: string): Promise<void> {
  await recomputeDiaryCounters(userId, date);
  await runUnlockCheck(userId);
}

async function countOwnRows(table: string, column: string, userId: string): Promise<number> {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq(column, userId);
  return count ?? 0;
}

export async function checkBadgesAfterFoodCreate(userId: string): Promise<void> {
  await upsertCounter(userId, "custom_foods_created_total", await countOwnRows("custom_foods", "creator_id", userId));
  await runUnlockCheck(userId);
}

export async function checkBadgesAfterDishCreate(userId: string): Promise<void> {
  await upsertCounter(userId, "dishes_created_total", await countOwnRows("dishes", "creator_id", userId));
  await runUnlockCheck(userId);
}

export async function checkBadgesAfterWeightLog(userId: string): Promise<void> {
  await upsertCounter(userId, "weight_logs_total", await countOwnRows("weight_logs", "user_id", userId));
  await runUnlockCheck(userId);
}

// Safety net for every trigger point at once, plus the two counters that can only be
// checked here: food_used_by_others_total (cross-user, needs the SECURITY DEFINER RPC —
// see count_food_usage_by_others() migration comment) and tenure (never persisted as its
// own counter, computed fresh from profiles.created_at every time).
export async function checkBadgesOnDashboardOpen(userId: string, profileCreatedAt: string): Promise<void> {
  const date = todayLocalDate();
  await recomputeDiaryCounters(userId, date);
  await upsertCounter(userId, "custom_foods_created_total", await countOwnRows("custom_foods", "creator_id", userId));
  await upsertCounter(userId, "dishes_created_total", await countOwnRows("dishes", "creator_id", userId));
  await upsertCounter(userId, "weight_logs_total", await countOwnRows("weight_logs", "user_id", userId));

  const { data: usageCount } = await supabase.rpc("count_food_usage_by_others");
  await upsertCounter(userId, "food_used_by_others_total", (usageCount as number) ?? 0);

  await runUnlockCheck(userId, { tenure_days: computeTenureDays(profileCreatedAt) });
}

export function computeTenureDays(profileCreatedAt: string): number {
  return Math.floor((Date.now() - new Date(profileCreatedAt).getTime()) / 86_400_000);
}

export interface BadgeDisplayState extends BadgeDef {
  unlocked: boolean;
  unlockedAt: string | null;
  current: number;
}

// Read-only projection for the Dashboard card + full list page — no writes, cheap (two
// small owner-scoped selects), safe to call on every render. tenureDays comes from the
// caller (computed from profiles.created_at, already fetched for other Dashboard needs) —
// it's never persisted as its own counter, see checkBadgesOnDashboardOpen.
export async function fetchBadgeDisplayState(userId: string, tenureDays: number): Promise<BadgeDisplayState[]> {
  const [counters, unlockedRows] = await Promise.all([
    fetchCounters(userId),
    supabase.from("user_badges").select("badge_key, unlocked_at").eq("user_id", userId),
  ]);
  const merged: Record<string, number> = { ...counters, tenure_days: tenureDays };
  const unlockedMap = new Map(((unlockedRows.data as { badge_key: string; unlocked_at: string }[]) ?? []).map((r) => [r.badge_key, r.unlocked_at]));
  return BADGE_CATALOG.map((b) => ({
    ...b,
    unlocked: unlockedMap.has(b.key),
    unlockedAt: unlockedMap.get(b.key) ?? null,
    current: Math.min(merged[b.counterKey] ?? 0, b.threshold),
  }));
}

const CARD_MAX_RECENT = 4;
const CARD_MAX_CLOSE = 4;

// Dashboard card shows a mix of "just unlocked" and "close to unlocking" — not a plain
// unlocked-first sort, which would show nothing interesting to a brand-new account and
// nothing motivating to someone who unlocked everything reachable already (FR-BADGE-1 UI).
export function selectCardBadges(badges: BadgeDisplayState[]): BadgeDisplayState[] {
  const recent = badges
    .filter((b) => b.unlocked)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
    .slice(0, CARD_MAX_RECENT);
  const recentKeys = new Set(recent.map((b) => b.key));
  const close = badges
    .filter((b) => !b.unlocked)
    .sort((a, b) => b.current / b.threshold - a.current / a.threshold)
    .slice(0, CARD_MAX_CLOSE);
  return [...recent, ...close.filter((b) => !recentKeys.has(b.key))];
}
