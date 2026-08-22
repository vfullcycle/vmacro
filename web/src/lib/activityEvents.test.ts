import { describe, expect, it } from "vitest";
import { allMealsLogged, computeStreakLength, determineUnclaimedMilestone } from "./activityEvents";

describe("computeStreakLength", () => {
  it("counts consecutive days ending at the given date", () => {
    const logged = new Set(["2026-08-20", "2026-08-21", "2026-08-22"]);
    expect(computeStreakLength(logged, "2026-08-22")).toBe(3);
  });

  it("stops at the first gap", () => {
    const logged = new Set(["2026-08-18", "2026-08-21", "2026-08-22"]);
    expect(computeStreakLength(logged, "2026-08-22")).toBe(2);
  });

  it("returns 0 when today itself has no entry", () => {
    const logged = new Set(["2026-08-21"]);
    expect(computeStreakLength(logged, "2026-08-22")).toBe(0);
  });

  it("handles a streak crossing a month boundary", () => {
    const logged = new Set(["2026-07-30", "2026-07-31", "2026-08-01"]);
    expect(computeStreakLength(logged, "2026-08-01")).toBe(3);
  });
});

describe("determineUnclaimedMilestone", () => {
  it("awards the highest milestone reached that hasn't been claimed", () => {
    // streak jumped to 9 without ever opening the app on day 7 — should still get 7, not
    // nothing (FR-FRIEND-3 AC 7)
    expect(determineUnclaimedMilestone(9, new Set())).toBe(7);
  });

  it("skips already-claimed milestones and awards the next one up", () => {
    expect(determineUnclaimedMilestone(20, new Set([7]))).toBe(14);
  });

  it("returns null when every reachable milestone is already claimed", () => {
    expect(determineUnclaimedMilestone(10, new Set([7]))).toBeNull();
  });

  it("returns null when the streak hasn't reached the lowest milestone yet", () => {
    expect(determineUnclaimedMilestone(5, new Set())).toBeNull();
  });

  it("awards 30 directly when the streak reached it before anything was claimed", () => {
    expect(determineUnclaimedMilestone(35, new Set())).toBe(30);
  });
});

describe("allMealsLogged", () => {
  it("is true only when all 4 meals have at least one entry", () => {
    const entries = [{ meal: "breakfast" as const }, { meal: "lunch" as const }, { meal: "dinner" as const }, { meal: "snack" as const }];
    expect(allMealsLogged(entries)).toBe(true);
  });

  it("is false when a meal is missing", () => {
    const entries = [{ meal: "breakfast" as const }, { meal: "lunch" as const }, { meal: "dinner" as const }];
    expect(allMealsLogged(entries)).toBe(false);
  });

  it("counts a meal with multiple entries as covered once", () => {
    const entries = [
      { meal: "breakfast" as const },
      { meal: "breakfast" as const },
      { meal: "lunch" as const },
      { meal: "dinner" as const },
      { meal: "snack" as const },
    ];
    expect(allMealsLogged(entries)).toBe(true);
  });
});
