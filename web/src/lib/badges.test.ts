import { describe, expect, it } from "vitest";
import { BADGE_CATALOG, determineNewlyUnlocked, selectCardBadges, type BadgeDisplayState } from "./badges";

function makeState(overrides: Partial<BadgeDisplayState> & Pick<BadgeDisplayState, "key">): BadgeDisplayState {
  const def = BADGE_CATALOG.find((b) => b.key === overrides.key)!;
  return { ...def, unlocked: false, unlockedAt: null, current: 0, ...overrides };
}

describe("determineNewlyUnlocked", () => {
  it("returns badges whose counter has reached threshold and aren't unlocked yet", () => {
    const counters = { diary_days_total: 7, custom_foods_created_total: 0 };
    const newly = determineNewlyUnlocked(counters, new Set());
    expect(newly).toContain("first_day");
    expect(newly).toContain("week_complete");
    expect(newly).not.toContain("month_complete");
    expect(newly).not.toContain("foods_first");
  });

  it("skips badges already in alreadyUnlocked even if the counter still qualifies", () => {
    const counters = { diary_days_total: 7 };
    const newly = determineNewlyUnlocked(counters, new Set(["first_day", "week_complete"]));
    expect(newly).not.toContain("first_day");
    expect(newly).not.toContain("week_complete");
  });

  it("unlocks multiple tiers at once if the counter jumped past several thresholds", () => {
    const counters = { custom_foods_created_total: 50 };
    const newly = determineNewlyUnlocked(counters, new Set());
    expect(newly).toEqual(expect.arrayContaining(["foods_first", "foods_10", "foods_50"]));
  });

  it("treats a missing counter as 0 — no badge unlocks", () => {
    const newly = determineNewlyUnlocked({}, new Set());
    expect(newly).toEqual([]);
  });

  it("supports counters not backed by a stored badge_progress row (e.g. tenure_days)", () => {
    const newly = determineNewlyUnlocked({ tenure_days: 30 }, new Set());
    expect(newly).toContain("tenure_30");
    expect(newly).not.toContain("tenure_100");
  });
});

describe("selectCardBadges", () => {
  it("mixes recently unlocked and close-to-unlocking, not a plain unlocked-first sort", () => {
    const badges = [
      makeState({ key: "first_day", unlocked: true, unlockedAt: "2026-08-01T00:00:00Z" }),
      makeState({ key: "week_complete", unlocked: true, unlockedAt: "2026-08-20T00:00:00Z" }),
      makeState({ key: "foods_10", current: 9 }), // 90% of the way there
      makeState({ key: "dishes_10", current: 1 }), // barely started
    ];
    const selected = selectCardBadges(badges);
    expect(selected.map((b) => b.key)).toContain("week_complete"); // most recent unlock first
    expect(selected.map((b) => b.key)).toContain("foods_10"); // closest to unlocking
  });

  it("never shows the same badge twice even if it would qualify for both lists", () => {
    const badges = [makeState({ key: "first_day", unlocked: true, unlockedAt: "2026-08-01T00:00:00Z" })];
    const selected = selectCardBadges(badges);
    expect(selected.filter((b) => b.key === "first_day")).toHaveLength(1);
  });
});
