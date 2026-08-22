import { addDays, MEALS, type Meal } from "./diary";
import { supabase } from "./supabase";

const STREAK_MILESTONES = [30, 14, 7]; // checked highest-first, see determineUnclaimedMilestone

// Consecutive days ending at `date` with at least one entry — `loggedDates` is the set of
// dates (YYYY-MM-DD) known to have at least one diary entry, going back far enough to
// cover the longest milestone (30 days) plus slack.
export function computeStreakLength(loggedDates: Set<string>, date: string): number {
  let streak = 0;
  let [y, m, d] = date.split("-").map(Number);
  while (loggedDates.has(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`)) {
    streak++;
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - 1);
    y = dt.getUTCFullYear();
    m = dt.getUTCMonth() + 1;
    d = dt.getUTCDate();
  }
  return streak;
}

// The highest milestone reached that this user has never been awarded before — not "does
// the streak equal exactly 7/14/30 today", which would silently skip a milestone if the
// app wasn't opened on the exact day it was crossed (FR-FRIEND-3 AC 7).
export function determineUnclaimedMilestone(streakLength: number, alreadyClaimed: Set<number>): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (streakLength >= milestone && !alreadyClaimed.has(milestone)) return milestone;
  }
  return null;
}

export function allMealsLogged(entries: { meal: Meal }[]): boolean {
  const loggedMeals = new Set(entries.map((e) => e.meal));
  return MEALS.every((meal) => loggedMeals.has(meal));
}

interface DailyEventInput {
  userId: string;
  date: string;
  entries: { meal: Meal; protein_g: number }[];
  proteinTarget: number | null;
}

// Called after Diary loads today's entries — checks all 3 client-fireable event types and
// inserts whichever just became true, relying on the DB's partial unique indexes (not a
// pre-check query) to make duplicate inserts a no-op rather than a race condition.
export async function checkAndRecordDailyEvents({ userId, date, entries, proteinTarget }: DailyEventInput): Promise<void> {
  // One insert call per event, not batched — a duplicate on one (e.g. re-visiting Diary
  // the same day, hitting the partial unique index) would otherwise fail the whole
  // statement and silently block a genuinely new event alongside it. The unique-violation
  // error on a repeat is expected here, not a bug — nothing to surface to the user.

  if (allMealsLogged(entries)) {
    await supabase.from("activity_events").insert({ user_id: userId, event_type: "all_meals_logged", occurred_on: date });
  }

  if (proteinTarget != null) {
    const proteinTotal = entries.reduce((sum, e) => sum + e.protein_g, 0);
    if (proteinTotal >= proteinTarget) {
      await supabase.from("activity_events").insert({ user_id: userId, event_type: "protein_goal_hit", occurred_on: date });
    }
  }

  const { data: loggedRows } = await supabase
    .from("diary_entries")
    .select("entry_date")
    .eq("user_id", userId)
    .gte("entry_date", addDays(date, -40))
    .lte("entry_date", date);
  const loggedDates = new Set(((loggedRows as { entry_date: string }[]) ?? []).map((r) => r.entry_date));
  const streak = computeStreakLength(loggedDates, date);

  if (streak >= 7) {
    const { data: claimedRows } = await supabase
      .from("activity_events")
      .select("milestone_days")
      .eq("user_id", userId)
      .eq("event_type", "streak_milestone");
    const claimed = new Set(((claimedRows as { milestone_days: number }[]) ?? []).map((r) => r.milestone_days));
    const milestone = determineUnclaimedMilestone(streak, claimed);
    if (milestone != null) {
      await supabase.from("activity_events").insert({ user_id: userId, event_type: "streak_milestone", occurred_on: date, milestone_days: milestone });
    }
  }
}

