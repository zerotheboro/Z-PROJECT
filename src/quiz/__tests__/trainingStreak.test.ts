import {
  describe,
  expect,
  it
} from "vitest";

import {
  calculateNextStreak,
  daysBetweenDayKeys,
  EMPTY_TRAINING_STREAK,
  getEffectiveCurrentStreak,
  getLocalDayKey
} from "../trainingStreak";

describe("daily Training streak calculations", () => {
  it("creates streak one on the first completion", () => {
    expect(calculateNextStreak(
      EMPTY_TRAINING_STREAK,
      "2026-10-06"
    )).toEqual({
      isNewDay: true,
      stats: {
        currentStreak: 1,
        longestStreak: 1,
        lastCompletedDay: "2026-10-06",
        totalActiveDays: 1
      }
    });
  });

  it("does not increment for another assignment on the same day", () => {
    const previous = {
      currentStreak: 4,
      longestStreak: 7,
      lastCompletedDay: "2026-10-06",
      totalActiveDays: 11
    };

    expect(calculateNextStreak(
      previous,
      "2026-10-06"
    )).toEqual({
      isNewDay: false,
      stats: previous
    });
  });

  it("increments current, longest, and total on a consecutive day", () => {
    expect(calculateNextStreak({
      currentStreak: 4,
      longestStreak: 4,
      lastCompletedDay: "2026-10-05",
      totalActiveDays: 8
    }, "2026-10-06").stats).toEqual({
      currentStreak: 5,
      longestStreak: 5,
      lastCompletedDay: "2026-10-06",
      totalActiveDays: 9
    });
  });

  it("resets current streak after a skipped day without reducing longest", () => {
    expect(calculateNextStreak({
      currentStreak: 4,
      longestStreak: 9,
      lastCompletedDay: "2026-10-04",
      totalActiveDays: 12
    }, "2026-10-06").stats).toEqual({
      currentStreak: 1,
      longestStreak: 9,
      lastCompletedDay: "2026-10-06",
      totalActiveDays: 13
    });
  });

  it("derives a broken streak as zero without mutating stored data", () => {
    const stored = {
      currentStreak: 8,
      longestStreak: 12,
      lastCompletedDay: "2026-10-01",
      totalActiveDays: 24
    };

    expect(getEffectiveCurrentStreak(
      stored,
      "2026-10-06"
    )).toBe(0);
    expect(stored.currentStreak).toBe(8);
  });

  it("keeps yesterday's streak effective through today", () => {
    expect(getEffectiveCurrentStreak({
      currentStreak: 8,
      longestStreak: 12,
      lastCompletedDay: "2026-10-05",
      totalActiveDays: 24
    }, "2026-10-06")).toBe(8);
  });

  it.each([
    ["2026-01-31", "2026-02-01"],
    ["2026-12-31", "2027-01-01"]
  ])("treats calendar boundary %s to %s as consecutive", (from, to) => {
    expect(daysBetweenDayKeys(from, to)).toBe(1);
    expect(calculateNextStreak({
      currentStreak: 2,
      longestStreak: 5,
      lastCompletedDay: from,
      totalActiveDays: 7
    }, to).stats.currentStreak).toBe(3);
  });

  it("derives the day in the supplied IANA timezone", () => {
    const instant = new Date("2026-10-05T18:30:00.000Z");

    expect(getLocalDayKey(
      instant,
      "Asia/Ho_Chi_Minh"
    )).toBe("2026-10-06");
    expect(getLocalDayKey(
      instant,
      "America/Los_Angeles"
    )).toBe("2026-10-05");
  });
});
